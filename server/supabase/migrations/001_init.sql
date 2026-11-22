-- Transly initial schema: profiles, documents, issued_documents, private
-- "documents" storage bucket, and row level security.
--
-- Access model
--   * Browser clients (anon / authenticated keys) are limited by the RLS
--     policies below.
--   * The /api serverless functions use the service role key, which bypasses
--     RLS, and do their own ownership checks.
--   * issued_documents has RLS enabled with no policies and no grants, so it is
--     reachable only through the API.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'translator')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile. There are no insert/update/delete
-- policies: a role is never client-writable. Promote a translator with the
-- service role or the SQL editor:
--   update public.profiles set role = 'translator' where id = '<user uuid>';
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Every new auth user gets a 'customer' profile. The role is deliberately not
-- read from user metadata, which the client controls at sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users that signed up before this migration ran.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Used by policies. Security definer so it does not depend on the caller's
-- own access to profiles.
create function public.is_translator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'translator'
  );
$$;

revoke all on function public.is_translator() from public, anon;
grant execute on function public.is_translator() to authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Object name inside the "documents" bucket: '<owner_id>/<file name>'.
  storage_path text not null,
  source_lang text not null check (source_lang in ('om', 'am', 'en')),
  target_lang text not null check (target_lang in ('om', 'am', 'en')),
  doc_type text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'extracted', 'translated', 'in_review', 'reviewed', 'issued')),
  blocks_original jsonb,
  blocks_translated jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_langs_differ check (source_lang <> target_lang),
  constraint documents_storage_path_unique unique (storage_path)
);

create index documents_owner_id_idx on public.documents (owner_id);
create index documents_in_review_idx on public.documents (created_at)
  where status = 'in_review';

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy "documents: owner reads own"
  on public.documents for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "documents: translator reads in_review"
  on public.documents for select
  to authenticated
  using (status = 'in_review' and (select public.is_translator()));

-- Owners may register a freshly uploaded file as their own document. Every
-- later change (blocks, status) goes through the API.
create policy "documents: owner creates own"
  on public.documents for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'uploaded'
    and blocks_original is null
    and blocks_translated is null
    and storage_path like (select auth.uid())::text || '/%'
  );

-- No update/delete policies: clients cannot change status or blocks directly.

-- ---------------------------------------------------------------------------
-- issued_documents (API only)
-- ---------------------------------------------------------------------------
create table public.issued_documents (
  id uuid primary key default gen_random_uuid(),
  -- 32 hex chars from crypto.randomBytes(16), generated by the API.
  verification_id text not null unique check (verification_id ~ '^[0-9a-f]{32}$'),
  document_id uuid not null references public.documents (id) on delete restrict,
  issuer_name text not null,
  issuer_phone text,
  review_status text not null,
  is_public boolean not null default false,
  status text not null default 'reserved'
    check (status in ('reserved', 'issued', 'revoked')),
  -- Object name of the issued PDF inside the "documents" bucket.
  pdf_path text,
  -- Hex SHA-256 of the exact uploaded PDF bytes.
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  -- An issued or revoked record must carry the file, its hash and a timestamp.
  constraint issued_documents_complete check (
    status = 'reserved'
    or (pdf_path is not null and sha256 is not null and issued_at is not null)
  )
);

create index issued_documents_document_id_idx on public.issued_documents (document_id);

-- RLS on with no policies, and no table privileges for client roles: only the
-- service role (the API) can read or write this table.
alter table public.issued_documents enable row level security;
revoke all on table public.issued_documents from anon, authenticated;

-- ---------------------------------------------------------------------------
-- storage: private "documents" bucket
-- ---------------------------------------------------------------------------
-- 10 MB limit and pdf/jpg/png only, enforced by storage in addition to the
-- checks the API does.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Source files live under '<owner uid>/...'. Issued PDFs live under 'issued/',
-- which no policy matches, so only the API can touch them.
create policy "documents bucket: owner uploads to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "documents bucket: owner reads own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "documents bucket: translator reads in_review files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (select public.is_translator())
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and d.status = 'in_review'
    )
  );
