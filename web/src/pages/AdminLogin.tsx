import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import logo from '../assets/ppoaf-logo.jpeg'
export default function AdminLogin() {
  const { admin, loading, error: sessionError, login, retry } = useAdminAuth()
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await login(email, password); setPassword('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in is unavailable.') }
    finally { setBusy(false) }
  }
  if (admin) return <Navigate to="/admin" replace />
  return <main className="min-h-screen bg-[#faf8f5] px-4 py-12 text-[#0c3b6e] flex items-center justify-center"><section className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-10 shadow-sm border border-slate-200">
    <img src={logo} alt="PPOAF" className="mx-auto mb-6 w-28" /><h1 className="text-2xl font-bold">PPOAF Administration</h1>
    <p className="mt-3 text-slate-600">Secure access for authorized PPOAF administrators.</p><p className="mt-2 text-sm text-slate-600">Teacher sign-in does not grant administrator access.</p>
    {loading ? <p role="status" className="mt-6">Checking administrator session…</p> : sessionError ? <div className="mt-6"><p role="alert">{sessionError}</p><button onClick={retry} className="mt-3 underline focus-visible:outline-2">Retry session check</button></div> :
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div><label htmlFor="admin-email" className="block font-medium">Email</label><input id="admin-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className="mt-2 w-full rounded-lg border border-slate-400 p-3 focus-visible:outline-2 focus-visible:outline-[#0c3b6e]" /></div>
        <div><label htmlFor="admin-password" className="block font-medium">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className="mt-2 w-full rounded-lg border border-slate-400 p-3 focus-visible:outline-2 focus-visible:outline-[#0c3b6e]" /></div>
        {error && <p role="alert" className="text-[#b81c1c]">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#b81c1c] p-3 font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0c3b6e]">{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>}
    <Link to="/" className="mt-6 inline-block text-sm underline focus-visible:outline-2">Back to PPOAF</Link>
  </section></main>
}
