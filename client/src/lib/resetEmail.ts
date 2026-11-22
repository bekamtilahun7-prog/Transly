const KEY = 'transly.reset.email'

export function writeResetEmail(email: string) {
  const value = email.trim().toLowerCase()
  if (!value) return
  try {
    sessionStorage.setItem(KEY, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function readResetEmail(): string {
  try {
    return (sessionStorage.getItem(KEY) ?? '').trim()
  } catch {
    return ''
  }
}

export function clearResetEmail() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
