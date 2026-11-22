// Serves every /api/* route on Netlify by running the existing handlers in
// server/api. Those handlers are written against the small part of the Vercel
// request/response API they use (req.method, req.url, req.headers, req.query,
// req.body, res.status(), res.json(), res.setHeader()), so this file adapts a
// web Request into that shape and collects the reply into a web Response.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import registerAccount from '../../server/api/auth/register';
import extract from '../../server/api/extract';
import issueComplete from '../../server/api/issue/complete';
import issueReserve from '../../server/api/issue/reserve';
import issueRevoke from '../../server/api/issue/revoke';
import reviewRequest from '../../server/api/review/request';
import translate from '../../server/api/translate';
import tts from '../../server/api/tts';
import partnerVerify from '../../server/api/v1/verify/[id]';
import verify from '../../server/api/verify/[id]';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

// server/ is CommonJS (no "type": "module"), so depending on how a file is
// loaded its default export can arrive wrapped as { default: fn }. Unwrap it.
function h(mod: unknown): Handler {
  let m = mod as { default?: unknown } | undefined;
  while (m && typeof m !== 'function') m = m.default as typeof m;
  if (typeof m !== 'function') throw new Error('An /api handler module has no default export.');
  return m as unknown as Handler;
}

const FIXED: Record<string, Handler> = {
  '/api/auth/register': h(registerAccount),
  '/api/extract': h(extract),
  '/api/translate': h(translate),
  '/api/review/request': h(reviewRequest),
  '/api/issue/reserve': h(issueReserve),
  '/api/issue/complete': h(issueComplete),
  '/api/issue/revoke': h(issueRevoke),
  '/api/tts': h(tts),
};
const WITH_ID: Array<[RegExp, Handler]> = [
  [/^\/api\/verify\/([^/]+)$/, h(verify)],
  [/^\/api\/v1\/verify\/([^/]+)$/, h(partnerVerify)],
];

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  // Ignore a trailing slash and the /index.html(m) suffix the static-file
  // lookup can append to extensionless paths such as /api/verify/<id>.
  const pathname = url.pathname.replace(/\/index\.html?$/, '').replace(/\/+$/, '') || '/';
  const query: Record<string, string> = Object.fromEntries(url.searchParams);

  let handler = FIXED[pathname];
  if (!handler) {
    for (const [pattern, candidate] of WITH_ID) {
      const match = pattern.exec(pathname);
      if (match) {
        handler = candidate;
        query.id = decodeURIComponent(match[1]);
        break;
      }
    }
  }
  if (!handler) return json(404, { error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });

  let body: unknown;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await request.text();
    if (text.length > 0) {
      const isJson = (request.headers.get('content-type') ?? '').includes('application/json');
      try {
        body = isJson ? JSON.parse(text) : text;
      } catch {
        return json(400, { error: { code: 'BAD_REQUEST', message: 'The request body is not valid JSON.' } });
      }
    }
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const vreq = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    query,
    body,
    cookies: {},
  } as unknown as VercelRequest;

  let status = 200;
  let payload: string | Uint8Array | undefined;
  const outHeaders = new Headers();
  const vres = {
    status(code: number) {
      status = code;
      return vres;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      outHeaders.set(name, Array.isArray(value) ? value.join(', ') : String(value));
      return vres;
    },
    json(value: unknown) {
      if (!outHeaders.has('Content-Type')) outHeaders.set('Content-Type', 'application/json; charset=utf-8');
      payload = JSON.stringify(value);
      return vres;
    },
    send(value: unknown) {
      payload =
        typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value);
      return vres;
    },
    end(value?: string | Uint8Array) {
      if (value !== undefined) payload = value;
      return vres;
    },
  } as unknown as VercelResponse;

  await handler(vreq, vres);
  return new Response((payload ?? null) as BodyInit | null, { status, headers: outHeaders });
};

export const config = { path: '/api/*' };
