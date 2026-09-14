const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
process.env.JWT_SECRET = randomBytes(48).toString('hex')
process.env.JWT_EXPIRES_IN = '1h'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
const Administrator = require('../dist/models/Administrator').default
const { Teacher } = require('../dist/models/Teacher')
const Attempt = require('../dist/models/AssessmentAttempt').default
const Item = require('../dist/models/AssessmentItem').default
const { verifyTeacherToken } = require('../dist/services/authService')
const { adminSecret } = require('../dist/services/adminAuthService')
const app = require('../dist/app').default

test('admin API enforces identity isolation, revocation and aggregate-only responses without database writes', async () => {
  const password = randomBytes(24).toString('hex')
  const admin = { _id: 'a'.repeat(24), email: 'admin@example.test', passwordHash: await bcrypt.hash(password, 12), role: 'admin', isActive: true, sessionVersion: 0 }
  const teacher = { _id: 'b'.repeat(24), email: 'teacher@example.test', passwordHash: await bcrypt.hash(password, 12), firstName: 'Test', lastName: 'Teacher', isActive: true }
  Administrator.findOne = query => ({ select: async () => query.email === admin.email ? admin : null })
  Administrator.findById = async id => id === admin._id ? admin : null
  let writes = 0, reads = 0
  Administrator.updateOne = async filter => { if (filter._id === admin._id && filter.sessionVersion === admin.sessionVersion) { writes++; admin.sessionVersion++ } }
  Teacher.findOne = query => ({ select: async () => query.email === teacher.email ? teacher : null })
  Teacher.findById = () => ({ select: async () => teacher })
  Teacher.countDocuments = async query => { assert.deepEqual(query, {}); reads++; return 4 }
  let activity = [{ _id: 'completed', count: 2 }, { _id: 'in_progress', count: 1 }, { _id: 'abandoned', count: 1 }]
  Attempt.aggregate = async pipeline => { assert.deepEqual(pipeline, [{ $group: { _id: '$status', count: { $sum: 1 } } }]); return activity }
  Item.countDocuments = async query => { assert.deepEqual(query, { version: { $regex: '^\\s*synthetic', $options: 'i' } }); return 450 }
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  const call = async (path, token, body) => {
    const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: res.status, body: res.status === 204 ? null : await res.json(), cache: res.headers.get('cache-control') }
  }
  try {
    assert.equal((await call('/admin/overview')).status, 401)
    const teacherLogin = await call('/auth/login', null, { email: teacher.email, password })
    assert.equal(teacherLogin.status, 200)
    const teacherToken = teacherLogin.body.token
    assert.equal((await call('/auth/me', teacherToken)).status, 200)
    for (const path of ['/admin/me', '/admin/overview']) assert.equal((await call(path, teacherToken)).status, 401)
    assert.equal((await call('/admin/logout', teacherToken, {})).status, 401)
    assert.equal(reads, 0)
    assert.equal((await call('/admin/login', null, { email: teacher.email, password })).status, 401)
    assert.equal((await call('/admin/login', null, { email: admin.email, password: 'wrong' })).status, 401)
    assert.equal((await call('/admin/login', null, { email: admin.email, password, role: 'admin' })).status, 400)
    const login = await call('/admin/login', null, { email: admin.email.toUpperCase(), password })
    assert.equal(login.status, 200)
    assert.deepEqual(login.body.admin, { id: admin._id, email: admin.email, role: 'admin' })
    assert.deepEqual(Object.keys(login.body).sort(), ['admin', 'token'])
    assert.equal(login.cache, 'no-store')
    const token = login.body.token
    assert.throws(() => verifyTeacherToken(token))
    assert.equal((await call('/auth/me', token)).status, 401)
    assert.equal((await call('/admin/me', token)).status, 200)
    const overview = await call('/admin/overview', token)
    assert.equal(overview.status, 200)
    assert.deepEqual(overview.body, { totalTeachers: 4, totalAttempts: 4, completedAttempts: 2, inProgressAttempts: 1, completionRate: 50, syntheticBankItems: 450, activeLearningOpportunities: 26 })
    assert.equal(writes, 0)
    activity = []
    assert.equal((await call('/admin/overview', token)).body.completionRate, null)
    admin.isActive = false
    assert.equal((await call('/admin/me', token)).status, 401)
    admin.isActive = true; admin.role = 'teacher'
    assert.equal((await call('/admin/overview', token)).status, 401)
    admin.role = 'admin'
    for (const options of [{ expiresIn: -1 }, { audience: 'teacher' }, { issuer: 'other' }]) {
      const invalid = jwt.sign({ role: 'admin', version: 0 }, process.env.ADMIN_JWT_SECRET, { subject: admin._id, audience: 'ppoaf-admin', issuer: 'ppoaf-admin-auth', expiresIn: '1h', ...options })
      assert.equal((await call('/admin/me', invalid)).status, 401)
    }
    const forged = jwt.sign({ role: 'admin', version: 0 }, process.env.JWT_SECRET, { subject: admin._id, audience: 'ppoaf-admin', issuer: 'ppoaf-admin-auth', expiresIn: '1h' })
    assert.equal((await call('/admin/me', forged)).status, 401)
    assert.equal((await call('/admin/logout', token, {})).status, 204)
    assert.equal(writes, 1)
    assert.equal((await call('/admin/me', token)).status, 401)
    assert.equal((await call('/auth/me', teacherToken)).status, 200)
    const secret = process.env.ADMIN_JWT_SECRET
    process.env.ADMIN_JWT_SECRET = process.env.JWT_SECRET
    assert.throws(adminSecret)
    delete process.env.ADMIN_JWT_SECRET
    assert.equal((await call('/admin/me', token)).status, 503)
    assert.equal((await call('/auth/me', teacherToken)).status, 200)
    process.env.ADMIN_JWT_SECRET = secret
    for (let i = 0; i < 6; i++) await call('/admin/login', null, {})
    assert.equal((await call('/admin/login', null, {})).status, 429)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
