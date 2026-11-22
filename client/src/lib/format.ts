import { getIssuedVerificationId } from './issue'
import type { DocumentRecord } from '../types'

/** File name shown to the user: the last path segment, without the upload timestamp prefix. */
export function fileNameOf(doc: Pick<DocumentRecord, 'storagePath'>): string {
  const last = doc.storagePath.split('/').pop() ?? doc.storagePath
  return last.replace(/^\d{10,}-/, '') || last
}

export type FileKindGuess = 'pdf' | 'image' | 'unknown'

export function fileKindOf(name: string): FileKindGuess {
  if (/\.pdf$/i.test(name)) return 'pdf'
  if (/\.(jpe?g|png)$/i.test(name)) return 'image'
  return 'unknown'
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

/** "Nov 20, 2025 • 2:30 PM" in the viewer's locale and time zone. */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${dateFmt.format(d)} • ${timeFmt.format(d)}`
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${Math.round(n / 1024)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

/** Two letters for the avatar, taken from the email's local part. */
export function initialsOf(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._\-+]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  return (letters || '?').toUpperCase()
}

/** Friendly name for greetings: the email's local part, first word capitalised. */
export function displayNameOf(email: string): string {
  const first = (email.split('@')[0] ?? '').split(/[._\-+\d]+/).filter(Boolean)[0] ?? ''
  return first ? first[0].toUpperCase() + first.slice(1) : 'there'
}

/** Where "open" takes the owner, based on how far the document has got. */
export function ownerPathFor(doc: Pick<DocumentRecord, 'id' | 'status'>): string {
  if (doc.status === 'uploaded' || doc.status === 'extracted') return `/documents/${doc.id}/review`
  if (doc.status === 'issued') {
    const vid = getIssuedVerificationId(doc.id)
    if (vid) return `/documents/issued/${vid}`
  }
  return `/documents/${doc.id}/translation`
}
