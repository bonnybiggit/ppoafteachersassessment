import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedTeacherRoute() {
  const { teacher, loading, error, retry, logout } = useAuth()
  if (loading) return <div role="status" className="min-h-screen bg-[#faf8f5] p-12 text-center text-[#0c3b6e]">Loading your account…</div>
  if (error) return <div className="min-h-screen bg-[#faf8f5] p-12 text-center text-[#0c3b6e]">
    <p role="alert">{error}</p>
    <button onClick={retry} className="m-4 underline">Try again</button>
    <button onClick={logout} className="m-4 underline">Return to sign in</button>
  </div>
  return teacher ? <Outlet /> : <Navigate to="/login" replace />
}
