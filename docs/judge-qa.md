# Transly — judge Q&A

Speak these answers out loud. If a judge presses, stay honest: the **live demo is the mock frontend** (`VITE_USE_MOCKS`). The real API, SQL, Gemini, and TTS handlers exist in the repo and are designed to replace mocks — they are not the default demo path.

Never claim we charge money, connect to a government registry, or run live Gemini on stage unless that path is actually on.

---

## 1. One-sentence pitch

**Transly extracts, translates, issues, and verifies official-style documents between Afaan Oromo, Amharic, and English — with a public QR so anyone can check valid, revoked, or not found.**

---

## 2. Product and problem

### What is Transly?

A document workflow, not a chat translator. Upload a PDF or image → extract text into editable **blocks** → translate those blocks → optionally send to a human translator → issue an A4 PDF with a QR code → anyone opens `/v/:id` and sees **valid / revoked / not found**.

### What problem are you solving?

In Ethiopia, people constantly need certificates, IDs, and legal papers moved between **Afaan Oromo (`om`)**, **Amharic (`am`)**, and **English (`en`)**. Google Translate does sentences. We keep **document structure**, let a human **review**, then attach a **verification identity** to the issued PDF.

### Who is the user?

Individuals first (students, job applicants, people dealing with offices). Pricing also shows Team/Enterprise in **ETB**, but organizations and seats are **UI copy only** — not implemented.

### Who is *not* the user / what are you *not*?

We are **not** a government ministry, not a national ID system, not a court of record. Partner verify (`GET /api/v1/verify/:id`) is a **demo key** path. The PDF says it is independent.

### Why these three languages only?

They are the three languages in our contract (`om | am | en`). That is the Ethiopian bilingual/trilingual document problem we chose to finish well. Adding Tigrinya or others would be a contract + prompt + font + TTS change, not a toggle.

### Why not just Google Translate / ChatGPT / DeepL?

Those tools:

- Do not preserve **block structure** (headings, table rows, stamps).
- Invent stamp/signature text.
- Have no **issue → QR → public verify** loop.
- Have no **human translator** role.
- Do not emit an A4 PDF with Ethiopic + Latin fonts and a checksum.

We use Gemini **inside** extract/translate, then own the rest of the workflow.

### What is the end-to-end flow?

`uploaded → extracted → translated → in_review → reviewed → issued`.  
`revoked` is a **verify result** on the issued record, not a document status.

1. Upload (PDF/JPG/PNG, max **10 MB**)
2. Extract typed blocks
3. Translate (same ids, order, count, types; only `text` changes)
4. Optional human review
5. Reserve verification id → client builds PDF + QR → complete (store SHA-256)
6. Public `/v/:id`

### What document types do you support?

`academic`, `id_certificate`, `legal`, `other`. These are labels for the model and UI, not legal classifications.

### What is a “block”?

A typed piece of the page: `heading`, `paragraph`, `table_row`, `list_item`, `stamp`, `signature`, `logo`, `handwriting`. Stamps/signatures/logos/handwriting are **placeholders**, never invented transcription (unless stamp text is clearly legible on the live extract path).

### Can the user edit the translation?

Yes, until the document is issued. The owner edits blocks in the translation screen. A translator can edit when the document is `in_review`.

### How does human review work?

Owner calls review request → status `in_review` → translators see `/translator`. Translators can issue as `human_reviewed`. Customers issuing themselves are tagged `machine`. Role `translator` is **not** client-writable; in real mode it is set in SQL.

### How does verification work?

The issued PDF has a QR pointing at `/v/:id`. Anyone can open it. Results: **valid**, **revoked**, **not found**. Owner (or issuing translator) can revoke. Mock demo ids: `revoked-demo`, `missing-demo`.

### What does the QR actually prove?

It proves we have an issued record for that id, optional public PDF URL, issuer name, languages, review status, and (on complete) a **SHA-256 of the PDF bytes we were given**. It does **not** prove a government office issued the original paper.

