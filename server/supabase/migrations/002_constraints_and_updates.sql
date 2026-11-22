-- 002: value constraints from shared/contract.ts, client-side block editing,
-- and the issuer column needed by /api/issue/revoke.

-- ---------------------------------------------------------------------------
-- CHECK constraints (DocType and ReviewStatus in shared/contract.ts)
-- ---------------------------------------------------------------------------
alter table public.documents
  add constraint documents_doc_type_check
  check (doc_type in ('academic', 'id_certificate', 'legal', 'other'));
-- doc_type stays nullable: a null passes the check.

alter table public.issued_documents
  add constraint issued_documents_review_status_check
  check (review_status in ('machine', 'human_reviewed'));

-- ---------------------------------------------------------------------------
-- Who issued a record. /api/issue/revoke allows the document owner or this
-- user. Nullable so rows survive if the issuing account is deleted.
-- ---------------------------------------------------------------------------
alter table public.issued_documents
  add column issued_by uuid references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- documents: direct updates from the browser
-- ---------------------------------------------------------------------------
-- Owners may edit their own document until it is issued. Translators may edit
-- documents that are in review. Column privileges limit what either can
-- change: status, owner_id and storage_path move only through the API.
revoke update on table public.documents from anon, authenticated;
grant update (blocks_original, blocks_translated, source_lang, target_lang, doc_type)
  on table public.documents to authenticated;

create policy "documents: owner updates own until issued"
  on public.documents for update
  to authenticated
  using (owner_id = (select auth.uid()) and status <> 'issued')
  with check (owner_id = (select auth.uid()) and status <> 'issued');

create policy "documents: translator updates in_review"
  on public.documents for update
  to authenticated
  using (status = 'in_review' and (select public.is_translator()))
  with check (status = 'in_review' and (select public.is_translator()));
