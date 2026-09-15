import { useEffect, useState, type FormEvent } from 'react'
import { getAdminTeachers, getAdminTeacher, type AdminTeacher, type AdminTeacherList } from '../services/adminService'

const statuses: Record<string, string> = { all: 'All', profile_incomplete: 'Profile incomplete', profile_complete: 'Profile complete', not_started: 'Assessment not started', in_progress: 'Assessment in progress', completed: 'Assessment completed', abandoned: 'Assessment abandoned' }
const statusLabel = (status: string) => ({ not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', abandoned: 'Abandoned' })[status] ?? 'Unavailable'
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not available'
const name = (teacher: AdminTeacher) => [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || 'Name not provided'
const control = 'rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#0c3b6e] disabled:opacity-50'

export default function AdminTeachers() {
  const [search, setSearch] = useState(''), [query, setQuery] = useState({ search: '', status: 'all', page: 1 })
  const [data, setData] = useState<AdminTeacherList | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<string | null>(null), [detail, setDetail] = useState<AdminTeacher | null>(null), [detailError, setDetailError] = useState('')
  const [detailRevision, setDetailRevision] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError(''); setSelected(null)
    getAdminTeachers(query).then(result => { if (active) setData(result) }).catch(() => { if (active) setError('Teachers could not be loaded. Please try again.') })
    return () => { active = false }
  }, [query, revision])
  useEffect(() => {
    let active = true
    setDetail(null); setDetailError('')
    if (selected) getAdminTeacher(selected).then(result => { if (active) setDetail(result) }).catch(reason => { if (active) setDetailError(reason instanceof Error ? reason.message : 'Teacher details could not be loaded.') })
    return () => { active = false }
  }, [selected, detailRevision])
  function submit(event: FormEvent) { event.preventDefault(); setQuery(value => ({ ...value, search: search.trim(), page: 1 })) }
  return <section className="mx-auto max-w-6xl min-w-0" aria-labelledby="teachers-title">
    <h1 id="teachers-title" className="text-3xl font-bold">Teachers</h1>
    <p className="mt-3 text-slate-600">View accounts, profile completion and assessment progress. Assessment status reflects the latest attempt by start date.</p>
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1"><label htmlFor="teacher-search" className="block text-sm font-medium">Search name or email</label><input id="teacher-search" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} className={`${control} mt-1 w-full`} /></div>
      <div><label htmlFor="teacher-status" className="block text-sm font-medium">Status</label><select id="teacher-status" value={query.status} onChange={event => setQuery(value => ({ ...value, status: event.target.value, page: 1 }))} className={`${control} mt-1 w-full`}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <button className={`${control} bg-[#0c3b6e] text-white`} type="submit">Search</button>
    </form>
    {error ? <div className="mt-6"><p role="alert">{error}</p><button className={`${control} mt-3`} onClick={() => setRevision(value => value + 1)}>Retry</button></div> : !data ? <p role="status" className="mt-6">Loading teachers…</p> : <>
      <p role="status" className="mt-6 text-sm text-slate-600">{data.total} teachers found</p>
      {data.teachers.length === 0 ? <p className="mt-4">No teachers match these filters.</p> : <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.teachers.map(teacher => <li key={teacher.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold break-words">{name(teacher)}</h2><p className="mt-1 break-all text-sm text-slate-600">{teacher.email}</p>
        <dl className="mt-4 space-y-2 text-sm"><div><dt className="inline font-medium">Account: </dt><dd className="inline">{teacher.isActive ? 'Active' : 'Inactive'}</dd></div><div><dt className="inline font-medium">Profile: </dt><dd className="inline">{teacher.profileCompleted ? 'Complete' : 'Incomplete'}</dd></div><div><dt className="inline font-medium">Assessment: </dt><dd className="inline">{statusLabel(teacher.assessmentStatus)}</dd></div><div><dt className="inline font-medium">Responses saved: </dt><dd className="inline">{teacher.assessment ? `${teacher.assessment.responseCount} / ${teacher.assessment.assignedItemCount}` : 'No attempt'}</dd></div></dl>
        <button type="button" aria-expanded={selected === teacher.id} aria-controls="teacher-detail" onClick={() => setSelected(teacher.id)} className={`${control} mt-4`}>View details<span className="sr-only"> for {name(teacher)}</span></button>
      </li>)}</ul>}
      <nav aria-label="Teacher pagination" className="mt-6 flex flex-wrap items-center gap-4"><button className={control} disabled={query.page <= 1} onClick={() => setQuery(value => ({ ...value, page: value.page - 1 }))}>Previous page</button><span>Page {data.page} of {Math.max(1, data.totalPages)}</span><button className={control} disabled={query.page >= data.totalPages} onClick={() => setQuery(value => ({ ...value, page: value.page + 1 }))}>Next page</button></nav>
    </>}
    {selected && <section id="teacher-detail" aria-label="Teacher details" className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Teacher details</h2><button className={control} onClick={() => setSelected(null)}>Close details</button></div>
      {detailError ? <div><p role="alert" className="mt-4">{detailError}</p><button className={`${control} mt-3`} onClick={() => setDetailRevision(value => value + 1)}>Retry details</button></div> : !detail ? <p role="status" className="mt-4">Loading teacher details…</p> : <>
        <h3 className="mt-6 font-bold">Account and profile</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([
          ['Name', name(detail)], ['Email', detail.email], ['Account', detail.isActive ? 'Active' : 'Inactive'], ['Profile', detail.profileCompleted ? 'Complete' : 'Incomplete'],
          ['Current role', detail.currentRole], ['Subject', detail.subject], ['Grade / class', detail.gradeOrClass], ['School type', detail.schoolType], ['School location', detail.schoolLocation],
          ['Teaching experience (years)', detail.yearsOfTeachingExperience], ['Highest education', detail.highestEducation], ['Class size', detail.classSize], ['Registered', date(detail.createdAt)], ['Updated', date(detail.updatedAt)],
        ] as [string, string | number | null][]).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 break-words">{value ?? 'Not provided'}</dd></div>)}</dl>
        <h3 className="mt-6 font-bold">Latest assessment</h3><p className="mt-2">{statusLabel(detail.assessmentStatus)}</p>
        {detail.assessment && <dl className="mt-3 grid gap-4 sm:grid-cols-3"><div><dt>Started</dt><dd>{date(detail.assessment.startedAt)}</dd></div><div><dt>Completed</dt><dd>{date(detail.assessment.completedAt)}</dd></div><div><dt>Responses saved</dt><dd>{detail.assessment.responseCount} / {detail.assessment.assignedItemCount}</dd></div></dl>}
      </>}
    </section>}
  </section>
}
