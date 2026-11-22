import { rgb, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import { NON_TEXT_PLACEHOLDER, langLabel, docTypeLabel } from './constants'
import { verifyUrl } from './links'
import { createPdfWithFonts, drawLine, measure, wrapText, type PdfFonts } from './pdfText'
import type { Block, DocType, LangCode, ReviewStatus } from '../types'

export interface BuildPdfInput {
  documentId: string
  verificationId: string
  blocks: Block[] // translated blocks, in original order
  sourceLang: LangCode
  targetLang: LangCode
  docType?: DocType | null
  issuerName: string
  issuerPhone?: string
  reviewStatus: ReviewStatus
  /** Used for the date and, for human review, the "reviewed on" date. */
  date?: Date
  /** Origin used in the QR code, defaults to this site. */
  origin?: string
}

const A4: [number, number] = [595.28, 841.89]
const M = 48 // margin
const FOOTER_H = 104
const CONTENT_BOTTOM = FOOTER_H + 8
const CONTENT_W = A4[0] - 2 * M
const INK = rgb(0.1, 0.1, 0.12)
const MUTED = rgb(0.4, 0.42, 0.45)
const LINE = rgb(0.8, 0.82, 0.85)

/** YYYY-MM-DD in the user's local time zone (UTC would show yesterday's date after 00:00 in Ethiopia). */
export function formatDate(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new Error('Invalid date for the PDF.')
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * The review label printed at the end of the PDF. Never built from empty parts:
 * throws instead of producing "Human reviewed by , ".
 */
export function reviewLabel(status: ReviewStatus, reviewer: string, date: Date): string {
  if (status === 'machine') return 'Machine translated, not human reviewed'
  if (status === 'human_reviewed') {
    const name = (reviewer ?? '').trim()
    if (!name) throw new Error('Cannot create a human-reviewed PDF without the reviewer name.')
    return `Human reviewed by ${name}, ${formatDate(date)}`
  }
  throw new Error(`Unknown review status: ${String(status)}`)
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

export async function buildTranslationPdf(input: BuildPdfInput): Promise<{ bytes: Uint8Array; base64: string; pages: number }> {
  const date = input.date ?? new Date()
  // Validate everything printed in the PDF up front: fail loudly, never print blanks.
  const issuerName = (input.issuerName ?? '').trim()
  if (!issuerName) throw new Error('Issuer name is required to create the PDF.')
  if (!input.documentId?.trim()) throw new Error('Document ID is missing.')
  if (!input.verificationId?.trim()) throw new Error('Verification ID is missing.')
  const label = reviewLabel(input.reviewStatus, issuerName, date) // throws on empty name/date
  formatDate(date)
  input = { ...input, issuerName }
  const url = verifyUrl(input.verificationId, input.origin)
  const { pdf, fonts } = await createPdfWithFonts()
  pdf.setTitle(`Transly translation ${input.documentId}`)
  pdf.setProducer('Transly')
  pdf.setCreator('Transly')
  pdf.setCreationDate(date)

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 300, errorCorrectionLevel: 'M' })
  const qrImage = await pdf.embedPng(qrDataUrl)

  let page: PDFPage = pdf.addPage(A4)
  let y = A4[1] - M

  const newPage = () => {
    page = pdf.addPage(A4)
    y = A4[1] - M
  }
  const ensure = (h: number) => {
    if (y - h < CONTENT_BOTTOM) newPage()
  }

  // ---------- header ----------
  drawLine(page, 'Translated document', M, y - 18, fonts, { size: 20, bold: true, color: INK })
  y -= 30
  const pair = `${langLabel(input.sourceLang)} to ${langLabel(input.targetLang)}`
  const meta: [string, string][] = [
    ['Language pair', `${pair} (${input.sourceLang} to ${input.targetLang})`],
    ['Document type', docTypeLabel(input.docType ?? null)],
    ['Date', formatDate(date)],
    ['Document ID', input.documentId],
    ['Issuer', input.issuerName + (input.issuerPhone ? `, ${input.issuerPhone}` : '')],
  ]
  const metaLineH = 15
  const boxH = meta.length * metaLineH + 12
  page.drawRectangle({ x: M, y: y - boxH, width: CONTENT_W, height: boxH, borderColor: LINE, borderWidth: 1, color: rgb(0.97, 0.98, 0.98) })
  let my = y - 17
  for (const [k, v] of meta) {
    drawLine(page, `${k}:`, M + 8, my, fonts, { size: 9.5, bold: true, color: MUTED })
    const lines = wrapText(v, CONTENT_W - 110, 9.5, fonts)
    drawLine(page, lines[0] ?? '', M + 100, my, fonts, { size: 9.5, color: INK })
    my -= metaLineH
  }
  y -= boxH + 18

  // ---------- body, same order as the original ----------
  for (const b of input.blocks) {
    switch (b.type) {
      case 'heading': {
        const lines = wrapText(b.text, CONTENT_W, 14, fonts, true)
        y -= 6
        for (const l of lines) {
          ensure(20)
          drawLine(page, l, M, y - 14, fonts, { size: 14, bold: true, color: INK })
          y -= 20
        }
        y -= 2
        break
      }
      case 'paragraph': {
        for (const l of wrapText(b.text, CONTENT_W, 11, fonts)) {
          ensure(16)
          drawLine(page, l, M, y - 11, fonts, { size: 11, color: INK })
          y -= 16
        }
        y -= 6
        break
      }
      case 'list_item': {
        const lines = wrapText(b.text, CONTENT_W - 16, 11, fonts)
        lines.forEach((l, i) => {
          ensure(16)
          if (i === 0) drawLine(page, '•', M + 4, y - 11, fonts, { size: 11, color: INK })
          drawLine(page, l, M + 16, y - 11, fonts, { size: 11, color: INK })
          y -= 16
        })
        y -= 3
        break
      }
      case 'table_row': {
        const cells = b.text.split(/\s*\|\s*|\t+/).map((c) => c.trim())
        const colW = CONTENT_W / cells.length
        const wrapped = cells.map((c) => wrapText(c, colW - 12, 10.5, fonts))
        const rows = Math.max(...wrapped.map((w) => w.length), 1)
        const h = rows * 14 + 10
        ensure(h)
        wrapped.forEach((lines, ci) => {
          const x = M + ci * colW
          page.drawRectangle({ x, y: y - h, width: colW, height: h, borderColor: LINE, borderWidth: 0.8 })
          lines.forEach((l, li) => drawLine(page, l, x + 6, y - 15 - li * 14, fonts, { size: 10.5, color: INK }))
        })
        y -= h
        break
      }
      case 'stamp':
      case 'signature':
      case 'logo':
      case 'handwriting': {
        // Never fake a stamp/signature/logo: only say that one existed in the original.
        const label = NON_TEXT_PLACEHOLDER[b.type]
        const extra = b.type === 'handwriting' && b.text.trim() ? wrapText(b.text, CONTENT_W - 16, 10, fonts) : []
        const h = 22 + extra.length * 14
        ensure(h + 6)
        page.drawRectangle({ x: M, y: y - h, width: CONTENT_W, height: h, borderColor: LINE, borderWidth: 0.8, borderDashArray: [3, 3] })
        drawLine(page, label, M + 8, y - 15, fonts, { size: 10, color: MUTED })
        extra.forEach((l, i) => drawLine(page, l, M + 8, y - 29 - i * 14, fonts, { size: 10, color: INK }))
        y -= h + 8
        break
      }
    }
  }

  // ---------- review label at the end ----------
  const labelLines = wrapText(label, CONTENT_W - 20, 11, fonts, true)
  const lh = 18 + labelLines.length * 15
  y -= 8
  ensure(lh)
  const human = input.reviewStatus === 'human_reviewed'
  page.drawRectangle({
    x: M,
    y: y - lh,
    width: CONTENT_W,
    height: lh,
    borderColor: human ? rgb(0.06, 0.48, 0.31) : rgb(0.75, 0.5, 0.05),
    borderWidth: 1.2,
    color: human ? rgb(0.93, 0.99, 0.96) : rgb(1, 0.97, 0.9),
  })
  labelLines.forEach((l, i) => drawLine(page, l, M + 10, y - 20 - i * 15, fonts, { size: 11, bold: true, color: INK }))

  // ---------- footer with QR on every page ----------
  const pages = pdf.getPages()
  pages.forEach((p, i) => drawFooter(p, fonts, qrImage, url, input.verificationId, i + 1, pages.length))

  const bytes = await pdf.save()
  return { bytes, base64: bytesToBase64(bytes), pages: pages.length }
}

function drawFooter(
  p: PDFPage,
  fonts: PdfFonts,
  qr: Awaited<ReturnType<import('pdf-lib').PDFDocument['embedPng']>>,
  url: string,
  verificationId: string,
  n: number,
  total: number,
) {
  const top = FOOTER_H - 6
  p.drawLine({ start: { x: M, y: top }, end: { x: A4[0] - M, y: top }, thickness: 0.8, color: LINE })
  const qrSize = 78
  p.drawImage(qr, { x: M, y: top - qrSize - 8, width: qrSize, height: qrSize })
  const tx = M + qrSize + 14
  const w = A4[0] - M - tx
  drawLine(p, 'Verify this document online', tx, top - 22, fonts, { size: 10.5, bold: true, color: INK })
  drawLine(p, 'Scan the QR code or open:', tx, top - 36, fonts, { size: 8.5, color: MUTED })
  wrapText(url, w, 8.5, fonts).forEach((l, i) => drawLine(p, l, tx, top - 49 - i * 11, fonts, { size: 8.5, color: INK }))
  const idLine = `Verification ID: ${verificationId}`
  wrapText(idLine, w, 7.5, fonts).forEach((l, i) => drawLine(p, l, tx, top - 66 - i * 10, fonts, { size: 7.5, color: MUTED }))
  const pg = `Page ${n} of ${total}`
  drawLine(p, pg, A4[0] - M - measure(pg, 8.5, fonts), 18, fonts, { size: 8.5, color: MUTED })
  drawLine(p, 'Issued with Transly', M, 18, fonts, { size: 8.5, color: MUTED })
}
