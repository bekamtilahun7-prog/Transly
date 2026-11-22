// POST /api/issue/complete  { verificationId, pdfBase64 } -> { status: 'issued', sha256 }
// Stores the final PDF in the private bucket, records the SHA-256 of the exact
// bytes and marks the record and its document as issued. Only the account that
// reserved the id can complete it.

import { createHash } from 'node:crypto';
import type { IssueCompleteResponse } from '../../../shared/contract';
import { ApiFailure, internal, jsonBody, route, verificationIdField } from '../_lib/http';
import { BUCKET, admin, getIssued, requireUser, updateDocument } from '../_lib/supabase';

const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_PDF_BYTES / 3) * 4;
const TOO_LARGE = 'The PDF is larger than 3 MB. Lower the image quality or page count and try again.';

export default route('POST', async (req): Promise<IssueCompleteResponse> => {
  const user = await requireUser(req);
  const body = jsonBody(req);
  const verificationId = verificationIdField(body);

  if (typeof body.pdfBase64 !== 'string' || body.pdfBase64 === '') {
    throw new ApiFailure('BAD_REQUEST', 'pdfBase64 is required.');
  }
  // Accept a data URL prefix, then check size before decoding anything.
  const base64 = body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
  if (base64.length > MAX_BASE64_CHARS) throw new ApiFailure('PAYLOAD_TOO_LARGE', TOO_LARGE);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new ApiFailure('BAD_REQUEST', 'pdfBase64 is not valid base64.');
  }
  const pdf = Buffer.from(base64, 'base64');
  if (pdf.length > MAX_PDF_BYTES) throw new ApiFailure('PAYLOAD_TOO_LARGE', TOO_LARGE);
  if (pdf.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new ApiFailure('BAD_REQUEST', 'The uploaded file is not a PDF.');
  }

  const issued = await getIssued(verificationId);
  if (!issued) throw new ApiFailure('NOT_FOUND', 'Unknown verification id. Reserve one first.');
  if (issued.issued_by !== user.id) throw new ApiFailure('FORBIDDEN', 'This verification id was reserved by another account.');
  if (issued.status !== 'reserved') {
    throw new ApiFailure('BAD_REQUEST', `This verification id is already ${issued.status}.`);
  }

  const sha256 = createHash('sha256').update(pdf).digest('hex');
  const pdfPath = `issued/${verificationId}.pdf`;

  const upload = await admin().storage.from(BUCKET).upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true });
  if (upload.error) throw internal('store issued PDF', upload.error);

  // "status = reserved" in the filter makes a double submit lose cleanly.
  const { data, error } = await admin()
    .from('issued_documents')
    .update({ status: 'issued', pdf_path: pdfPath, sha256, issued_at: new Date().toISOString() })
    .eq('id', issued.id)
    .eq('status', 'reserved')
    .select('id');
  if (error) throw internal('mark issued', error);
  if (!data?.length) throw new ApiFailure('BAD_REQUEST', 'This verification id has already been completed.');

  await updateDocument(issued.document_id, { status: 'issued' });

  return { status: 'issued', sha256 };
});
