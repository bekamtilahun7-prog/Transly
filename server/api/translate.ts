// POST /api/translate  { documentId, sourceLanguage, targetLanguage, blocks } -> { blocks }
// Translates the (possibly customer-edited) original blocks. Saves both the
// sent originals and the translation on the document (status 'translated').
// Document owner only.

import type { TranslateResponse } from '../../shared/contract';
import { translate } from './_lib/ai';
import { clientBlocks } from './_lib/blocks';
import { ApiFailure, jsonBody, langField, route, uuidField } from './_lib/http';
import { getOwnDocument, requireUser, updateDocument } from './_lib/supabase';

export default route('POST', async (req): Promise<TranslateResponse> => {
  const user = await requireUser(req);
  const body = jsonBody(req);
  const documentId = uuidField(body, 'documentId');
  const from = langField(body, 'sourceLanguage');
  const to = langField(body, 'targetLanguage');
  if (from === to) throw new ApiFailure('BAD_REQUEST', 'sourceLanguage and targetLanguage must be different.');
  const blocks = clientBlocks(body.blocks);

  const doc = await getOwnDocument(documentId, user.id);
  if (doc.status === 'uploaded') {
    throw new ApiFailure('BAD_REQUEST', 'Extract the document text before translating it.');
  }
  if (doc.status !== 'extracted' && doc.status !== 'translated') {
    throw new ApiFailure('BAD_REQUEST', `This document is already ${doc.status.replace('_', ' ')} and cannot be translated again.`);
  }

  const translated = await translate(blocks, from, to);

  await updateDocument(doc.id, {
    blocks_original: blocks,
    blocks_translated: translated,
    source_lang: from,
    target_lang: to,
    status: 'translated',
  });

  return { blocks: translated };
});
