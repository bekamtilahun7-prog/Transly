# Transly

Transly is a document translation product for Ethiopian languages: **Afaan Oromo (`om`)**, **Amharic (`am`)**, and **English (`en`)**. A customer uploads a PDF or image, the system extracts text into editable blocks, translates those blocks, optionally sends them to a human translator, then issues a signed PDF with a public verification QR.

Brand: **Orange & Midnight**. Frontend: React + Vite in `client/` (port **5173**). API: Vercel Node handlers in `server/api/` (port **3000**). Shared types live in `shared/contract.ts` and should not be edited without an explicit go-ahead.

---

## Product functionality

### Public

- Landing page and marketing pricing (`/`, `/pricing`).
- Public certificate check at `/v/:id`. Anyone with the verification id (from a QR on an issued PDF) can see whether the document is **valid**, **revoked**, or **not found**.
- Login and register (`/login`, `/register`). Real mode uses Supabase Auth. Mock mode (`VITE_USE_MOCKS=true`) accepts any credentials and treats an email containing `translator` as the translator role.

### After sign-in

1. **Plan onboarding** (`/onboarding`, `/checkout`). The user picks Individual vs Organization, Free / Pro / Premium / Team / Enterprise, monthly or yearly, and (for org plans) a seat count. Amounts are shown in **ETB**. Choosing a paid plan only records `pending_payment` in the browser. The UI never treats payment as successful.
2. **Dashboard** (`/dashboard`). Recent documents, counts, language mix, and the 3-file free allowance notice.
3. **Documents** (`/documents`, `/documents/upload`). Upload a file (max 10 MB), choose source/target language and document type (`academic`, `id_certificate`, `legal`, `other`).
4. **Extract** (`/documents/:id/review`). Calls `POST /api/extract`. Gemini (or a mock) returns detected language, document type, and typed **blocks** (heading, paragraph, table row, list item, stamp, signature, logo, handwriting). Stamps and similar non-text blocks are placeholders, not invented text.
5. **Translate** (`/documents/:id/translation`). Calls `POST /api/translate`. Block ids, order, count, and types stay the same; only `text` changes. The owner can edit translated blocks until the document is issued.
6. **Human review** (optional). The owner requests review (`POST /api/review/request`). Translators see a queue (`/translator`) and edit in-review documents (`/translator/:id`).
7. **Issue**. Reserve a verification id (`POST /api/issue/reserve`), the client builds the PDF with a QR, then complete (`POST /api/issue/complete`) with the PDF bytes. The API hashes those bytes (`sha256`) and stores the issued record.
8. **Revoke**. Owner or issuing translator can revoke (`POST /api/issue/revoke`). Public verify then returns `revoked`.

Document status in the database: `uploaded` → `extracted` → `translated` → `in_review` → `reviewed` → `issued`. `revoked` is only a verify result on the issued record, not a document status.

### Roles

| Role | How it is set | What they can do |
| --- | --- | --- |
| `customer` | Default on every new auth user | Own documents: upload, extract, translate, request review, issue, revoke own issued PDFs |
| `translator` | Not client-writable. Set in SQL / service role: `update profiles set role = 'translator' where id = '…'` | Read/edit `in_review` documents; issue as `human_reviewed`; revoke records they issued |

There are no Profile or Settings pages.

---

## What the backend already does

Handlers under `server/api/`, local server `npm run dev:api` on **3000**. Vite proxies `/api` there. Errors always look like `{ error: { code, message } }`. Auth is `Authorization: Bearer <supabase access token>` except public verify.

| Route | Who | Job |
| --- | --- | --- |
| `POST /api/extract` | Owner | Download the file from the private `documents` bucket, run Gemini extract, save original blocks, status `extracted` |
| `POST /api/translate` | Owner | Translate blocks with Gemini, save translated blocks, status `translated` |
| `POST /api/review/request` | Owner | Move a translated document to `in_review` |
| `POST /api/issue/reserve` | Owner or translator | Create a pending issued row and return `verificationId`. `human_reviewed` is accepted only if the caller is a translator |
| `POST /api/issue/complete` | Same | Accept PDF (base64, ~3 MB), hash bytes, mark `issued` |
| `POST /api/issue/revoke` | Owner or `issued_by` | Mark the issued record revoked |
| `GET /api/verify/:id` | Public | Lookup: `valid` / `revoked` / `not_found`. Signed PDF URL only if `isPublic` |
| `GET /api/v1/verify/:id` | Partner demo key | Same lookup plus `sha256`. Demo only, not a government system |

Helpers: `server/api/_lib` (http, supabase service role, Gemini, prompts, block validation, verify). Schema: `server/supabase/migrations/001_init.sql`, `002_constraints_and_updates.sql` (adds `issued_by` — required for issue/revoke/verify), `003_grants.sql`.

