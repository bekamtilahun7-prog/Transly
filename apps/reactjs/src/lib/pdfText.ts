import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

/**
 * Font + text layout helpers for pdf-lib.
 * Noto Sans Ethiopic has no Latin glyphs we want to rely on, so text is split
 * into runs: Ethiopic characters use Noto Sans Ethiopic, everything else uses
 * Noto Sans. Both TTFs are served from /public/fonts.
 */

export interface PdfFonts {
  latin: PDFFont
  latinBold: PDFFont
  ethiopic: PDFFont
  ethiopicBold: PDFFont
}

const FONT_FILES = {
  latin: '/fonts/NotoSans-Regular.ttf',
  latinBold: '/fonts/NotoSans-Bold.ttf',
  ethiopic: '/fonts/NotoSansEthiopic-Regular.ttf',
  ethiopicBold: '/fonts/NotoSansEthiopic-Bold.ttf',
} as const

const fontBytesCache = new Map<string, Promise<ArrayBuffer>>()

function fetchFont(url: string): Promise<ArrayBuffer> {
  let p = fontBytesCache.get(url)
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Could not load font ${url} (HTTP ${r.status})`)
      return r.arrayBuffer()
    })
    p.catch(() => fontBytesCache.delete(url))
    fontBytesCache.set(url, p)
  }
  return p
}

export async function createPdfWithFonts(): Promise<{ pdf: PDFDocument; fonts: PdfFonts }> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [a, b, c, d] = await Promise.all([
    fetchFont(FONT_FILES.latin),
    fetchFont(FONT_FILES.latinBold),
    fetchFont(FONT_FILES.ethiopic),
    fetchFont(FONT_FILES.ethiopicBold),
  ])
  const fonts: PdfFonts = {
    latin: await pdf.embedFont(a, { subset: true }),
    latinBold: await pdf.embedFont(b, { subset: true }),
    ethiopic: await pdf.embedFont(c, { subset: true }),
    ethiopicBold: await pdf.embedFont(d, { subset: true }),
  }
  return { pdf, fonts }
}

export function isEthiopicChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (
    (cp >= 0x1200 && cp <= 0x139f) || // Ethiopic + Ethiopic Supplement
    (cp >= 0x2d80 && cp <= 0x2ddf) || // Ethiopic Extended
    (cp >= 0xab00 && cp <= 0xab2f) // Ethiopic Extended-A
  )
}

interface Run {
  text: string
  font: PDFFont
}

function splitRuns(text: string, fonts: PdfFonts, bold: boolean): Run[] {
  const eth = bold ? fonts.ethiopicBold : fonts.ethiopic
  const lat = bold ? fonts.latinBold : fonts.latin
  const runs: Run[] = []
  let current: Run | null = null
  for (const ch of text) {
    // whitespace follows whatever run it is in, to avoid tiny runs
    const font: PDFFont = /\s/.test(ch) && current ? current.font : isEthiopicChar(ch) ? eth : lat
    if (current && current.font === font) current.text += ch
    else {
      current = { text: ch, font }
      runs.push(current)
    }
  }
  return runs
}

export function measure(text: string, size: number, fonts: PdfFonts, bold = false): number {
  return splitRuns(text, fonts, bold).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0)
}

export interface DrawOpts {
  size: number
  bold?: boolean
  color?: RGB
}

/** Draw a single line (no wrapping). Returns the width drawn. */
export function drawLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fonts: PdfFonts,
  { size, bold = false, color = rgb(0.1, 0.1, 0.1) }: DrawOpts,
): number {
  let cx = x
  for (const run of splitRuns(text, fonts, bold)) {
    page.drawText(run.text, { x: cx, y, size, font: run.font, color })
    cx += run.font.widthOfTextAtSize(run.text, size)
  }
  return cx - x
}

/** Greedy word-wrap into lines no wider than maxWidth. Splits very long words by character. */
export function wrapText(text: string, maxWidth: number, size: number, fonts: PdfFonts, bold = false): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let line = ''
    const push = () => {
      out.push(line)
      line = ''
    }
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, size, fonts, bold) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) push()
      if (measure(word, size, fonts, bold) <= maxWidth) {
        line = word
        continue
      }
      // single word wider than the line: break by character
      for (const ch of word) {
        if (measure(line + ch, size, fonts, bold) > maxWidth && line) push()
        line += ch
      }
    }
    if (line) push()
  }
  return out
}

/** Dev/QA: one Amharic line + one English line, used to verify Ethiopic rendering. */
export async function buildFontTestPdf(): Promise<Uint8Array> {
  const { pdf, fonts } = await createPdfWithFonts()
  const page = pdf.addPage([595.28, 841.89])
  drawLine(page, 'Transly - Ethiopic font test', 50, 780, fonts, { size: 18, bold: true })
  drawLine(page, 'አማርኛ፡ ሰላም ልዑል፣ ይህ የትርጉም ሰነድ ሙከራ ነው።', 50, 740, fonts, { size: 16 })
  drawLine(page, 'English: Hello, this is a translation document test.', 50, 710, fonts, { size: 16 })
  drawLine(page, 'Mixed: Transly ትርጉም (Translation) 2026', 50, 680, fonts, { size: 16 })
  return pdf.save()
}
