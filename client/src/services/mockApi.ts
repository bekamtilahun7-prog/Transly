import type { Api } from './api'
import { ApiError } from './errors'
import type { Block, DocumentRecord, Role, VerifyResponse } from '../types'
import { FREE_ALLOWANCE } from '../lib/pricingCatalog'
import { countsTowardFreeAllowance, hasVerifiedPaidAccess } from '../lib/subscription'

/**
 * MOCK backend (VITE_USE_MOCKS=true). Everything here is fake sample data kept in
 * localStorage so the UI can be built and demoed before the real API exists.
 *
 * Failure triggers: upload a file whose name contains "<kind>-<stage>", e.g.
 * "rate-extract.png". Stages: extract, translate, reserve, complete.
 * Kinds: fail (503, fails once), rate (429 RATE_LIMITED, fails once), down (500, always),
 * lang (422 UNSUPPORTED_LANGUAGE), auth (401), big (413), bad (422).
 * Verify triggers: id "revoked-demo" -> revoked, id "missing-demo" -> not_found.
 */

const FAILURES: Record<string, { status: number; code: string; msg: string; once?: boolean }> = {
  fail: { status: 503, code: 'INTERNAL', msg: 'Mock server failure', once: true },
  rate: { status: 429, code: 'RATE_LIMITED', msg: 'Mock rate limit', once: true },
  down: { status: 500, code: 'INTERNAL', msg: 'Mock server is down' },
  lang: { status: 422, code: 'UNSUPPORTED_LANGUAGE', msg: 'Mock unsupported language' },
  auth: { status: 401, code: 'UNAUTHORIZED', msg: 'Mock invalid token' },
  big: { status: 413, code: 'PAYLOAD_TOO_LARGE', msg: 'Mock payload too large' },
  bad: { status: 422, code: 'UNPROCESSABLE', msg: 'Mock: the document could not be processed' },
}
// key -> time of the first failure. Calls within 500 ms count as the same attempt (React StrictMode runs effects twice in dev).
const failedOnce = new Map<string, number>()

type Stage = 'extract' | 'translate' | 'reserve' | 'complete'
function maybeFail(doc: DocumentRecord | undefined, stage: Stage) {
  if (!doc) return
  for (const [kind, f] of Object.entries(FAILURES)) {
    if (!doc.storagePath.includes(`${kind}-${stage}`)) continue
    const key = `${doc.id}:${stage}:${kind}`
    if (f.once) {
      const first = failedOnce.get(key)
      if (first === undefined) failedOnce.set(key, Date.now())
      else if (Date.now() - first > 500) return // a later retry succeeds
    }
    throw new ApiError(f.msg, f.status, f.code)
  }
}

const KEY = 'transly.mock.db.v2'

interface IssuedRec {
  verificationId: string
  documentId: string
  issuerName: string
  reviewStatus: 'machine' | 'human_reviewed'
  isPublic: boolean
  status: 'reserved' | 'issued' | 'revoked'
  issuedAt?: string
  pdfDataUrl?: string
  sha256?: string
}
interface Db {
  docs: Record<string, DocumentRecord>
  issued: Record<string, IssuedRec>
}

