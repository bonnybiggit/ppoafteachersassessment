import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as auth from '../services/authService'
import { tokenExpiry, tokenStorage } from '../services/tokenStorage'

interface AuthState {
  teacher: auth.Teacher | null
  loading: boolean
  error: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  retry: () => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<auth.Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)

  function logout() {
    generation.current++
    auth.logout()
    setTeacher(null)
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    const current = ++generation.current
    setLoading(true)
    setError('')
    async function restore() {
      try {
        const restored = tokenStorage.read() ? await auth.getCurrentTeacher() : null
        if (current === generation.current) setTeacher(restored)
      } catch (reason) {
        if (current !== generation.current) return
        setTeacher(null)
        if (!(reason instanceof auth.AuthApiError && reason.status === 401)) {
          setError(reason instanceof auth.AuthApiError ? reason.message : 'Unable to restore your session. Please try again.')
        }
      } finally {
        if (current === generation.current) setLoading(false)
      }
    }
    void restore()
    return () => { generation.current++ }
  }, [revision])

  useEffect(() => {
    if (!teacher) return
    // This timer only ends the local session; identity is always verified by /me.
    const expires = tokenExpiry()
    const check = () => { if (!tokenStorage.read() || (expires !== null && Date.now() >= expires)) logout() }
    const timer = window.setInterval(check, 1000)
    return () => window.clearInterval(timer)
  }, [teacher])

  useEffect(() => {
    const sync = () => setRevision(value => value + 1)
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  async function login(email: string, password: string) {
    const current = ++generation.current
    const account = await auth.login(email, password)
    if (current === generation.current) {
      setTeacher(account)
      setError('')
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ teacher, loading, error, login, logout, retry: () => setRevision(value => value + 1) }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) throw new Error('Authentication provider is missing.')
  return state
}
