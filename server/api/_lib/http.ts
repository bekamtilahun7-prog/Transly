// Request/response helpers shared by every handler: one error format, method
// check, JSON body access and small input validators.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiError, LangCode } from '../../../shared/contract';
import { GeminiError, describeAttempts } from './gemini';

export type ErrorCode = ApiError['error']['code'];

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_LANGUAGE: 422,
  RATE_LIMITED: 429,
  BAD_GATEWAY: 502,
  INTERNAL: 500,
};

/** Thrown anywhere in a handler; becomes `{ error: { code, message } }`. */
export class ApiFailure extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
    this.status = status ?? STATUS[code];
  }
}

/** Lets a handler answer with a non-200 status that is not an error (verify's not_found). */
export class Reply {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    this.status = status;
    this.body = body;
  }
}

function sendError(res: VercelResponse, code: ErrorCode, message: string, status = STATUS[code]): void {
  const body: ApiError = { error: { code, message } };
  res.status(status).json(body);
}

type Handler = (req: VercelRequest) => Promise<unknown>;

/** Wraps a handler: checks the method, sends the result as JSON, maps every error. */
export function route(method: 'GET' | 'POST', handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method !== method) {
        res.setHeader('Allow', method);
        throw new ApiFailure('BAD_REQUEST', `Use ${method} for this endpoint.`, 405);
      }
      const result = await handler(req);
      if (result instanceof Reply) res.status(result.status).json(result.body);
      else res.status(200).json(result);
    } catch (error) {
      if (error instanceof ApiFailure) {
        sendError(res, error.code, error.message, error.status);
      } else if (error instanceof GeminiError) {
        console.error(`[gemini] ${error.code}: ${describeAttempts(error.attempts)}`);
        sendError(res, error.code, error.message);
      } else {
        // Never send internals to the client; the log line carries no request data.
        const e = error as { name?: string; message?: string } | null;
        console.error(`[api] ${req.method} ${req.url?.split('?')[0]}: ${e?.name ?? 'Error'}: ${e?.message ?? 'unknown'}`);
        sendError(res, 'INTERNAL', 'Something went wrong on the server.');
      }
    }
  };
}

/** Logs a database/storage error and returns the INTERNAL failure to throw. */
export function internal(context: string, error: { code?: string; message?: string } | null): ApiFailure {
  console.error(`[db] ${context}: ${error?.code ?? ''} ${error?.message ?? 'unknown error'}`);
  return new ApiFailure('INTERNAL', 'Something went wrong on the server.');
}

/** The parsed JSON body as an object, or BAD_REQUEST. */
export function jsonBody(req: VercelRequest): Record<string, unknown> {
  let body: unknown;
  try {
    body = req.body; // Vercel parses lazily and throws on malformed JSON.
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    throw new ApiFailure('BAD_REQUEST', 'The request body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiFailure('BAD_REQUEST', 'Send a JSON object with Content-Type: application/json.');
  }
  return body as Record<string, unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERIFICATION_ID = /^[0-9a-f]{32}$/;
const LANGS: readonly string[] = ['om', 'am', 'en'];

export function uuidField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new ApiFailure('BAD_REQUEST', `${name} must be a document id (UUID).`);
  }
  return value.toLowerCase();
}

export function isVerificationId(value: unknown): value is string {
  return typeof value === 'string' && VERIFICATION_ID.test(value);
}

export function verificationIdField(body: Record<string, unknown>): string {
  const value = body.verificationId;
  if (!isVerificationId(value)) {
    throw new ApiFailure('BAD_REQUEST', 'verificationId must be 32 lowercase hex characters.');
  }
  return value;
}

export function isLang(value: unknown): value is LangCode {
  return typeof value === 'string' && LANGS.includes(value);
}

/** A language field: missing or not a string -> BAD_REQUEST, any other language -> UNSUPPORTED_LANGUAGE. */
export function langField(body: Record<string, unknown>, name: string): LangCode {
  const value = body[name];
  if (typeof value !== 'string' || value === '') {
    throw new ApiFailure('BAD_REQUEST', `${name} is required (om, am or en).`);
  }
  if (!isLang(value)) {
    throw new ApiFailure('UNSUPPORTED_LANGUAGE', 'Only Afaan Oromo (om), Amharic (am) and English (en) are supported.');
  }
  return value;
}
