# Transly System Architecture

## Overview

Transly is built as a monorepo to allow two developers to work independently without stepping on each other's files.

## Directory Structure & Ownership

- **`client/`:** React + Vite frontend (port 5173). Contains all UI, routes, and state management.
- **`server/`:** Vercel Node `/api` handlers, local `npm run dev:api` (port 3000), and Postgres migrations under `server/supabase/`.
- **`shared/contract.ts` (Lead only):** The single source of truth for TypeScript types and API request/response structures.
- **`docs/` (Lead):** Documentation for the team.

## Data Flow

1. **Upload:** Frontend (Nugusa) uploads the image/PDF to Supabase Storage and triggers `/api/extract`.
2. **Extraction & Translation:** Backend (Bekam) uses the Gemini API to extract text blocks and translate them, returning them to the frontend.
3. **Review:** The user edits the blocks in the React UI.
4. **Issue:** Frontend calls `/api/issue/reserve`, generates the final PDF with a QR code, and calls `/api/issue/complete`.
5. **Verify:** The public `/v/:id` page fetches data from the backend to verify the QR code.

## Development Rules

- **No direct pushes to `main`:** All work must happen on `feature/backend-ai` or `feature/frontend-documents`.
- **Mocks:** `client/.env` uses `VITE_USE_MOCKS=true` until the API on port 3000 and Supabase are ready. Then set it to `false`.
- **No Secrets:** `.env` is in `.gitignore`. Never commit API keys.
