// POST /api/review/request  { documentId } -> { status: 'in_review' }
// The owner sends a translated document to the translators' queue.

import type { ReviewRequestResponse } from '../../../shared/contract';
import { ApiFailure, jsonBody, route, uuidField } from '../_lib/http';
import { getOwnDocument, requireUser, updateDocument } from '../_lib/supabase';

export default route('POST', async (req): Promise<ReviewRequestResponse> => {
  const user = await requireUser(req);
  const documentId = uuidField(jsonBody(req), 'documentId');

  const doc = await getOwnDocument(documentId, user.id);
  if (doc.status === 'in_review') return { status: 'in_review' }; // repeat call, nothing to do
  if (doc.status !== 'translated' || !doc.blocks_translated?.length) {
    throw new ApiFailure(
      'BAD_REQUEST',
      doc.status === 'reviewed' || doc.status === 'issued'
        ? `This document is already ${doc.status}.`
        : 'Translate the document before asking for a review.',
    );
  }

  await updateDocument(doc.id, { status: 'in_review' });
  return { status: 'in_review' };
});
