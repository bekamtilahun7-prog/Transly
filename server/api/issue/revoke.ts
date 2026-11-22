// POST /api/issue/revoke  { verificationId } -> { result: 'revoked' }
// Allowed: the document owner or the account that issued it. A reserved
// (never completed) id is treated as unknown.

import type { RevokeResponse } from '../../../shared/contract';
import { ApiFailure, internal, jsonBody, route, verificationIdField } from '../_lib/http';
import { admin, getDocument, getIssued, requireUser } from '../_lib/supabase';

export default route('POST', async (req): Promise<RevokeResponse> => {
  const user = await requireUser(req);
  const verificationId = verificationIdField(jsonBody(req));

  const issued = await getIssued(verificationId);
  if (!issued || issued.status === 'reserved') throw new ApiFailure('NOT_FOUND', 'No issued document has this verification id.');

  if (issued.issued_by !== user.id) {
    const doc = await getDocument(issued.document_id);
    if (doc.owner_id !== user.id) throw new ApiFailure('FORBIDDEN', 'Only the document owner or the issuer can revoke it.');
  }

  if (issued.status === 'revoked') return { result: 'revoked' }; // repeat call

  const { error } = await admin()
    .from('issued_documents')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', issued.id);
  if (error) throw internal('revoke', error);

  return { result: 'revoked' };
});