### Why is the PDF built in the browser?

Hackathon split: frontend owns layout (pdf-lib + Noto Sans + Noto Sans Ethiopic + qrcode). The API **hashes the bytes it receives**. Layout is not server-trusted yet. Next step would be server-side PDF so hash and layout cannot diverge.

### What fonts do you use?

**Noto Sans** for Latin, **Noto Sans Ethiopic** for Amharic. Mixed runs are split so Ethiopic and Latin both render.

### Is this a certified translation?

No. `human_reviewed` means a translator on our platform reviewed it. It is **not** a sworn/court-certified translation unless a real licensed translator is onboarded later.

### Why Orange & Midnight?

Brand constraint: `#FF6B00` / `#171923`. Distinct from generic purple-AI dashboards.

### Why no Profile or Settings pages?

Scope cut. Auth, plan onboarding, documents, issue, verify, accessibility, language. Profile/settings would not change the core loop.

### What does the landing page do?

Marketing + language-pair preview + entry to login/upload. UI language switcher (EN/AM/OR). Accessibility mode chooser on first visit.

---

## 3. Demo honesty (they *will* ask this)

### Is this a live backend demo?

The **default demo is mock mode**. `VITE_USE_MOCKS=true` (or missing Supabase anon key) → `mockApi` in localStorage. Login, extract, translate, issue, verify, revoke all work **in the browser**.

### Then what is real in the repo?

- Full React UI and routes
- `shared/contract.ts` v2 (API types)
- Vercel Node handlers: extract, translate, review, issue reserve/complete/revoke, public verify, partner verify, TTS
- SQL migrations `001` → `002` → `003` (RLS, storage bucket `documents`, `issued_by`)
- Gemini prompts and client (`@google/genai`)
- Gemini TTS (`kore` voice) on `/api/tts`

### Why demo on mocks?

Live path needs: anon key in the client, migrations applied (especially **002**), private storage bucket, API process, Gemini quota. We would rather show a **complete, reliable 3-minute loop** than a 500 on issue.

### What does mock extract/translate actually return?

Canned blocks (sample Amharic/English). Translation is prefixed `[MOCK]`. It proves the **UI and state machine**, not model quality.

### If I create an account, is it a real user?

In mock: any email/password; session in `transly.mock.user`. Email containing `translator` gets the translator role. Sign-up stores the password and sign-in checks it. There is no OTP or password-reset email.

### Did you fake the AI for the judges?

We **disclose** it. Mock is a flag, not hidden. Live Gemini is behind `GEMINI_MOCK=false` + API keys. TTS on the homepage/document reader in the UI uses the **browser Web Speech API**; the server TTS handler is a separate Gemini path.

### What would I see if mocks were off?

Same screens, but `realApi` talks to Supabase (auth, documents, storage) and `/api/*` (Vite proxies 5173 → 3000). Extract downloads the file from the private bucket and calls Gemini.

---

## 4. Architecture and stack

### What is the stack? (short)

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 4, Lucide |
| Language | TypeScript (shared contract + server; client mix of TS/JSX) |
| PDF / QR | pdf-lib, @pdf-lib/fontkit, qrcode |
| Auth / DB / files | Supabase (Auth, Postgres, Storage, RLS) |
| API | Vercel Node handlers (`@vercel/node`), local `tsx` on port 3000 |
| AI | Google Gemini via `@google/genai` |
| TTS (server) | Gemini TTS (`gemini-2.5-flash-preview-tts`, voice `kore`) |
| TTS (UI demo) | Browser `speechSynthesis` |
| i18n | Custom `LocaleProvider` + `client/src/i18n/messages.ts` (en/am/om) |
| Contract | `shared/contract.ts` v2 |
| Hosting target | Vercel (static client + serverless functions) |

### Why a monorepo (`client/` + `server/` + `shared/`)?

Two people can own UI vs API without fighting. The **contract file** is the interface. Vite aliases `@shared` to `shared/contract.ts`.

