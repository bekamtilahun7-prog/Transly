export class ApiError extends Error {
  status: number
  /** Backend error code from { error: { code, message } }, e.g. RATE_LIMITED. */
  code?: string
  constructor(message: string, status = 0, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export interface ErrorInfo {
  /** Clear text for the user. */
  message: string
  /** Raw server/technical detail, shown small. */
  detail?: string
  /** Show a Retry button. */
  retryable: boolean
  /** The user must sign in again. */
  needsLogin?: boolean
}

/**
 * Turn any error into a clear message. Handles the backend's
 * { error: { code, message } } with HTTP 401, 413, 422, 429 and 5xx.
 */
export function describeError(e: unknown): ErrorInfo {
  if (!(e instanceof ApiError)) return { message: errMsg(e), retryable: false }
  const { status, code } = e
  const detail = e.message
  if (code === 'RATE_LIMITED' || status === 429) {
    return { message: 'Too many requests right now. Please try again in a minute.', detail, retryable: true }
  }
  if (code === 'UNSUPPORTED_LANGUAGE') {
    return {
      message: 'This language or language pair is not supported. Go back and choose a different source or target language.',
      detail,
      retryable: false,
    }
  }
  if (code === 'PDF_TOO_LARGE') return { message: e.message, retryable: false }
  if (code === 'BUILD_FAILED') return { message: e.message, retryable: true }
  if (status === 401) {
    return { message: 'Your session has expired or you are not signed in. Please sign in again.', detail, retryable: false, needsLogin: true }
  }
  if (status === 413) {
    return {
      message: 'This is too large for the server. Use a smaller file (under 10 MB) or a shorter document.',
      detail,
      retryable: false,
    }
  }
  if (status === 422) {
    return { message: 'The server could not process this document.', detail, retryable: false }
  }
  if (status >= 500) {
    return { message: 'The server had a problem. It is not your fault. Please try again.', detail: code ? `${code}: ${detail}` : detail, retryable: true }
  }
  if (status === 0) {
    // network failure or a local (non-HTTP) error
    return { message: e.message, retryable: !!e.message.match(/reach the server|connection/i) }
  }
  return { message: e.message, retryable: false }
}
