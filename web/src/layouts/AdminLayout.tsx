import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import logo from '../assets/ppoaf-logo.jpeg'
export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function signOut() {
    setBusy(true); setError('')
    try { await logout() } catch { setError('Could not end your server session. Please try signing out again.') }
    finally { setBusy(false) }
  }
  return <div className="min-h-screen bg-[#faf8f5] text-[#0c3b6e] lg:flex">
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:p-4">Skip to dashboard</a>
    <aside className="bg-[#0c3b6e] text-white lg:w-64 lg:shrink-0 p-5"><div className="flex items-center justify-between gap-4"><div><img src={logo} alt="PPOAF" className="w-20 rounded bg-white" /><p className="mt-3 font-semibold">Administration</p></div>
      <button aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(!open)} className="lg:hidden rounded border border-white/60 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-4">{open ? 'Close menu' : 'Menu'}</button></div>
      <nav id="admin-navigation" aria-label="Administration" className={`${open ? 'block' : 'hidden'} lg:block mt-7`}><NavLink to="/admin" end onClick={() => setOpen(false)} className="block rounded-lg bg-white/15 px-4 py-3 font-medium focus-visible:outline-2">Dashboard</NavLink><NavLink to="/admin/teachers" onClick={() => setOpen(false)} className="mt-2 block rounded-lg px-4 py-3 font-medium hover:bg-white/15 focus-visible:outline-2">Teachers</NavLink></nav>
    </aside>
    <div className="min-w-0 flex-1"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div className="min-w-0"><p className="text-sm text-slate-600">Administrator</p><p className="break-all font-medium">{admin?.email}</p></div>
      <button onClick={signOut} disabled={busy} className="rounded-lg border border-[#0c3b6e] px-4 py-2 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4">{busy ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert" className="w-full text-[#b81c1c]">{error}</p>}
    </header><main id="admin-content" tabIndex={-1} className="p-5 sm:p-8"><Outlet /></main></div>
  </div>
}
