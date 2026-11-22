// Local stand-in for `vercel dev`: serves the /api handlers on
// http://localhost:3000 (the port the web app's dev proxy expects) without
// needing a Vercel login. It imitates only what the handlers use from Vercel:
// req.query, req.body (parsed JSON, 4.5 MB limit), res.status(), res.json().
// It is NOT the Vercel runtime; routing and limits on Vercel come from the
// file layout and vercel.json.
//
// Run:  npm run dev:api      (GEMINI_MOCK=true in .env to skip the AI service)

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import registerAccount from '../api/auth/register';
import extract from '../api/extract';
import issueComplete from '../api/issue/complete';
import issueReserve from '../api/issue/reserve';
import issueRevoke from '../api/issue/revoke';
import reviewRequest from '../api/review/request';
import translate from '../api/translate';
import tts from '../api/tts';
import partnerVerify from '../api/v1/verify/[id]';
import verify from '../api/verify/[id]';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

const FIXED: Record<string, Handler> = {
  '/api/auth/register': registerAccount,
  '/api/extract': extract,
  '/api/translate': translate,
  '/api/review/request': reviewRequest,
  '/api/issue/reserve': issueReserve,
  '/api/issue/complete': issueComplete,
  '/api/issue/revoke': issueRevoke,
  '/api/tts': tts,
};
const WITH_ID: Array<[RegExp, Handler]> = [
  [/^\/api\/verify\/([^/]+)$/, verify],
  [/^\/api\/v1\/verify\/([^/]+)$/, partnerVerify],
];

const BODY_LIMIT = 4.5 * 1024 * 1024; // Vercel's request body limit
const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Buffer | 'too_large'> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_LIMIT) return 'too_large';
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url ?? '/', 'http://localhost');
  let handler = FIXED[url.pathname];
  const query: Record<string, string> = Object.fromEntries(url.searchParams);
  if (!handler) {
    for (const [pattern, candidate] of WITH_ID) {
      const match = pattern.exec(url.pathname);
      if (match) {
        handler = candidate;
        query.id = decodeURIComponent(match[1]);
      }
    }
  }
  res.on('finish', () => console.log(`${req.method} ${url.pathname} -> ${res.statusCode} (${Date.now() - started} ms)`));
  if (!handler) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });

  const raw = await readBody(req);
  if (raw === 'too_large') {
    return sendJson(res, 413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is larger than 4.5 MB.' } });
  }
  let body: unknown;
  if (raw.length > 0) {
    const text = raw.toString('utf8');
    try {
      body = (req.headers['content-type'] ?? '').includes('application/json') ? JSON.parse(text) : text;
    } catch {
      return sendJson(res, 400, { error: { code: 'BAD_REQUEST', message: 'The request body is not valid JSON.' } });
    }
  }

  const vreq = Object.assign(req, { query, body, cookies: {} }) as unknown as VercelRequest;
  const vres = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return vres;
    },
    json(value: unknown) {
      sendJson(res, res.statusCode, value);
      return vres;
    },
    send(value: unknown) {
      res.end(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
      return vres;
    },
  }) as unknown as VercelResponse;

  await handler(vreq, vres);
}).listen(PORT, () => {
  console.log(`Transly API (local stand-in) on http://localhost:${PORT}  GEMINI_MOCK=${process.env.GEMINI_MOCK ?? 'unset'}`);
});
