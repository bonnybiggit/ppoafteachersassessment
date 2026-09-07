const key = 'ppoaf.auth.token'

export const tokenStorage = {
  read(): string | null { return localStorage.getItem(key) },
  write(token: string): void { localStorage.setItem(key, token) },
  remove(): void { localStorage.removeItem(key) },
}

export function tokenExpiry(): number | null {
  try {
    const token = tokenStorage.read()
    if (!token) return null
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(atob(part))
    if (typeof payload === 'object' && payload !== null && 'exp' in payload && typeof payload.exp === 'number') {
      return payload.exp * 1000
    }
  } catch { /* Invalid tokens are rejected by /auth/me. */ }
  return null
}
