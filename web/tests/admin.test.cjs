const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const { create, act } = require('react-test-renderer')
const router = require('react-router-dom')
global.IS_REACT_ACT_ENVIRONMENT = true

test('Teachers page searches, filters, paginates, loads details and handles empty/error states', async () => {
  const calls = []
  let listFailure = false, detailFailure = false, renderer
  const teacher = { id: 'teacher-one', firstName: 'Ada', lastName: 'Teacher', email: 'ada@example.test', isActive: true, profileCompleted: true,
    assessmentStatus: 'in_progress', currentRole: 'Teacher', yearsOfTeachingExperience: 0, assessment: { status: 'in_progress', responseCount: 60, assignedItemCount: 108, startedAt: null, completedAt: null } }
  const Page = compile('src/pages/AdminTeachers.tsx', { '../services/adminService': {
    getAdminTeachers: async query => {
      calls.push({ ...query })
      if (listFailure) throw new Error('Unavailable')
      return { teachers: query.search === 'missing' ? [] : [teacher], total: query.search === 'missing' ? 0 : 21, totalPages: query.search === 'missing' ? 0 : 2, page: query.page }
    },
    getAdminTeacher: async id => { assert.equal(id, teacher.id); if (detailFailure) throw new Error('Teacher not found.'); return teacher },
  } }, { Error }).default
  const text = child => Array.isArray(child) ? child.map(text).join(' ') : typeof child === 'object' && child !== null ? text(child.props?.children) : String(child ?? '')
  const button = label => renderer.root.findAllByType('button').find(node => text(node.props.children).includes(label))
  const click = async label => { const node = button(label); assert(node && !node.props.disabled); await act(async () => node.props.onClick()) }
  const content = () => JSON.stringify(renderer.toJSON())
  try {
    await act(async () => { renderer = create(React.createElement(Page)) })
    assert(content().includes('ada@example.test'))
    assert.equal(button('Previous page').props.disabled, true)
    await click('Next page')
    assert.equal(calls.at(-1).page, 2)
    assert.equal(button('Next page').props.disabled, true)
    await act(async () => renderer.root.findByType('select').props.onChange({ target: { value: 'completed' } }))
    assert.equal(calls.at(-1).page, 1); assert.equal(calls.at(-1).status, 'completed')
    await act(async () => renderer.root.findByType('input').props.onChange({ target: { value: 'Ada' } }))
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
    assert.equal(calls.at(-1).search, 'Ada')
    await click('View details')
    assert(content().includes('Latest assessment')); assert(content().includes('Teaching experience (years)'))
    assert.equal(renderer.root.findAllByType('input').length, 1, 'No profile editing inputs')
    await click('Close details')
    detailFailure = true
    await click('View details'); assert(content().includes('Teacher not found.'))
    detailFailure = false
    await click('Retry details'); assert(content().includes('Latest assessment'))
    await act(async () => renderer.root.findByType('input').props.onChange({ target: { value: 'missing' } }))
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
    assert(content().includes('No teachers match'))
    assert(!content().includes('Latest assessment'))
    listFailure = true
    await act(async () => renderer.root.findByType('select').props.onChange({ target: { value: 'all' } }))
    assert(content().includes('Teachers could not be loaded'))
    listFailure = false
    await click('Retry'); assert(content().includes('No teachers match'))
  } finally { if (renderer) await act(async () => renderer.unmount()) }
})
function compile(file, overrides = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://local.test/api'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), ...globals })
  return module.exports
}
function harness() {
  const storage = new Map([['ppoaf.auth.token', 'teacher-session']])
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  const window = new EventTarget()
  let tick
  window.setInterval = callback => { tick = callback; return 1 }
  window.clearInterval = () => {}
  const identity = { id: 'admin-id', email: 'admin@example.test', role: 'admin' }
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature'
  let meStatus = 200, logoutStatus = 204
  const calls = []
  const service = compile('src/services/adminService.ts', {}, { localStorage, window, Event, atob, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, ...options })
      const status = url.endsWith('/me') ? meStatus : url.endsWith('/logout') ? logoutStatus : 200
      return { status, ok: status >= 200 && status < 300, json: async () => url.endsWith('/login') ? { token } : { admin: identity } }
    } })
  const context = compile('src/context/AdminAuthContext.tsx', { '../services/adminService': service }, { window })
  let current
  function Probe() { current = context.useAdminAuth(); return React.createElement('span', null, current.admin?.email ?? 'signed-out') }
  const mount = async () => { let root; await act(async () => { root = create(React.createElement(context.AdminAuthProvider, null, React.createElement(Probe))) }); return root }
  return { service, context, mount, get current() { return current }, storage, token, calls, tick: () => tick(), window,
    setMeStatus: value => { meStatus = value }, setLogoutStatus: value => { logoutStatus = value } }
}
test('admin login, refresh verification, server logout and storage remain separate from teacher session', async () => {
  const h = harness()
  let root = await h.mount()
  assert.equal(h.current.admin, null)
  assert.equal(h.calls.length, 0, 'teacher token must never be sent to admin APIs')
  await act(async () => { await h.current.login('admin@example.test', 'test-input') })
  assert.equal(h.current.admin.role, 'admin')
  assert.equal(h.storage.get('ppoaf.admin.token'), h.token)
  assert.equal(h.calls[0].url, 'http://local.test/api/admin/login')
  assert.equal(h.calls[0].headers.Authorization, undefined)
  assert.equal(h.calls[1].headers.Authorization, 'Bearer ' + h.token)
  await act(async () => root.unmount())
  root = await h.mount()
  assert.equal(h.current.admin.role, 'admin')
  assert.equal(h.calls.filter(call => call.url.endsWith('/me')).length, 2)
  h.setLogoutStatus(503)
  await act(async () => { await assert.rejects(h.current.logout()) })
  assert.equal(h.current.admin.role, 'admin', 'failed revocation must be retryable')
  h.setLogoutStatus(204)
  await act(async () => { await h.current.logout() })
  assert.equal(h.current.admin, null)
  assert.equal(h.storage.has('ppoaf.admin.token'), false)
  assert.equal(h.storage.get('ppoaf.auth.token'), 'teacher-session')
  await act(async () => root.unmount())
})
test('invalid/expired tokens sign out; a temporary session failure permits retry without revealing dashboard', async () => {
  const h = harness()
  h.storage.set('ppoaf.admin.token', h.token); h.setMeStatus(503)
  const root = await h.mount()
  assert.equal(h.current.admin, null); assert.ok(h.current.error)
  h.setMeStatus(200)
  await act(async () => h.current.retry())
  assert.equal(h.current.admin.role, 'admin')
  h.storage.set('ppoaf.admin.token', 'header.' + Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url') + '.signature')
  await act(async () => h.tick())
  assert.equal(h.current.admin, null)
  h.storage.set('ppoaf.admin.token', 'invalid')
  await act(async () => h.current.retry())
  assert.equal(h.current.admin, null)
  h.storage.set('ppoaf.admin.token', h.token); h.setMeStatus(401)
  await act(async () => h.current.retry())
  assert.equal(h.current.admin, null); assert.equal(h.current.error, '')
  assert.equal(h.storage.has('ppoaf.admin.token'), false)
  assert.equal(h.storage.get('ppoaf.auth.token'), 'teacher-session')
  await act(async () => root.unmount())
})
test('admin guard denies anonymous and teacher identities, allows admin, and holds loading/error states', async () => {
  let auth = { admin: null, loading: false, error: '', retry: () => {} }
  const Guard = compile('src/components/ProtectedAdminRoute.tsx', { '../context/AdminAuthContext': { useAdminAuth: () => auth } }).default
  async function render() {
    let root
    await act(async () => { root = create(React.createElement(router.MemoryRouter, { initialEntries: ['/admin'] },
      React.createElement(router.Routes, null,
        React.createElement(router.Route, { path: '/admin/login', element: React.createElement('p', null, 'admin-login') }),
        React.createElement(router.Route, { element: React.createElement(Guard) }, React.createElement(router.Route, { path: '/admin', element: React.createElement('p', null, 'private-dashboard') }))))) })
    const output = JSON.stringify(root.toJSON()); await act(async () => root.unmount()); return output
  }
  assert.match(await render(), /admin-login/)
  auth.admin = { role: 'teacher' }; assert.match(await render(), /admin-login/)
  auth.admin = { role: 'admin' }; assert.match(await render(), /private-dashboard/)
  auth.loading = true; assert.doesNotMatch(await render(), /private-dashboard/)
  auth.loading = false; auth.error = 'Session unavailable'; assert.match(await render(), /Retry session check/)
})
test('mobile navigation has a working labeled disclosure and dashboard labels unavailable/provisional data', async () => {
  const Layout = compile('src/layouts/AdminLayout.tsx', { '../context/AdminAuthContext': { useAdminAuth: () => ({ admin: { email: 'admin@example.test' }, logout: async () => {} }) }, '../assets/ppoaf-logo.jpeg': 'logo' }).default
  let root
  await act(async () => { root = create(React.createElement(router.MemoryRouter, null, React.createElement(Layout))) })
  const menu = root.root.findAllByType('button').find(button => button.props['aria-controls'])
  assert.equal(menu.props['aria-expanded'], false)
  await act(async () => menu.props.onClick())
  assert.equal(menu.props['aria-expanded'], true)
  assert.equal(root.root.findByType('nav').props['aria-label'], 'Administration')
  await act(async () => root.unmount())
  const Dashboard = compile('src/pages/AdminDashboard.tsx', { '../services/adminService': { getAdminOverview: async () => ({ totalTeachers: 0, totalAttempts: 0, completedAttempts: 0, inProgressAttempts: 0, completionRate: null, syntheticBankItems: 450, activeLearningOpportunities: null }) } }).default
  await act(async () => { root = create(React.createElement(Dashboard)) })
  const text = JSON.stringify(root.toJSON())
  assert.match(text, /Data not available/); assert.match(text, /provisional synthetic catalog/); assert.match(text, /not unique teachers/)
  await act(async () => root.unmount())
})

test('existing teacher guard still permits teacher assessment routes and redirects unauthenticated sessions', async () => {
  let auth = { teacher: { id: 'teacher-id' }, loading: false, error: '', retry() {}, logout() {} }
  const Guard = compile('src/components/ProtectedTeacherRoute.tsx', { '../context/AuthContext': { useAuth: () => auth } }).default
  async function render() {
    let root
    await act(async () => { root = create(React.createElement(router.MemoryRouter, { initialEntries: ['/teacher/assessment'] },
      React.createElement(router.Routes, null,
        React.createElement(router.Route, { path: '/login', element: React.createElement('p', null, 'teacher-login') }),
        React.createElement(router.Route, { element: React.createElement(Guard) }, React.createElement(router.Route, { path: '/teacher/assessment', element: React.createElement('p', null, 'teacher-assessment') }))))) })
    const output = JSON.stringify(root.toJSON()); await act(async () => root.unmount()); return output
  }
  assert.match(await render(), /teacher-assessment/)
  auth = { ...auth, teacher: null }
  assert.match(await render(), /teacher-login/)
})