The API uses **service role** and does its own ownership checks. Browser clients use the **anon** key and RLS: owners read their rows; translators read `in_review`; clients cannot change `status` / `owner_id` / `storage_path`.

**Not built yet:** any payment, subscription, quota, or organization API. Extract/translate have been run with `GEMINI_MOCK=true` against the real database; live Gemini through these handlers has not been the default test path.

---

## Ideas for backend (not implemented)

These are product ideas that fit the existing UI and contract. Do not treat them as shipped. `shared/contract.ts` stays as v2 unless the lead explicitly allows an edit. Do not invent Stripe, Chapa, seats, or webhooks until that work is confirmed.

### 1. Payments and plans

The pricing screens already show Free, Pro (299 ETB/mo), Premium (799), Team Pro (389/member), Enterprise Premium (1039/member), 10% yearly discount, 30% org markup, and a **3-file** free edit/download allowance. Checkout only stores `pending_payment` in `localStorage`.

When a payment backend is approved, a typical shape is:

- Server-side catalog (same ETB numbers, never trust the client amount).
- Init + verify endpoints (the sibling backend contract mentioned Chapa test mode; that was never coded here).
- Persist `subscriptions` / `payments`: user, plan, period, seats, provider reference, status (`pending` / `paid` / `failed` / `canceled`).
- Only after provider verify: flip access from `pending_payment` to paid. Never activate a paid plan in the browser.

### 2. Free allowance and quotas

The UI counts files locally and does not define a reset policy. A backend should:

- Count **issued** (or completed) documents per user, not client-side guesses.
- Decide whether 3 files is lifetime, per month, or per billing period.
- Enforce extract / issue on the API: Free blocked after the cap; Pro/Premium get higher limits.
- Return a clear `FORBIDDEN` or `BAD_REQUEST` with a human message the existing `ApiError` UI can show.

### 3. Organizations and seats

Team/Enterprise copy talks about invitations, org roles (`owner`, `administrator`, `editor`, `viewer`), and document visibility (`private`, `team_shared`, `organization`). None of that is in the schema today. A later backend could add:

- `organizations`, `memberships` (role + seat against the paid plan).
- Invite by email; owner cannot exceed paid seat count.
- Document sharing within the org without making issued PDFs public.
- Admin usage dashboard (documents issued this period, members, remaining seats).

Until then, every document is owned by a single user.

### 4. Translator workflow

Today: request review → any translator can open the queue → they edit blocks → they may issue as `human_reviewed`. Ideas:

- Assign a specific translator (or round-robin) instead of an open queue.
- `reviewed` status when the translator signs off, before the customer issues.
- SLA / queue timestamps, comments per block, and a simple audit of who changed which block.
- Notify the owner when review is done (email or in-app later).

### 5. Issue, PDF, and verify

The client still builds the PDF. Ideas that stay compatible with reserve → complete:

- Optional server-side PDF (fonts, layout, QR) so hashing and layout are not client-trusted.
- Store a canonical copy in Storage; public verify already returns a short-lived URL when `isPublic`.
- Watermark / “machine translated” vs “human reviewed” on the sheet.
- Rate-limit public verify; keep partner verify on a real key store instead of one demo env var.
- Webhook or email when someone verifies a certificate (optional, privacy-sensitive).

### 6. Auth, profiles, safety

- Keep roles off the client. Promote translators only with service role / SQL.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in any `VITE_` variable.
- Rotate keys if they were ever pasted into chat.
- Optional: email confirmation, password reset, and a server-side “delete my documents” that also removes Storage objects.

### 7. Gemini and operations

- Keep `GEMINI_MOCK=true` for UI work; turn it off for a dedicated extract/translate test with a real file.
- Primary + fallback model (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`) already exist in the client helper.
- Log latency and failure codes (`RATE_LIMITED`, `BAD_GATEWAY`) without logging keys or full document text.
- Cap concurrent extract jobs per user so one account cannot stall Gemini quota.

### 8. Schema follow-through

Run **001 → 002 → 003** in the Supabase SQL editor for this project. **002 is required**: without `issued_documents.issued_by`, reserve / complete / revoke / a real verify lookup can return HTTP 500. Confirm the private Storage bucket `documents` exists (created in 001).

---

## How to run locally

Two processes:

```bash
# repo root — API
npm run dev:api

# frontend (or: npm run dev:web)
npm run dev --prefix client
```

- App: `http://localhost:5173`
- API: `http://localhost:3000`

`server/.env` (gitignored, never `VITE_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_MOCK`, `PARTNER_API_KEY_DEMO`.

`client/.env` (browser-safe only): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_MOCKS=false` when you want the UI to call the real API instead of `mockApi`. API env lives in `server/.env`.

See `docs/architecture.md` for repo layout. Types: `shared/contract.ts`.
