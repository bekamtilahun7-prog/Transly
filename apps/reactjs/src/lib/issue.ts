import { api } from '../services/api'
import { ApiError } from '../services/errors'
import type { Block, DocType, LangCode, ReviewStatus } from '../types'

export type IssueStage = 'reserve' | 'build' | 'complete'

/** Vercel limits the request body; the base64 PDF sent to /api/issue/complete must stay under about 3 MB. */
export const MAX_PDF_BASE64_CHARS = 3_000_000

export class IssueError extends Error {
  stage: IssueStage
  /** Set once reserve succeeded, so a retry doesn't create a second record. */
  verificationId?: string
  /** The original error (e.g. ApiError with status/code), used for a clear user message. */
  cause?: unknown
  constructor(stage: IssueStage, message: string, verificationId?: string, cause?: unknown) {
    super(message)
    this.cause = cause
    this.name = 'IssueError'
    this.stage = stage
    this.verificationId = verificationId
  }
}

export interface IssueParams {
  documentId: string
  blocks: Block[]
  sourceLang: LangCode
  targetLang: LangCode
  docType?: DocType | null
  issuerName: string
  issuerPhone?: string
  reviewStatus: ReviewStatus
  isPublic: boolean
  /** Pass the id from a previous IssueError to skip reserve on retry. */
  resumeVerificationId?: string
  /** Override MAX_PDF_BASE64_CHARS (used for testing the size guard). */
  maxBase64Chars?: number
}

export interface IssueResult {
  verificationId: string
  sha256: string
  pdf: Uint8Array
  issuerName: string
  isPublic: boolean
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** reserve -> build PDF (with QR for that id) -> complete with the exact PDF bytes. */
export async function issueDocument(p: IssueParams, onStage?: (s: IssueStage) => void): Promise<IssueResult> {
  // Fail before reserving anything if the issuer name is empty.
  if (!p.issuerName.trim()) throw new IssueError('build', 'Issuer name is required.')
  let verificationId = p.resumeVerificationId
  if (!verificationId) {
    onStage?.('reserve')
    try {
      const r = await api.reserveIssue({
        documentId: p.documentId,
        issuerName: p.issuerName,
        issuerPhone: p.issuerPhone || undefined,
        reviewStatus: p.reviewStatus,
        isPublic: p.isPublic,
      })
      verificationId = r.verificationId
    } catch (e) {
      throw new IssueError('reserve', msg(e), undefined, e)
    }
  }

  onStage?.('build')
  let built: Awaited<ReturnType<typeof import('./buildPdf').buildTranslationPdf>>
  try {
    const { buildTranslationPdf } = await import('./buildPdf') // heavy (pdf-lib, fonts, qrcode): load on demand
    built = await buildTranslationPdf({
      documentId: p.documentId,
      verificationId,
      blocks: p.blocks,
      sourceLang: p.sourceLang,
      targetLang: p.targetLang,
      docType: p.docType,
      issuerName: p.issuerName,
      issuerPhone: p.issuerPhone || undefined,
      reviewStatus: p.reviewStatus,
    })
  } catch (e) {
    const m = `Could not create the PDF: ${msg(e)}`
    throw new IssueError('build', m, verificationId, new ApiError(m, 0, 'BUILD_FAILED'))
  }

  // Check the size before sending: fail with a clear message instead of a server error.
  const limit = p.maxBase64Chars ?? MAX_PDF_BASE64_CHARS
  if (built.base64.length > limit) {
    const m = `The PDF is too large to upload (${(built.base64.length / 1e6).toFixed(2)} MB, the limit is ${(limit / 1e6).toFixed(2)} MB). Shorten the document or split it into smaller parts.`
    throw new IssueError('build', m, verificationId, new ApiError(m, 0, 'PDF_TOO_LARGE'))
  }

  onStage?.('complete')
  try {
    const done = await api.completeIssue({ verificationId, pdfBase64: built.base64 })
    return { verificationId, sha256: done.sha256, pdf: built.bytes, issuerName: p.issuerName, isPublic: p.isPublic }
  } catch (e) {
    throw new IssueError('complete', msg(e), verificationId, e)
  }
}

// Issued PDFs are kept in memory so the "done" page can offer download/print.
// (Not persisted: after a reload, a public PDF is re-fetched via the verify API's pdfUrl.)
const issuedPdfs = new Map<string, { pdf: Uint8Array; documentId: string }>()
const MAP_KEY = 'transly.issuedDocs'

function readMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

/** Remember which document a verification id belongs to (ids only, no content), so the issued page survives a reload. */
export function rememberIssued(verificationId: string, pdf: Uint8Array, documentId: string) {
  issuedPdfs.set(verificationId, { pdf, documentId })
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify({ ...readMap(), [verificationId]: documentId }))
  } catch {
    /* storage unavailable: revoke button just won't be offered after a reload */
  }
}
export const getIssued = (verificationId: string) => issuedPdfs.get(verificationId)
/** Reverse lookup (this device only): the verification id of an issued document, if this browser issued it. */
export function getIssuedVerificationId(documentId: string): string | undefined {
  const entries = Object.entries(readMap()).filter(([, d]) => d === documentId)
  return entries.length ? entries[entries.length - 1][0] : undefined
}
export const getIssuedDocumentId = (verificationId: string): string | undefined =>
  issuedPdfs.get(verificationId)?.documentId ?? readMap()[verificationId]
