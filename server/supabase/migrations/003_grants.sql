-- 003: explicit table privileges.
--
-- This Supabase project does not grant privileges on new public tables to the
-- API roles automatically. Without these grants every request fails with
-- "42501 permission denied for table ...", including requests made with the
-- service role key. RLS policies from 001 and 002 still decide which rows a
-- signed-in user can touch; these grants only make the tables reachable.
--
-- Safe to run more than once.

-- The API (service role) reads and writes everything.
grant select, insert, update, delete
  on table public.profiles, public.documents, public.issued_documents
  to service_role;

-- Signed-in users: read their own profile (policy "profiles: read own").
grant select on table public.profiles to authenticated;

-- Signed-in users: read and register documents (policies in 001). Updates stay
-- limited to the columns granted in 002; there is no delete.
grant select, insert on table public.documents to authenticated;
revoke update on table public.documents from authenticated;
grant update (blocks_original, blocks_translated, source_lang, target_lang, doc_type)
  on table public.documents to authenticated;

-- issued_documents stays API only.
revoke all on table public.issued_documents from anon, authenticated;

-- Anonymous visitors get nothing; public verification goes through the API.
revoke all on table public.profiles, public.documents from anon;

grant usage on schema public to authenticated, service_role;
grant execute on function public.is_translator() to authenticated, service_role;
