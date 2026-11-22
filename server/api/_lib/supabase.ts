// Server-side Supabase access. The service role key bypasses row level
// security, so every handler does its own ownership check before touching data.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import type { Block, DocStatus, DocType, LangCode, ReviewStatus } from '../../../shared/contract';
import { ApiFailure, internal } from './http';

export const BUCKET = 'documents';

let client: SupabaseClient | undefined;

export function admin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

/** The signed-in user behind "Authorization: Bearer <supabase access token>", or 401. */
export async function requireUser(req: VercelRequest): Promise<{ id: string }> {
  const header = req.headers.authorization;
  const token = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header)?.[1] : undefined;
  if (!token) throw new ApiFailure('UNAUTHORIZED', 'Sign in first: the Authorization header is missing.');
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new ApiFailure('UNAUTHORIZED', 'Your session is invalid or has expired. Sign in again.');
  return { id: data.user.id };
}

export async function isTranslator(userId: string): Promise<boolean> {
  const { data, error } = await admin().from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw internal('read profile', error);
  return data?.role === 'translator';
}

export interface DocumentRow {
  id: string;
  owner_id: string;
  storage_path: string;
  source_lang: LangCode;
  target_lang: LangCode;
  doc_type: DocType | null;
  status: DocStatus;
  blocks_original: Block[] | null;
  blocks_translated: Block[] | null;
}

const DOCUMENT_COLUMNS =
  'id, owner_id, storage_path, source_lang, target_lang, doc_type, status, blocks_original, blocks_translated';

/** The document, or 404. Does not check who is asking. */
export async function getDocument(documentId: string): Promise<DocumentRow> {
  const { data, error } = await admin().from('documents').select(DOCUMENT_COLUMNS).eq('id', documentId).maybeSingle();
  if (error) throw internal('read document', error);
  if (!data) throw new ApiFailure('NOT_FOUND', 'Document not found.');
  return data as DocumentRow;
}

/** The document, only if the user owns it: 404 if missing, 403 if someone else's. */
export async function getOwnDocument(documentId: string, userId: string): Promise<DocumentRow> {
  const doc = await getDocument(documentId);
  if (doc.owner_id !== userId) throw new ApiFailure('FORBIDDEN', 'This document belongs to another account.');
  return doc;
}

export async function updateDocument(documentId: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await admin().from('documents').update(values).eq('id', documentId);
  if (error) throw internal('update document', error);
}

export interface IssuedRow {
  id: string;
  verification_id: string;
  document_id: string;
  issuer_name: string;
  issuer_phone: string | null;
  review_status: ReviewStatus;
  is_public: boolean;
  status: 'reserved' | 'issued' | 'revoked';
  pdf_path: string | null;
  sha256: string | null;
  issued_at: string | null;
  revoked_at: string | null;
  issued_by: string | null;
}

const ISSUED_COLUMNS =
  'id, verification_id, document_id, issuer_name, issuer_phone, review_status, is_public, status, pdf_path, sha256, issued_at, revoked_at, issued_by';

export async function getIssued(verificationId: string): Promise<IssuedRow | null> {
  const { data, error } = await admin()
    .from('issued_documents')
    .select(ISSUED_COLUMNS)
    .eq('verification_id', verificationId)
    .maybeSingle();
  if (error) throw internal('read issued document', error);
  return (data as IssuedRow | null) ?? null;
}