### Why Vite, not Next.js?

SPA + static hosting, React Router, client-side PDF generation, simple `/api` proxy. Next.js SSR is unused for this product. Vite **strictPort 5173**.

### Why React 19 / Tailwind 4 / Router 7?

Current stable stack the frontend was built on. Tailwind 4 via `@tailwindcss/vite`.

### Why not a separate Express app?

Handlers are already shaped as **Vercel Node functions**. Locally `server/scripts/dev-api.ts` mounts the same files on port **3000**. One code path for local and deploy.

### Why TypeScript on the contract if the UI has JSX files?

The **API shapes** must not drift. `shared/contract.ts` is types-only, lead-owned. UI can stay JS/JSX where it already is.

### How does the frontend talk to the backend?

`client/src/services/api.ts` picks `mockApi` or `realApi`. Real calls: Supabase JS (auth/rows/storage) + `fetch('/api/...')`. Vite proxies `/api` → `localhost:3000`.

### What ports?

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

### What is in `vercel.json`?

Client build from `client/`, output `client/dist`, SPA rewrite to `index.html`, longer timeouts for extract/translate (150s) and TTS (60s).

### Why 150 seconds for extract?

Vision + long documents. Serverless defaults are too short.

### How is state managed?

React context (auth, locale, accessibility/theme). No Redux. Document data lives in mock localStorage or Supabase.

### Why localStorage for mocks?

Zero-infra demo. Key `transly.mock.db.v2`. Judges can issue and verify in the same browser.

### What Node version?

Current LTS (20+). Vite 7 needs a recent Node.

---

## 5. Data, auth, security

### What is stored?

**profiles** (role), **documents** (metadata, blocks, languages, status, storage path), **issued_documents** (verification id, issuer, hash, public flag, revoked). Files in private Storage bucket **`documents`**.

### What is RLS doing?

Browser uses the **anon** key. Owners read their documents; translators read `in_review`; clients cannot change `status` / `owner_id` / `storage_path`. `issued_documents` is API-only (RLS on, no client policies). Roles are **not** taken from user metadata the client controls.

### Why service role on the API?

Serverless functions bypass RLS and **check ownership themselves**. They download files, call Gemini, write status. Service role never goes in a `VITE_` variable.

### What keys exist?

