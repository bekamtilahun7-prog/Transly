# Transly — brief for a new chat

Paste this file. Do not ask the user to re-explain the product. Inspect the repo if something here might be stale. Never print secrets, tokens, or `.env` values. Names of variables only.

**Repo root:** `D:\AU-9102\Sample-cursor\transly`  
**GitHub origin:** `https://github.com/bekamtilahun7-prog/Transly` (public, not a GitHub fork). Local remote `upstream` still points at `https://github.com/DevNaolAyana/transly`. They are different repos.  
**Branch:** `main` (local `feature/branch-1` exists at the same last-pushed commit).  
**Last pushed commit:** frontend only (`Add Transly React frontend with pricing onboarding.`). Backend files are local and untracked.

---

## Hard rules

- Do **not** edit `shared/contract.ts` unless the user explicitly allows it.
- Do **not** invent payments (Stripe, Chapa, subscriptions, seats, webhooks). Pricing UI has **no** backend. Wait for confirmation.
- Do **not** commit `.env` or keys. Never put service-role or Gemini keys in any `VITE_` variable.
- Do **not** add Profile or Settings pages.
- Frontend owns `http://localhost:5173` (`strictPort: true`, `host: true`). API is `http://localhost:3000`. Vite already proxies `/api` → 3000.
- Fit the **existing** React app in `client/`. Do not rebuild against `apps/web` (empty placeholder) or clone another repo’s UI.
- Keep brand **Orange & Midnight** (`#FF6B00` / `#171923`). Mobile-first.
- Languages in the contract: `om | am | en` only.
- Errors from `/api`: `{ error: { code, message } }`.
- Do not treat paid plans as active on the client. Checkout stays `pending_payment` until a real backend verifies payment (that backend does not exist).

---

## Idea (what it is)

Transly helps people translate official-style documents between **Afaan Oromo**, **Amharic**, and **English**. A customer uploads a PDF or photo, the system extracts text into editable **blocks**, translates them, optionally sends them to a human translator, then **issues** a PDF with a QR code. Anyone can open `/v/:id` and see if that certificate is valid, revoked, or not found.

It is aimed at individuals first; pricing also shows Team/Enterprise in ETB, but orgs/seats are UI copy only.

---

## How the product is supposed to work

Statuses on `documents`: `uploaded` → `extracted` → `translated` → `in_review` → `reviewed` → `issued`. `revoked` is only a verify result on the issued record.

1. Sign up / login (Supabase Auth when mocks are off).
2. Pick a plan on `/onboarding` (Free is real enough for demo; paid is display + `pending_payment`).
3. Upload to private Storage bucket `documents`, insert a `documents` row (`status: uploaded`).
4. `POST /api/extract` — Gemini (or mock) returns language, doc type, blocks. Saved as `extracted`.
5. `POST /api/translate` — same block ids/order/types; only `text` changes. `translated`.
6. Owner may edit translated blocks in the UI (RLS, after SQL 002).
7. Optional: `POST /api/review/request` → translators at `/translator`.
8. Issue: `POST /api/issue/reserve` → client builds PDF (pdf-lib, Noto Ethiopic, QR) → `POST /api/issue/complete` with PDF bytes; API stores SHA-256.
9. Public `GET /api/verify/:id`. Optional partner `GET /api/v1/verify/:id` (demo key, not a government system).

Roles: `customer` (default on signup) and `translator` (SQL only: `update public.profiles set role = 'translator' where id = '…'`).

---

## Implementation — what exists in this repo

### Frontend (`client/`) — built

React 19, Vite 7, Tailwind 4, react-router-dom 7, lucide-react, `@supabase/supabase-js`, pdf-lib, fontkit, qrcode.

Routes: `/`, `/login`, `/register`, `/pricing`, `/onboarding`, `/checkout`, `/dashboard`, `/documents`, `/documents/upload`, `/documents/:id/review`, `/documents/:id/translation`, `/documents/issued/:verificationId`, `/translator`, `/translator/:id`, `/v/:id`, 404.

