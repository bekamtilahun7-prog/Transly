import { MAX_FILE_BYTES } from './constants'

export type FileKind = 'pdf' | 'jpg' | 'png'

export interface FileCheck {
  ok: boolean
  error?: string
  kind?: FileKind
}

/** Detect the real type from the first bytes, not just the extension/MIME the browser reports. */
async function sniff(file: File): Promise<FileKind | null> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf' // %PDF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  return null
}

export async function validateFile(file: File): Promise<FileCheck> {
  if (file.size === 0) return { ok: false, error: 'This file is empty.' }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `This file is ${(file.size / 1048576).toFixed(1)} MB. The maximum is ${MAX_FILE_BYTES / 1048576} MB.` }
  }
  const kind = await sniff(file)
  if (!kind) {
    return {
      ok: false,
      error: 'Unsupported file. Please upload a JPG, PNG or PDF. (Other formats such as HEIC, WEBP or Word files are not supported.)',
    }
  }
  return { ok: true, kind }
}