| Where | What |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` | Server only |
| `PARTNER_API_KEY_DEMO` | Optional partner verify |

`.env` is gitignored. Never commit keys.

### How does login work (real mode)?

Supabase Auth. `POST /api/auth/register` creates a confirmed user (password stored as a hash) and the `handle_new_user` trigger adds a `customer` profile. Sign-in checks that password. There is no OTP screen.

### Can I promote myself to translator in the app?

No. SQL: `update profiles set role = 'translator' where id = '…'`. Mock: put `translator` in the email.

### How do you stop someone issuing someone else’s document?

API ownership checks + RLS. Reserve/complete/revoke check owner or `issued_by`.

### Is the issued PDF public?

Only if `isPublic` is true. Then verify may return a short-lived signed URL. Private issued records still verify as valid/revoked without exposing the file.

### Why SHA-256?

Integrity of the **bytes we stored**. If the file changes, the hash no longer matches. It is not a PKI signature or government seal.

### File size limits?

Upload **10 MB** (bucket + UI). Issue complete PDF base64 capped around **3 MB** in the contract.

### Injection / prompt injection?

Extract prompt: copy visible text, do not guess, `[unclear]` if unreadable. Translate: same JSON shape, do not invent, keep numbers/dates/codes. We still treat model output as **untrusted** and validate block ids/types before save.

### XSS / storing HTML?

Blocks are text. UI should render as text, not HTML. Issued PDF is generated from those strings.

### GDPR / personal data?

Documents are highly personal. Private bucket, owner-scoped RLS, revoke. We do **not** have a full privacy program or deletion product yet. Footer Privacy/Terms are **labels**, not legal pages.

### Rate limiting?

Contract has `RATE_LIMITED`. Public verify should be rate-limited in production; not a full WAF. Partner verify requires a bearer key.

---

## 6. AI (Gemini)

### Which model?

Configured via `GEMINI_MODEL` (intended `gemini-3.5-flash` or whatever is in env). Fallback `GEMINI_FALLBACK_MODEL` on 429/503/timeout. TTS is a **different** model (`gemini-2.5-flash-preview-tts`, fallback pro TTS). Do not reuse the JSON model for speech.

### Why Gemini and not open source / Claude / GPT?

Multimodal extract (photo/PDF), strong instruction following for JSON blocks, one vendor for extract + translate + TTS. Hackathon quota and SDK (`@google/genai`) already wired.

### How do you keep structure during translation?

Prompt + validator: same **ids, order, count, types**. Only `text` may change. Table rows keep ` | `. Line breaks inside a block stay `\n`.

### What if the photo is blurry?

Extract is told to write `[unclear]`, not guess. User can edit before issue.

### Do you OCR separately (Tesseract)?

No. Gemini vision is the extractor. That is a product choice: fewer moving parts, better mixed-script pages, worse when the model is down/quota’d.

### How do you handle stamps and signatures?

Do **not** hallucinate wording. Placeholder: `[Stamp present in original]` etc. after translate. Extract may note “round stamp, text unreadable”.

### Names and numbers?

Do not change numbers, dates, reference codes, phones, emails. Names: copy if already in target script; otherwise transliterate (Ethiopic vs Latin).

### What if Gemini is down?

`BAD_GATEWAY` / `RATE_LIMITED`. Fallback model once. `GEMINI_MOCK=true` for development. Product should show the API error `{ error: { code, message } }`.

### Did you evaluate accuracy?

Not a published benchmark. Quality work is **prompt + human edit + optional translator**. We would measure: character error on extract, block-count mismatches, name/number preservation.

### Why temperature / JSON-only?

Extract/translate ask for **JSON only**. TTS uses a fixed voice (`kore`) so it does not hop speakers.

### Can it read handwritten Amharic?

Block type `handwriting` exists; we treat it as non-text placeholder unless clearly printed. Handwriting OCR is **not** a claim we should make on stage.

---

## 7. Languages, i18n, accessibility

### Is the UI translated?

Yes — English, Amharic, Afaan Oromo via `LocaleProvider` (landing, auth, pricing, workflow).

### Is TTS the same as translation?

No. Translation is Gemini JSON. **Listen** in the UI is browser speech. Server `/api/tts` is Gemini TTS for OM/AM/EN with one voice. Browser voices for Amharic/Oromo are often **missing** on Windows — say that if it sounds English.

### What is Accessibility Mode?

First-visit chooser: Standard vs Accessible (larger text, high contrast, page reading). Document “Listen” reads extracted/translated text. Not a full WCAG audit.

### Light and dark theme?

Yes (Orange & Midnight).

---

## 8. Payments, pricing, business

### How do you make money?

Catalog in ETB: Free, Pro (299/mo), Premium (799), Team Pro (389/seat), Enterprise Premium (1039/seat), 10% yearly, org markup in the copy. **Checkout does not charge.** Paid plans stay `pending_payment`. Free is the only path that actually continues in the demo.

### Why no Chapa / Stripe?

Out of scope for this phase. We refused to fake a successful payment. Wiring a provider without a real merchant account would be theater.

### What is the free limit?

UI: **3 files**. Mock can 403 a 4th countable upload. Real quota is **not** enforced as a billing backend.

### Why ETB?

Users are in Ethiopia. USD checkout would be the wrong default.

### Who pays — the citizen or the office?

MVP: the person who needs the translation. Later: offices/universities on Team/Enterprise (not built).

### Competitor landscape?

Google Translate, ChatGPT, local translation bureaus, notaries. We compete on **workflow + verify**, not on being the cheapest sentence translator.

### Moat?

Data loop (issued hashes + review), bilingual prompts, Ethiopic PDF, translator role. Easy to copy a landing page; harder to copy a trusted issue/verify habit — and we are **not** there yet.

### Go-to-market?

Students and diaspora paperwork first. Partner with translation offices for `human_reviewed`. Universities for academic transcripts. No signed pilots in this repo.

---

## 9. Legal, ethics, trust

### Could someone issue a fake degree?

Yes, if they upload a fake image. We verify **our issued PDF**, not the original institution. Say this clearly. Mitigations: human review, issuer name on the sheet, revoke, hash, later institution APIs.

### Disclaimers?

Independent project, not a government service. Do not present Transly as an official stamp.

### Biometric / ID photos?

We store the file the user uploaded. Treat as sensitive. No face-match product.

### Copyright of Gemini output?

User-supplied documents; we are a processor. Follow Google’s API terms. Not legal advice.

---

## 10. Scale, ops, deploy

### Will this scale?

Hackathon scale: Vercel functions + Supabase. Gemini is the bottleneck (quota, latency). Extract is the expensive call. Cap concurrent jobs per user in production.

### Cold starts?

Serverless extract can be slow. 150s maxDuration is the safety net.

### Why Supabase not Firebase / custom Postgres?

Auth + Postgres + Storage + RLS in one project. SQL migrations we can read. Ethiopia-friendly enough if the project region is chosen well (latency is a known issue).

### Why not deploy yet?

Need anon key, migration **002**, hosting for API, production Gemini quota, and a decision not to ship mock mode. We do not deploy with secrets in the client.

### What still blocks production issue/verify?

Migration **002** adds `issued_documents.issued_by`. Without it, real issue/revoke/verify can 500.

### Monitoring?

Not built. Would log latency and error codes **without** full document text or keys.

### Tests?

Typecheck (`tsc`) and ESLint. No full automated E2E suite in package.json. Demo video is a Playwright walkthrough, not a CI test.

---

## 11. Team, process, contract

### Why is `shared/contract.ts` locked?

Single source of truth for request/response types. Frontend and backend must not invent fields (especially payments). Version **v2**.

### Error format?

Always `{ error: { code, message } }` with codes like `UNAUTHORIZED`, `FORBIDDEN`, `UNSUPPORTED_LANGUAGE`, `RATE_LIMITED`, `BAD_GATEWAY`.

### Auth header?

`Authorization: Bearer <supabase access token>` except public verify.

### Partner API?

`GET /api/v1/verify/:id` with a demo partner key. Returns verify fields plus `sha256`. **401** if key missing/wrong. Not a government connection.

---

## 12. Limitations (say these before they trap you)

- Mock UI is the reliable demo.
- No payments, no paid activation, no orgs/seats/invites.
- No Profile/Settings.
- Privacy/Terms footer is not a policy page.
- Client-built PDF = client-trusted layout.
- Mock Oromo extract is not a dedicated Oromo corpus.
- Live Gemini quality not the demo.
- Browser TTS often has no Amharic/Oromo voice.
- Not legally certified; not a government registry.
- SQL 002 must be applied before live issue.
- Partner verify is a demo key.

---

## 13. What we would build next (credible)

1. Turn mocks off; apply 001–003; real extract on a scanned certificate.
2. Server-side PDF so hash matches layout.
3. Real payment (e.g. Chapa) **after** a merchant account — never fake success.
4. Server-side free quota on **issued** documents.
5. Assign translators; `reviewed` before issue; audit of who edited which block.
6. Rate-limit verify; rotate partner keys.
7. Accuracy set: 50 Ethiopian documents, measure extract/translate errors.
8. Deletion: wipe Storage + rows.

Do **not** promise blockchain, national ID, or “AI-certified degrees.”

---

## 14. Rapid-fire (one-line answers)

| Question | Answer |
| --- | --- |
| Frontend? | React 19 + Vite 7 + Tailwind 4 + React Router 7 |
| Backend? | Vercel Node + tsx local API |
| Database? | Supabase Postgres + RLS |
| Files? | Supabase Storage, private `documents` bucket, 10 MB |
| AI? | Gemini extract + translate; optional Gemini TTS |
| Languages? | om, am, en only |
| Money? | Displayed in ETB; nothing charged |
| Verify? | Public `/v/:id` → valid / revoked / not found |
| PDF? | pdf-lib in the browser + Noto fonts + QR |
| Unique? | Blocks + human review + issue/verify, not a chat box |
| Open source models? | Not in this build |
| Mobile app? | Responsive web, not a native app |
| Offline? | Mock is local; real path needs network |
| Blockchain? | No. SHA-256 is enough for this MVP |
| Government API? | No |
| How long to build? | Hackathon team: UI + contract + handlers + SQL + a11y + i18n |
| Biggest risk? | People trusting a QR as an official seal |
| Biggest technical risk? | Gemini quota/accuracy + client-side PDF trust |
| Why should we pick you? | Complete workflow in three languages people here actually use, with honest scope |

---

## 15. Likely hostile questions (do not get defensive)

### “This is just a wrapper on Gemini.”

Gemini is the reader/translator. The product is **blocks, review, Ethiopic PDF, QR verify, roles, RLS**. Wrappers stop at the text box.

### “Your verify page is fake.”

In mock, it is a local registry. In the designed API, it is a real `issued_documents` row + hash. It still does **not** mean the original diploma is authentic.

### “Show me live AI.”

If mocks are on: “This recording/demo is the full UX on mocks so we don’t burn quota or fail extract on Wi-Fi. The prompts and handlers are in `server/api`. We can flip `GEMINI_MOCK` when you want a single live extract.”

### “Can I pay?”

“Pay is disabled on purpose. We will not mark a plan paid in the browser.”

### “Is the source code ours / original?”

This repo is Transly: React app, contract v2, handlers, SQL. Be ready to open `shared/contract.ts`, extract prompt, and issue flow.

### “Why 10 MB?”

Matches the storage bucket limit. Photos of certificates are small; we are not a generic file locker.

### “Why not WebSockets?”

Request/response is enough. Extract is a long POST, not a chat stream (could stream later).

### “Accessibility is just big fonts.”

Chooser + contrast + page/document speech. Not a full audit. We shipped the mode because documents must be usable, not because we claim WCAG AAA.

### “Oromo quality?”

UI is translated. Live extract/translate depends on Gemini. Mock extract is not a proper Oromo gold set. We would hire reviewers.

### “What if two people verify at once?”

Read-only lookup. Revoke is a status flip. No distributed lock needed for MVP.

### “SQL injection?”

Supabase client parameterized queries; service role used from typed handlers, not string-concat SQL from the browser.

### “Can the client set status=issued?”

Not via RLS. Issue goes through reserve → complete on the API.

### “Where is the password stored?”

Supabase Auth (real) or mock session (demo). We do not store bcrypt ourselves.

---

## 16. Demo walkthrough talking points (3 minutes)

1. **Problem** (15s) — OM / AM / EN documents, not chat.
2. **Landing + language switch** (20s) — product is localized.
3. **Login + Free plan** (20s) — paid is displayed, not charged.
4. **Upload → extract → translate** (50s) — blocks, placeholders, edit.
5. **Issue PDF + QR** (30s) — issuer name, public flag.
6. **Open `/v/:id`** (20s) — valid; mention revoke / not found.
7. **Accessibility listen** (15s) — browser speech; language coverage caveat.
8. **Close** (10s) — independent product; next is live Gemini + real payments.

If asked mid-demo “is this mocked?”: **Yes, this run is mock; the architecture on the next slide/repo is the real API.**

---

## 17. Closing line

**Transly is a trilingual document pipeline with an issue-and-verify loop. We used Gemini for reading and translation, Supabase for auth and storage, and a locked TypeScript contract so the UI and API cannot drift. We did not fake payments or a government seal.**