Switch: `client/src/services/api.ts` — `VITE_USE_MOCKS === 'true'` → `mockApi` (localStorage). Otherwise `realApi` (Supabase + `/api/*`). Auth mocks: any password; email containing `translator` gets translator role.

Pricing catalog (ETB): Free, Pro 299, Premium 799, Team Pro 389/member, Enterprise 1039/member; 10% yearly; 3-file free allowance in the UI only.

### Backend (`server/`) — copied locally, **not on GitHub yet**

Eight handlers in `server/api/` plus `server/api/_lib/`. Local server: `npm run dev:api` from repo root (`server/scripts/dev-api.ts`). Server deps: `@google/genai`, `@supabase/supabase-js`, `tsx`, `@vercel/node`.

SQL (untracked, must be run in the Supabase SQL editor, in order):

- `server/supabase/migrations/001_init.sql`
- `server/supabase/migrations/002_constraints_and_updates.sql` (**required** — adds `issued_documents.issued_by`; without it issue/verify can 500)
- `server/supabase/migrations/003_grants.sql`

`vercel.json` is adapted for `client/` (not `apps/web`). API handlers live in `server/api/`.

### Contract

`shared/contract.ts` is **v2** (no payment types). Do not copy a v2.1 contract from the sibling backend repo (`D:\AU-9102\Cursor\transly-backend`) — that file adds unused Chapa payment types.

### Not built

Payments, quotas enforced on the server, organizations/seats, server-side PDF, live Gemini through handlers as the default test path (`GEMINI_MOCK` has been used). Extract/translate/review were designed to work with `GEMINI_MOCK=true` against a real database.

---

## Status snapshot (as of the last inspection)

| Area | State |
| --- | --- |
| UI screens and routing | Done |
| Mock login + mock documents | Done; this is what the running UI uses |
| Real `/api` files on disk | Done, uncommitted |
| API process on :3000 | Can run; public verify of a fake id returns `not_found` |
| Frontend talking to real API | **Not wired** — `VITE_USE_MOCKS` is set; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are empty |
| SQL 001–003 applied on the live Supabase project | Unsure — treat as **not applied** until confirmed |
| Real Gemini via handlers | Not the current path (`GEMINI_MOCK` set) |
| Payments | UI only |
| GitHub | Frontend commit pushed; backend/docs/SQL untracked |

Working directory is the repo root. Git dirty/untracked typically includes: `api/`, `scripts/`, root `package.json` + lockfile, `tsconfig.json`, `vercel.json`, three SQL files, `docs/project.md`, `docs/ai-handoff.md`, plus small edits to `.env.example`, `docs/architecture.md`, `HeroSection.jsx`, and an unused skyline png.

---

## How to run (two processes)

```bash
# root
npm run dev:api

# frontend
npm run dev --prefix client
```

App: `http://localhost:5173`  
API: `http://localhost:3000`

To stop mocks (after anon key is in `client/.env`):

```
VITE_SUPABASE_URL=<same project as API>
VITE_SUPABASE_ANON_KEY=<anon key, not service role>
VITE_USE_MOCKS=false
```

Restart Vite after changing frontend env.

**API `.env` (`server/.env`, gitignored):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` (optional), `GEMINI_MOCK`, `PARTNER_API_KEY_DEMO` (optional; unset partner verify → 500), `PORT`.

**Frontend `.env`:** only the three `VITE_*` names above.

---

## If the next task is a local demo

Do this order. Do not rewrite `server/api/`.

1. Run SQL 001, 002, 003 once in the Supabase SQL editor. Confirm bucket `documents`.
2. Fill frontend `.env`, `VITE_USE_MOCKS=false`, restart Vite.
3. Create a real Auth user. Translator = SQL update, not the UI.
4. Keep `GEMINI_MOCK=true` unless the user wants a live extract.
5. Upload → extract → translate → optional edit → issue → `/v/:id`.

More product/backend notes: `docs/project.md`. Layout: `docs/architecture.md`.

---

## Sibling folder (reference only)

A pre-made backend lived at `D:\AU-9102\Cursor\transly-backend`. This repo already has an adapted copy. Do not overwrite `shared/contract.ts` from there. Do not point `vercel.json` at `apps/web`.
