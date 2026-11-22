import type { Role } from '../types'

const ACCOUNTS_KEY = 'transly.mock.accounts.v1'
const OTP_KEY = 'transly.mock.otp.v1'
const PENDING_KEY = 'transly.mock.pending.v1'
const RESET_OK_KEY = 'transly.mock.reset-ok.v1'

export type OtpPurpose = 'signup' | 'reset'

export interface MockAccount {
  email: string
  password: string
  name: string
  role: Role
}

export interface OtpRecord {
  email: string
  code: string
  purpose: OtpPurpose
  expiresAt: number
}

function readLocal<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

function readSession<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

function norm(email: string) {
  return email.trim().toLowerCase()
}

function roleFor(email: string): Role {
  return email.includes('translator') ? 'translator' : 'customer'
}

export function listAccounts(): Record<string, MockAccount> {
  return readLocal<Record<string, MockAccount>>(ACCOUNTS_KEY) ?? {}
}

export function getAccount(email: string): MockAccount | null {
  return listAccounts()[norm(email)] ?? null
}

export function upsertAccount(account: MockAccount) {
  const all = listAccounts()
  const email = norm(account.email)
  all[email] = { ...account, email, role: account.role || roleFor(email) }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
}

export function verifyPassword(email: string, password: string): 'ok' | 'wrong' | 'missing' {
  const acc = getAccount(email)
  if (!acc) return 'missing'
  return acc.password === password ? 'ok' : 'wrong'
}

export function setPendingSignup(data: { email: string; password: string; name: string }) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...data, email: norm(data.email) }))
}

export function getPendingSignup(): { email: string; password: string; name: string } | null {
  return readSession(PENDING_KEY)
}

export function clearPendingSignup() {
  sessionStorage.removeItem(PENDING_KEY)
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function issueOtp(email: string, purpose: OtpPurpose): string {
  const rec: OtpRecord = {
    email: norm(email),
    code: randomCode(),
    purpose,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  sessionStorage.setItem(OTP_KEY, JSON.stringify(rec))
  return rec.code
}

export function peekOtp(email: string, purpose: OtpPurpose): OtpRecord | null {
  const rec = readSession<OtpRecord>(OTP_KEY)
  if (!rec) return null
  if (rec.email !== norm(email) || rec.purpose !== purpose) return null
  if (Date.now() > rec.expiresAt) return null
  return rec
}

export function consumeOtp(email: string, purpose: OtpPurpose, code: string): 'ok' | 'expired' | 'mismatch' {
  const rec = readSession<OtpRecord>(OTP_KEY)
  if (!rec || rec.email !== norm(email) || rec.purpose !== purpose) return 'mismatch'
  if (Date.now() > rec.expiresAt) {
    sessionStorage.removeItem(OTP_KEY)
    return 'expired'
  }
  if (rec.code !== code.trim()) return 'mismatch'
  sessionStorage.removeItem(OTP_KEY)
  return 'ok'
}

export function allowPasswordReset(email: string) {
  sessionStorage.setItem(RESET_OK_KEY, JSON.stringify({ email: norm(email), at: Date.now() }))
}

export function takePasswordResetAllowance(email: string): boolean {
  const rec = readSession<{ email: string; at: number }>(RESET_OK_KEY)
  if (!rec || rec.email !== norm(email)) return false
  if (Date.now() - rec.at > 15 * 60 * 1000) {
    sessionStorage.removeItem(RESET_OK_KEY)
    return false
  }
  sessionStorage.removeItem(RESET_OK_KEY)
  return true
}

export { roleFor as mockRoleFor }
