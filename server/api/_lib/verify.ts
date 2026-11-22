// Shared lookup for the public and the partner verify endpoints.

import type { VerifyResponse } from '../../../shared/contract';
import { internal, isVerificationId } from './http';
import { admin, getIssued, type IssuedRow } from './supabase';

export interface VerifyLookup {
  /** Fields common to both endpoints. `result: 'not_found'` carries nothing else. */
  response: Omit<VerifyResponse, 'pdfUrl'>;
  /** The record, only when it is issued or revoked. */
  issued?: IssuedRow;
}

/** Unknown, malformed and reserved ids all look the same: not_found. */
export async function lookup(id: unknown): Promise<VerifyLookup> {
  if (!isVerificationId(id)) return { response: { result: 'not_found' } };
  const issued = await getIssued(id);
  if (!issued || issued.status === 'reserved') return { response: { result: 'not_found' } };

  const { data: doc, error } = await admin()
    .from('documents')
    .select('source_lang, target_lang, doc_type')
    .eq('id', issued.document_id)
    .maybeSingle();
  if (error) throw internal('read document for verify', error);

  return {
    issued,
    response: {
      result: issued.status === 'revoked' ? 'revoked' : 'valid',
      issuerName: issued.issuer_name,
      issuedAt: issued.issued_at ?? undefined,
      sourceLanguage: doc?.source_lang ?? undefined,
      targetLanguage: doc?.target_lang ?? undefined,
      documentType: doc?.doc_type ?? undefined,
      reviewStatus: issued.review_status,
      isPublic: issued.is_public,
    },
  };
}
