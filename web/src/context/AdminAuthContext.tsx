import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ADMIN_SESSION_EVENT, ADMIN_TOKEN_KEY, AdminApiError, adminTokenStorage, adminTokenValid,
  getCurrentAdmin, signInAdmin, signOutAdmin, type AdminIdentity } from '../services/adminService'

type Context = { admin: AdminIdentity | null; loading: boolean; error: string; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; retry: () => void }
const AdminContext = createContext<Context | null>(null)
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    const current = ++generation.current
    setLoading(true); setError(''); setAdmin(null)
    if (!adminTokenValid()) { adminTokenStorage.remove(); setLoading(false); return }
    getCurrentAdmin().then(identity => { if (current === generation.current) setAdmin(identity) })
      .catch(reason => { if (current === generation.current && !(reason instanceof AdminApiError && [401, 403].includes(reason.status))) setError(reason.message) })
      .finally(() => { if (current === generation.current) setLoading(false) })
    return () => { generation.current++ }
  }, [revision])
  useEffect(() => {
    const ended = () => { generation.current++; setAdmin(null); setLoading(false); setError('') }
    const changed = (event: StorageEvent) => { if (event.key === ADMIN_TOKEN_KEY || event.key === null) { ended(); setRevision(value => value + 1) } }
    const timer = window.setInterval(() => { if (adminTokenStorage.read() && !adminTokenValid()) { adminTokenStorage.remove(); ended() } }, 1000)
    window.addEventListener(ADMIN_SESSION_EVENT, ended); window.addEventListener('storage', changed)
    return () => { window.clearInterval(timer); window.removeEventListener(ADMIN_SESSION_EVENT, ended); window.removeEventListener('storage', changed); generation.current++ }
  }, [])
  async function login(email: string, password: string) {
    const current = ++generation.current
    const token = await signInAdmin(email, password)
    if (current !== generation.current) return
    adminTokenStorage.write(token)
    try {
      const identity = await getCurrentAdmin()
      if (current === generation.current) { setAdmin(identity); setError('') }
    } catch (reason) { if (adminTokenStorage.read() === token) adminTokenStorage.remove(); throw reason }
  }
  async function logout() {
    const token = adminTokenStorage.read()
    await signOutAdmin()
    if (adminTokenStorage.read() === token) {
      generation.current++; adminTokenStorage.remove(); setAdmin(null); setError(''); setLoading(false)
    }
  }
  return <AdminContext.Provider value={{ admin, loading, error, login, logout, retry: () => setRevision(value => value + 1) }}>{children}</AdminContext.Provider>
}
export function AdminArea() { return <AdminAuthProvider><Outlet /></AdminAuthProvider> }
export function useAdminAuth() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('Admin authentication provider is required.')
  return context
}
