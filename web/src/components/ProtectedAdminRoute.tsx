import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
export default function ProtectedAdminRoute() {
  const { admin, loading, error, retry } = useAdminAuth()
  if (loading) return <p role="status" className="p-8">Checking administrator session…</p>
  if (error) return <div className="p-8"><p role="alert">{error}</p><button onClick={retry} className="mt-4 underline focus-visible:outline-2">Retry session check</button></div>
  return admin?.role === 'admin' ? <Outlet /> : <Navigate to="/admin/login" replace />
}