const SAMPLE_AM: Block[] = [
  { id: 'b1', type: 'logo', text: '' },
  { id: 'b2', type: 'heading', text: 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ' },
  { id: 'b3', type: 'heading', text: 'የትምህርት ማስረጃ' },
  { id: 'b4', type: 'paragraph', text: 'ይህ ሰነድ አበበ ከበደ የተባሉ ተማሪ በ2015 ዓ.ም ትምህርታቸውን በሚገባ ማጠናቀቃቸውን ያረጋግጣል።' },
  { id: 'b5', type: 'table_row', text: 'የትምህርት ዓይነት | ውጤት' },
  { id: 'b6', type: 'table_row', text: 'ሒሳብ | 85' },
  { id: 'b7', type: 'table_row', text: 'እንግሊዝኛ | [unclear]' },
  { id: 'b8', type: 'list_item', text: 'ጠቅላላ አማካይ ውጤት: 3.4' },
  { id: 'b9', type: 'stamp', text: '' },
  { id: 'b10', type: 'signature', text: '' },
]

const SAMPLE_EN: Block[] = [
  { id: 'b1', type: 'logo', text: '' },
  { id: 'b2', type: 'heading', text: 'Federal Democratic Republic of Ethiopia' },
  { id: 'b3', type: 'heading', text: 'Education Certificate' },
  { id: 'b4', type: 'paragraph', text: 'This document confirms that the student Abebe Kebede completed their studies in 2023.' },
  { id: 'b5', type: 'table_row', text: 'Subject | Result' },
  { id: 'b6', type: 'table_row', text: 'Mathematics | 85' },
  { id: 'b7', type: 'table_row', text: 'English | [unclear]' },
  { id: 'b8', type: 'list_item', text: 'Cumulative average: 3.4' },
  { id: 'b9', type: 'stamp', text: '' },
  { id: 'b10', type: 'signature', text: '' },
]

const SAMPLE_EN_TRANSLATED: Block[] = [
  { id: 'b1', type: 'logo', text: '' },
  { id: 'b2', type: 'heading', text: '[MOCK] Federal Democratic Republic of Ethiopia' },
  { id: 'b3', type: 'heading', text: '[MOCK] Education Certificate' },
  { id: 'b4', type: 'paragraph', text: '[MOCK] This document confirms that the student Abebe Kebede completed their studies in 2023.' },
  { id: 'b5', type: 'table_row', text: '[MOCK] Subject | Result' },
  { id: 'b6', type: 'table_row', text: '[MOCK] Mathematics | 85' },
  { id: 'b7', type: 'table_row', text: '[MOCK] English | [unclear]' },
  { id: 'b8', type: 'list_item', text: '[MOCK] Cumulative average: 3.4' },
  { id: 'b9', type: 'stamp', text: '' },
  { id: 'b10', type: 'signature', text: '' },
]

function load(): Db {
  let db: Db | null = null
  try {
    db = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Db | null
  } catch {
    db = null
  }
  if (!db) {
    db = { docs: {}, issued: {} }
    // Seed a few fake documents at different stages so the lists and the translator queue are not empty.
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
    const seed = (d: Omit<DocumentRecord, 'ownerId'>) => {
      db!.docs[d.id] = { ...d, ownerId: 'mock-customer' }
    }
    seed({
      id: 'mock-seed-1',
      storagePath: 'mock-customer/seed-certificate.pdf',
      sourceLang: 'am',
      targetLang: 'en',
      docType: 'academic',
      status: 'in_review',
      blocksOriginal: SAMPLE_AM,
      blocksTranslated: SAMPLE_EN_TRANSLATED,
      createdAt: daysAgo(0),
    })
    seed({
      id: 'mock-seed-2',
      storagePath: 'mock-customer/seed-contract.pdf',
      sourceLang: 'am',
      targetLang: 'en',
      docType: 'legal',
      status: 'translated',
      blocksOriginal: SAMPLE_AM,
      blocksTranslated: SAMPLE_EN_TRANSLATED,
      createdAt: daysAgo(1),
    })
    seed({
      id: 'mock-seed-3',
      storagePath: 'mock-customer/seed-id-card.jpg',
      sourceLang: 'en',
      targetLang: 'am',
      docType: 'id_certificate',
      status: 'extracted',
      blocksOriginal: SAMPLE_EN,
      blocksTranslated: null,
      createdAt: daysAgo(2),
    })
    seed({
      id: 'mock-seed-4',
      storagePath: 'mock-customer/seed-letter.png',
      sourceLang: 'am',
      targetLang: 'om',
      docType: 'other',
      status: 'uploaded',
      blocksOriginal: null,
      blocksTranslated: null,
      createdAt: daysAgo(3),
    })
    save(db)
  }
  return db
}
function save(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}
const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms))
const hex = (n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('')

export function mockCurrentUserId(): string {
  try {
    return (JSON.parse(localStorage.getItem('transly.mock.user') ?? 'null') as { id: string } | null)?.id ?? 'mock-customer'
  } catch {
    return 'mock-customer'
  }
}

const fileUrls = new Map<string, string>()

function countableOwned(db: Db, ownerId: string): DocumentRecord[] {
  return Object.values(db.docs).filter((d) => d.ownerId === ownerId && countsTowardFreeAllowance(d.id))
}

function assertFreeUpload(db: Db, ownerId: string) {
  if (hasVerifiedPaidAccess()) return
  if (countableOwned(db, ownerId).length >= FREE_ALLOWANCE.editFiles) {
    throw new ApiError(
      `Free plan allows editing up to ${FREE_ALLOWANCE.editFiles} files. Choose a paid plan when checkout is available to add more.`,
      403,
      'FORBIDDEN',
    )
  }
}

function assertFreeEdit(db: Db, ownerId: string, documentId: string) {
  if (hasVerifiedPaidAccess() || !countsTowardFreeAllowance(documentId)) return
  const ids = countableOwned(db, ownerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((d) => d.id)
  if (ids.indexOf(documentId) >= FREE_ALLOWANCE.editFiles) {
    throw new ApiError(
      `Free plan allows editing up to ${FREE_ALLOWANCE.editFiles} files. This file is outside that allowance.`,
      403,
      'FORBIDDEN',
    )
  }
}

export const mockApi: Api = {
  async uploadDocument({ file, sourceLang, targetLang, docType }) {
    await wait(500)
    const db = load()
    assertFreeUpload(db, mockCurrentUserId())
    const id = `mock-${hex(6)}`
    const doc: DocumentRecord = {
      id,
      ownerId: mockCurrentUserId(),
      storagePath: `${mockCurrentUserId()}/${file.name}`,
      sourceLang,
      targetLang,
      docType,
      status: 'uploaded',
      blocksOriginal: null,
      blocksTranslated: null,
      createdAt: new Date().toISOString(),
    }
    db.docs[id] = doc
    save(db)
    fileUrls.set(id, URL.createObjectURL(file))
    return doc
  },

  async getDocument(id) {
    await wait(150)
    const d = load().docs[id]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    return d
  },

  async getSourceFileUrl(doc) {
    return fileUrls.get(doc.id) ?? null
  },

  async listMyDocuments() {
    await wait(200)
    return Object.values(load().docs)
      .filter((d) => d.ownerId === mockCurrentUserId())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async listReviewQueue() {
    await wait(300)
    return Object.values(load().docs).filter((d) => d.status === 'in_review')
  },

  async getMyRole(): Promise<Role> {
    try {
      return (JSON.parse(localStorage.getItem('transly.mock.user') ?? 'null') as { role: Role } | null)?.role ?? 'customer'
    } catch {
      return 'customer'
    }
  },

  async saveTranslatedBlocks(documentId, blocks) {
    await wait(300)
    const db = load()
    const d = db.docs[documentId]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    if (d.status === 'issued') throw new ApiError('An issued document can no longer be edited (mock).', 403, 'FORBIDDEN')
    assertFreeEdit(db, mockCurrentUserId(), documentId)
    d.blocksTranslated = blocks
    save(db)
  },

  async extract(documentId, sourceLanguage) {
    await wait(1200)
    const db = load()
    const d = db.docs[documentId]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    maybeFail(d, 'extract')
    const lang = sourceLanguage ?? d.sourceLang
    const blocks = lang === 'en' ? SAMPLE_EN : SAMPLE_AM
    d.blocksOriginal = blocks
    d.status = 'extracted'
    save(db)
    return { detectedLanguage: lang, documentType: d.docType ?? 'academic', blocks }
  },

  async translate({ documentId, blocks }) {
    await wait(1400)
    const db = load()
    const d = db.docs[documentId]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    maybeFail(d, 'translate')
    const out: Block[] = blocks.map((b) =>
      ['stamp', 'signature', 'logo', 'handwriting'].includes(b.type) || !b.text.trim()
        ? { ...b }
        : { ...b, text: `[MOCK] ${b.text}` },
    )
    d.blocksOriginal = blocks
    d.blocksTranslated = out
    d.status = 'translated'
    save(db)
    return { blocks: out }
  },

  async requestHumanReview(documentId) {
    await wait(500)
    const db = load()
    const d = db.docs[documentId]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    if (d.ownerId !== mockCurrentUserId()) throw new ApiError('Only the owner can request a review (mock).', 403, 'FORBIDDEN')
    if (!d.blocksTranslated) throw new ApiError('Translate the document before requesting a review (mock).', 422, 'NOT_TRANSLATED')
    // Like the real endpoint (body is only { documentId }): only the status changes. Edits reach the
    // translator only if they were saved first with saveTranslatedBlocks.
    d.status = 'in_review'
    save(db)
    return { status: 'in_review' }
  },

  async revokeDocument(verificationId) {
    await wait(500)
    const db = load()
    const rec = db.issued[verificationId]
    if (!rec || rec.status === 'reserved') throw new ApiError('No issued document with this verification ID (mock).', 404, 'NOT_FOUND')
    const d = db.docs[rec.documentId]
    if (!d || d.ownerId !== mockCurrentUserId()) {
      throw new ApiError('Only the owner of the document can revoke it (mock).', 403, 'FORBIDDEN')
    }
    if (rec.status === 'revoked') throw new ApiError('This document is already revoked (mock).', 409, 'ALREADY_REVOKED')
    rec.status = 'revoked'
    save(db)
    return { result: 'revoked' }
  },

  async reserveIssue(p) {
    await wait(400)
    const db = load()
    const d = db.docs[p.documentId]
    if (!d) throw new ApiError('Document not found (mock).', 404)
    maybeFail(d, 'reserve')
    const verificationId = hex(16)
    db.issued[verificationId] = {
      verificationId,
      documentId: p.documentId,
      issuerName: p.issuerName,
      reviewStatus: p.reviewStatus,
      isPublic: p.isPublic,
      status: 'reserved',
    }
    save(db)
    return { verificationId }
  },

  async completeIssue({ verificationId, pdfBase64 }) {
    await wait(500)
    const db = load()
    const rec = db.issued[verificationId]
    if (!rec) throw new ApiError('Unknown verification id (mock).', 404)
    maybeFail(db.docs[rec.documentId], 'complete')
    if (pdfBase64.length > 4_500_000) throw new ApiError('Mock: request body too large (Vercel limit ~4.5 MB).', 413, 'PAYLOAD_TOO_LARGE')
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    rec.sha256 = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
    rec.status = 'issued'
    rec.issuedAt = new Date().toISOString()
    if (rec.isPublic && pdfBase64.length < 2_500_000) rec.pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`
    const d = db.docs[rec.documentId]
    if (d) d.status = 'issued'
    save(db)
    return { status: 'issued', sha256: rec.sha256 }
  },

  async verify(verificationId): Promise<VerifyResponse> {
    await wait(400)
    // Demo triggers so the Revoked / Not found screens can be shown without issuing anything.
    if (verificationId === 'revoked-demo') {
      return {
        result: 'revoked',
        issuerName: 'Demo Issuer (mock)',
        issuedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        sourceLanguage: 'am',
        targetLanguage: 'en',
        documentType: 'academic',
        reviewStatus: 'machine',
        isPublic: false,
      }
    }
    if (verificationId === 'missing-demo') return { result: 'not_found' }
    const db = load()
    const rec = db.issued[verificationId]
    if (!rec || rec.status === 'reserved') return { result: 'not_found' }
    const d = db.docs[rec.documentId]
    return {
      result: rec.status === 'revoked' ? 'revoked' : 'valid',
      issuerName: rec.issuerName,
      issuedAt: rec.issuedAt,
      sourceLanguage: d?.sourceLang,
      targetLanguage: d?.targetLang,
      documentType: d?.docType ?? undefined,
      reviewStatus: rec.reviewStatus,
      isPublic: rec.isPublic,
      pdfUrl: rec.isPublic ? rec.pdfDataUrl : undefined,
    }
  },
}
