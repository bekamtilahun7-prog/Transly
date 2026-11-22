// POST /api/issue/reserve  { documentId, issuerName, issuerPhone?, reviewStatus, isPublic } -> { verificationId }
// Reserves a verification id so the client can print it (QR code) into the PDF
// before uploading it with /api/issue/complete. A reserved id verifies as
// not_found until it is completed.
//
// Allowed: the document owner (translated, in review or reviewed documents),
// or a translator while the document is in review / reviewed.

import { randomBytes } from 'node:crypto';
import type { IssueReserveResponse, ReviewStatus } from '../../../shared/contract';
import { ApiFailure, internal, jsonBody, route, uuidField } from '../_lib/http';
import { admin, getDocument, isTranslator, requireUser } from '../_lib/supabase';

export default route('POST', async (req): Promise<IssueReserveResponse> => {
  const user = await requireUser(req);
  const body = jsonBody(req);
  const documentId = uuidField(body, 'documentId');

  const issuerName = typeof body.issuerName === 'string' ? body.issuerName.trim() : '';
  if (!issuerName || issuerName.length > 120) {
    throw new ApiFailure('BAD_REQUEST', 'issuerName is required (up to 120 characters).');
  }
  let issuerPhone: string | null = null;
  if (body.issuerPhone !== undefined && body.issuerPhone !== null && body.issuerPhone !== '') {
    if (typeof body.issuerPhone !== 'string' || !/^[+0-9 ()-]{5,25}$/.test(body.issuerPhone.trim())) {
      throw new ApiFailure('BAD_REQUEST', 'issuerPhone must be a phone number.');
    }
    issuerPhone = body.issuerPhone.trim();
  }
  if (body.reviewStatus !== 'machine' && body.reviewStatus !== 'human_reviewed') {
    throw new ApiFailure('BAD_REQUEST', "reviewStatus must be 'machine' or 'human_reviewed'.");
  }
  if (typeof body.isPublic !== 'boolean') throw new ApiFailure('BAD_REQUEST', 'isPublic must be true or false.');

  const doc = await getDocument(documentId);
  const translator = await isTranslator(user.id);
  const isOwner = doc.owner_id === user.id;
  const inReviewQueue = doc.status === 'in_review' || doc.status === 'reviewed';
  if (!isOwner && !(translator && inReviewQueue)) {
    throw new ApiFailure('FORBIDDEN', 'You cannot issue this document.');
  }
  if (doc.status === 'issued') throw new ApiFailure('BAD_REQUEST', 'This document has already been issued.');
  if (!doc.blocks_translated?.length || (doc.status !== 'translated' && !inReviewQueue)) {
    throw new ApiFailure('BAD_REQUEST', 'Translate the document before issuing it.');
  }

  // Only a translator may claim a human review; anyone else is recorded as machine.
  const reviewStatus: ReviewStatus = body.reviewStatus === 'human_reviewed' && translator ? 'human_reviewed' : 'machine';
  const verificationId = randomBytes(16).toString('hex');

  const { error } = await admin().from('issued_documents').insert({
    verification_id: verificationId,
    document_id: doc.id,
    issuer_name: issuerName,
    issuer_phone: issuerPhone,
    review_status: reviewStatus,
    is_public: body.isPublic,
    status: 'reserved',
    issued_by: user.id,
  });
  if (error) throw internal('reserve verification id', error);

  return { verificationId };
});
