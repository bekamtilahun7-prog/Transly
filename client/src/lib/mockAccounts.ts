import type { Role } from '../types'

const ACCOUNTS_KEY = 'transly.mock.accounts.v1'

export interface MockAccount {
  email: string
  password: string
  name: string
  role: Role
}

function readLocal<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null
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

export { roleFor as mockRoleFor }
