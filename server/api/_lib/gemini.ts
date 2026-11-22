// Gemini client: JSON mode, temperature 0, primary model with one fallback.
//
// GEMINI_MODEL is tried first. If it answers 429 or 503 (or 500/504), times
// out, or cannot be reached, GEMINI_FALLBACK_MODEL is tried once (with no
// fallback configured, the primary is retried once after a short pause). If
// that also fails the caller gets a GeminiError with code RATE_LIMITED (a 429
// was seen) or BAD_GATEWAY. Error messages never contain the API key.

import { GoogleGenAI } from '@google/genai';

export type GeminiErrorCode = 'RATE_LIMITED' | 'BAD_GATEWAY';

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly attempts: GeminiAttempt[];
  constructor(code: GeminiErrorCode, message: string, attempts: GeminiAttempt[]) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.attempts = attempts;
  }
}

export interface GeminiFile {
  mimeType: string;
  data: Buffer;
}

export interface GenerateJsonOptions {
  /** Instruction text. */
  prompt: string;
  /** Optional image or PDF, sent before the prompt. */
  file?: GeminiFile;
  /** Optional extra text part (for example the JSON to translate). */
  input?: string;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /**
   * Epoch ms by which the whole call must be over. Attempts are shortened to
   * fit and skipped when less than MIN_ATTEMPT_MS is left.
   */
  deadlineAt?: number;
  /** Overrides the default thinking configuration (used by the test script). */
  thinkingConfig?: Record<string, unknown>;
}

export interface GeminiAttempt {
  model: string;
  ms: number;
  outcome: 'ok' | 'timeout' | `http ${number}` | 'error';
  /** Short reason for an 'error' outcome, for logs only. */
  detail?: string;
}

export interface GenerateJsonResult {
  /** Raw model output; the caller parses and validates it. */
  text: string;
  model: string;
  attempts: GeminiAttempt[];
}

// Measured extract calls take 55-80 s, so 80 s was too tight. Two attempts at
// 120 s stay under the 300 s Vercel function limit.
const DEFAULT_TIMEOUT_MS = 120_000;
const RETRY_PAUSE_MS = 2_000;
const MIN_ATTEMPT_MS = 5_000;
// 429 and 503 are the documented overload answers; 500 and 504 are transient too.
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

function isTimeout(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return e?.name === 'AbortError' || e?.name === 'TimeoutError' || /aborted|timed? ?out/i.test(e?.message ?? '');
}

/** Short, key-free description of an unexpected error, for logs. */
function detailOf(error: unknown): string {
  const e = error as { name?: string; message?: string } | null;
  let text = `${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`.replace(/\s+/g, ' ');
  const key = process.env.GEMINI_API_KEY;
  if (key) text = text.split(key).join('***');
  return text.slice(0, 160);
}

async function attempt(ai: GoogleGenAI, model: string, options: GenerateJsonOptions, timeoutMs: number): Promise<string> {
  const parts: Array<Record<string, unknown>> = [];
  if (options.file) {
    parts.push({ inlineData: { mimeType: options.file.mimeType, data: options.file.data.toString('base64') } });
  }
  parts.push({ text: options.prompt });
  if (options.input !== undefined) parts.push({ text: options.input });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      ...(options.thinkingConfig ? { thinkingConfig: options.thinkingConfig } : {}),
      httpOptions: { timeout: timeoutMs },
    },
  });
  const text = response.text;
  if (!text) throw new Error('The model returned an empty response');
  return text;
}

export async function generateJson(options: GenerateJsonOptions): Promise<GenerateJsonResult> {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  const primary = requireEnv('GEMINI_MODEL');
  const fallback = process.env.GEMINI_FALLBACK_MODEL;
  const second = fallback && fallback !== primary ? fallback : primary;

  const attempts: GeminiAttempt[] = [];
  let sawRateLimit = false;

  for (const model of [primary, second]) {
    if (attempts.length === 1 && second === primary) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS));
    }
    let timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (options.deadlineAt !== undefined) {
      const left = options.deadlineAt - Date.now();
      if (left < MIN_ATTEMPT_MS) break;
      timeoutMs = Math.min(timeoutMs, left);
    }
    const started = Date.now();
    try {
      const text = await attempt(ai, model, options, timeoutMs);
      attempts.push({ model, ms: Date.now() - started, outcome: 'ok' });
      return { text, model, attempts };
    } catch (error) {
      const ms = Date.now() - started;
      const status = statusOf(error);
      const timedOut = status === undefined && isTimeout(error);
      if (timedOut) attempts.push({ model, ms, outcome: 'timeout' });
      else if (status) attempts.push({ model, ms, outcome: `http ${status}` });
      else attempts.push({ model, ms, outcome: 'error', detail: detailOf(error) });
      if (status === 429) sawRateLimit = true;
      // Errors without an HTTP status (empty answer, dropped connection) are
      // worth one more try. Other HTTP errors are not: a bad request, a bad
      // key or an unknown model will fail the same way again.
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable) {
        throw new GeminiError('BAD_GATEWAY', `The AI service rejected the request (HTTP ${status}).`, attempts);
      }
    }
  }

  if (sawRateLimit) {
    throw new GeminiError('RATE_LIMITED', 'The AI service is rate limited right now. Try again in a minute.', attempts);
  }
  throw new GeminiError('BAD_GATEWAY', 'The AI service is busy or did not answer in time. Try again in a minute.', attempts);
}

/** Summary for logs, for example "gemini-x: http 503 (5120 ms), gemini-y: ok (20110 ms)". */
export function describeAttempts(attempts: GeminiAttempt[]): string {
  return attempts.map((a) => `${a.model}: ${a.outcome}${a.detail ? ` "${a.detail}"` : ''} (${a.ms} ms)`).join(', ');
}
