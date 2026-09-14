import { useEffect, useState } from 'react'
import { getAdminOverview, type AdminOverview } from '../services/adminService'

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null), [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    getAdminOverview().then(result => { if (active) setData(result) }).catch(() => { if (active) setError('The overview could not be loaded. Please try again.') })
    return () => { active = false }
  }, [revision])
  const metrics: [string, number | string | null, string][] = data ? [
    ['Registered teachers', data.totalTeachers, 'All registered teacher accounts.'],
    ['Assessment attempts', data.totalAttempts, 'All attempts, including abandoned attempts.'],
    ['Completed assessments', data.completedAttempts, 'Completed attempts, not unique teachers.'],
    ['In-progress assessments', data.inProgressAttempts, 'Attempts currently in progress.'],
    ['Assessment completion', data.completionRate === null ? null : String(data.completionRate) + '%', 'Completed attempts divided by all attempts.'],
    ['Synthetic pilot bank items', data.syntheticBankItems, 'Stored synthetic items, including inactive items; not the 108-item assembled assessment.'],
    ['Active learning opportunities', data.activeLearningOpportunities, 'Active entries in the provisional synthetic catalog; availability is not verified.'],
  ] : []
  return <section aria-labelledby="admin-title" className="mx-auto max-w-6xl">
    <p className="text-sm font-semibold text-[#b81c1c]">Operational overview</p><h1 id="admin-title" className="mt-2 text-3xl font-bold">Dashboard</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Monitor assessment activity and learning support. This overview uses aggregate counts and does not rank teachers.</p>
    {error ? <div className="mt-8"><p role="alert">{error}</p><button onClick={() => setRevision(value => value + 1)} className="mt-3 underline focus-visible:outline-2">Retry overview</button></div> : !data ? <p role="status" className="mt-8">Loading overview?</p> :
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value, note]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-6"><dt className="font-semibold">{label}</dt><dd className="mt-3 text-3xl font-bold">{value === null ? <span className="text-lg">Data not available</span> : value.toLocaleString()}</dd><dd className="mt-3 text-sm text-slate-600">{note}</dd></div>)}</dl>}
    <p className="mt-8 text-sm text-slate-600">For developmental support and operational oversight. Individual answers, demographic information, and competency rankings are not included.</p>
  </section>
}
