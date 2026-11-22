// POST /api/extract  { documentId, sourceLanguage? } -> { detectedLanguage, documentType, blocks }
// Reads the uploaded file from storage, asks the model for its text blocks and
// saves them on the document (status 'extracted'). Document owner only.

import type { ExtractResponse } from '../../shared/contract';
import { extractDocument } from './_lib/ai';
import { ApiFailure, isLang, jsonBody, langField, route, uuidField } from './_lib/http';
import { BUCKET, admin, getOwnDocument, requireUser, updateDocument } from './_lib/supabase';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export default route('POST', async (req): Promise<ExtractResponse> => {
  const user = await requireUser(req);
  const body = jsonBody(req);
  const documentId = uuidField(body, 'documentId');
  const hint = body.sourceLanguage === undefined || body.sourceLanguage === null
    ? undefined
    : langField(body, 'sourceLanguage');

  const doc = await getOwnDocument(documentId, user.id);
  if (doc.status === 'in_review' || doc.status === 'reviewed' || doc.status === 'issued') {
    throw new ApiFailure('BAD_REQUEST', `This document is already ${doc.status.replace('_', ' ')} and cannot be extracted again.`);
  }

  const extension = doc.storage_path.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) throw new ApiFailure('BAD_REQUEST', 'Only PDF, JPG and PNG files can be read.');

  const download = await admin().storage.from(BUCKET).download(doc.storage_path);
  if (download.error || !download.data) {
    console.error(`[storage] download: ${download.error?.message ?? 'no data'}`);
    throw new ApiFailure('NOT_FOUND', 'The uploaded file for this document was not found.');
  }
  const data = Buffer.from(await download.data.arrayBuffer());
  if (data.length === 0) throw new ApiFailure('BAD_REQUEST', 'The uploaded file is empty.');
  if (data.length > MAX_FILE_BYTES) {
    throw new ApiFailure('PAYLOAD_TOO_LARGE', 'The file is larger than 10 MB. Upload a smaller scan or photo.');
  }

  const extraction = await extractDocument({ mimeType, data }, hint ?? doc.source_lang);
  if (!isLang(extraction.detectedLanguage)) {
    throw new ApiFailure(
      'UNSUPPORTED_LANGUAGE',
      'This document is not in Afaan Oromo, Amharic or English, so it cannot be processed.',
    );
  }

  const values: Record<string, unknown> = {
    blocks_original: extraction.blocks,
    blocks_translated: null,
    doc_type: extraction.documentType,
    status: 'extracted',
  };
  // source_lang and target_lang must differ in the database; if the detected
  // language equals the chosen target, the row keeps its languages and the
  // client decides what to do with detectedLanguage.
  if (extraction.detectedLanguage !== doc.target_lang) values.source_lang = extraction.detectedLanguage;
  await updateDocument(doc.id, values);

  return {
    detectedLanguage: extraction.detectedLanguage,
    documentType: extraction.documentType,
    blocks: extraction.blocks,
  };
});
