// Explicit integration check: uses .env, creates temporary teachers/attempts/responses,
// and cleans them up. Never inserts or modifies AssessmentItem documents.
require('dotenv/config')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const app = require('../dist/app').default
const { connectDatabase } = require('../dist/config/database')
const { initializeAuth } = require('../dist/services/authService')
const { initializeAssessment } = require('../dist/services/assessmentService')
const { Teacher } = require('../dist/models/Teacher')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')

const emails = [0, 1].map(() => `step6e-${randomUUID()}@example.invalid`)
const password = randomUUID() + 'Aa9!'
const originalExists = AssessmentItem.exists
const originalCount = AssessmentItem.countDocuments
let server
let base
let checks = 0

async function request(method, path, token, body, status) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await res.json()
  assert.equal(res.status, status, `${method} ${path}: expected ${status}, got ${res.status}`)
  const text = JSON.stringify(data)
  for (const forbidden of ['passwordHash', '__v', 'responseKey', password, process.env.JWT_SECRET]) {
    assert(!text.includes(forbidden))
  }
  checks++
  return data
}

async function run() {
  await connectDatabase()
  await initializeAuth()
  await initializeAssessment()
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
  const root = '/api/assessment/attempts'
  const missingId = new mongoose.Types.ObjectId().toString()
  for (const [method, path] of [['POST', root], ['GET', root + '/current'], ['GET', root + '/' + missingId], ['POST', root + '/' + missingId + '/responses'], ['GET', root + '/' + missingId + '/responses']]) {
    await request(method, path, undefined, undefined, 401)
  }
  const identities = []
  for (const email of emails) {
    const registered = await request('POST', '/api/auth/register', undefined, { email, password, firstName: 'Verification', lastName: 'Temporary' }, 201)
    const login = await request('POST', '/api/auth/login', undefined, { email, password }, 200)
    identities.push({ id: registered.teacher.id, token: login.token })
  }
  const [owner, other] = identities
  const empty = { assessmentVersion: 'step6e-verification', totalItems: 0, selectedItemIds: [], consentConfirmed: true }
  await request('GET', root + '/current', owner.token, undefined, 404)
  for (const patch of [{ consentConfirmed: false }, { consentConfirmed: 'true' }, { assessmentVersion: '' }, { totalItems: -1 }, { totalItems: 0.5 }, { totalItems: '0' }, { currentItemIndex: -1 }, { currentItemIndex: 1 }, { currentItemIndex: '0' }, { selectedItemIds: ['bad'] }, { selectedItemIds: 'bad' }, { totalItems: 1 }, { teacherId: other.id }]) {
    await request('POST', root, owner.token, { ...empty, ...patch }, 400)
  }
  await request('POST', root, owner.token, { ...empty, totalItems: 1, selectedItemIds: [missingId] }, 400)
  const outcomes = await Promise.all([201, 201].map(async () => {
    const res = await fetch(base + root, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` }, body: JSON.stringify(empty) })
    return { status: res.status, data: await res.json() }
  }))
  assert.deepEqual(outcomes.map(value => value.status).sort(), [201, 409])
  const attempt = outcomes.find(value => value.status === 201).data.attempt
  assert.equal(attempt.teacherId, owner.id)
  assert.equal(attempt.status, 'in_progress')
  assert.equal(attempt.currentItemIndex, 0)
  assert.equal(attempt.completedAt, undefined)
  assert(Number.isFinite(Date.parse(attempt.startedAt)))
  assert.equal((await request('GET', root + '/current', owner.token, undefined, 200)).attempt.id, attempt.id)
  await request('GET', root + '/' + attempt.id, owner.token, undefined, 200)
  await request('GET', root + '/' + attempt.id, other.token, undefined, 404)
  await request('GET', root + '/' + attempt.id + '/responses', other.token, undefined, 404)
  await request('POST', root + '/' + attempt.id + '/responses', other.token, { itemId: missingId, selectedResponse: false }, 404)
  await request('GET', root + '/bad', owner.token, undefined, 400)
  await request('GET', root + '/' + missingId, owner.token, undefined, 404)
  await AssessmentAttempt.updateOne({ _id: attempt.id, teacherId: owner.id }, { $set: { status: 'abandoned' } })
  console.log('PASS: real Atlas attempt creation, concurrent attempt uniqueness, JWT ownership and validation.')

  // Prefer existing real items. If unavailable, stub only item lookups, never insert questions.
  const activeItems = await AssessmentItem.find({ isActive: true }).select('_id').limit(2)
  const useStub = activeItems.length < 2
  const itemIds = useStub ? [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()] : activeItems.map(item => item._id.toString())
  if (useStub) {
    AssessmentItem.countDocuments = async filter => filter._id.$in.filter(id => itemIds.includes(id)).length
    AssessmentItem.exists = async filter => itemIds.includes(String(filter._id)) && filter.isActive === true ? { _id: filter._id } : null
  }
  console.log(useStub ? 'Response success tests use stubbed item lookups; all attempt/response writes and uniqueness checks use Atlas.' : 'Response tests use existing active items; item documents remain unchanged.')
  await request('POST', root, owner.token, { ...empty, totalItems: 2, selectedItemIds: [itemIds[0], itemIds[0]] }, 400)
  const selected = (await request('POST', root, owner.token, { ...empty, totalItems: 2, selectedItemIds: itemIds }, 201)).attempt
  const responsePath = root + '/' + selected.id + '/responses'
  const answer = { itemId: itemIds[0], selectedResponse: { choices: ['verification-value'] }, responseValue: false, responseDuration: 0, answeredAt: new Date().toISOString() }
  for (const patch of [{ itemId: 'bad' }, { itemId: missingId }, { responseDuration: -1 }, { responseDuration: '1' }, { answeredAt: 'bad' }, { selectedResponse: null }, { teacherId: other.id }]) {
    await request('POST', responsePath, owner.token, { ...answer, ...patch }, 400)
  }
  const currentExists = AssessmentItem.exists
  AssessmentItem.exists = async () => null
  await request('POST', responsePath, owner.token, answer, 400)
  AssessmentItem.exists = currentExists
  const responseOutcomes = await Promise.all([0, 1].map(async () => {
    const res = await fetch(base + responsePath, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` }, body: JSON.stringify(answer) })
    return res.status
  }))
  assert.deepEqual(responseOutcomes.sort(), [201, 409])
  await request('POST', responsePath, owner.token, { itemId: itemIds[1], selectedResponse: false }, 201)
  const responses = (await request('GET', responsePath, owner.token, undefined, 200)).responses
  assert.equal(responses.length, 2)
  assert.deepEqual(responses.find(value => value.itemId === itemIds[0]).selectedResponse, answer.selectedResponse)
  assert.equal(await AssessmentResponse.countDocuments({ attemptId: selected.id, itemId: itemIds[0] }), 1)
  const saved = await AssessmentResponse.findOne({ attemptId: selected.id, itemId: itemIds[0] })
  assert.equal(saved.teacherId.toString(), owner.id)
  assert.equal(saved.responseDurationMs, 0)
  for (const forbidden of ['score', 'domainScores', 'competencyResults', 'passwordHash']) assert.equal(saved.get(forbidden), undefined)
  await request('GET', responsePath, other.token, undefined, 404)
  const originalFind = AssessmentResponse.find
  try {
    AssessmentResponse.find = () => { throw new Error('private database details') }
    const failure = await request('GET', responsePath, owner.token, undefined, 500)
    assert.equal(failure.message, 'Unable to complete assessment request.')
  } finally { AssessmentResponse.find = originalFind }
  await AssessmentAttempt.updateOne({ _id: selected.id, teacherId: owner.id }, { $set: { status: 'completed' } })
  await request('POST', responsePath, owner.token, answer, 409)
  await request('GET', root + '/current', owner.token, undefined, 404)
  await Teacher.updateOne({ _id: owner.id }, { $set: { isActive: false } })
  await request('GET', responsePath, owner.token, undefined, 401)
  console.log(`PASS: ${checks} HTTP checks plus concurrent uniqueness, response storage, retrieval and safe errors. No scoring or question writes.`)
}

run().catch(() => {
  console.error('FAIL: assessment integration verification. No request secrets are printed.')
  process.exitCode = 1
}).finally(async () => {
  AssessmentItem.exists = originalExists
  AssessmentItem.countDocuments = originalCount
  try {
    if (mongoose.connection.readyState === 1) {
      const teachers = await Teacher.find({ email: { $in: emails } }).select('_id')
      const ids = teachers.map(teacher => teacher._id)
      await AssessmentResponse.deleteMany({ teacherId: { $in: ids } })
      await AssessmentAttempt.deleteMany({ teacherId: { $in: ids } })
      await Teacher.deleteMany({ _id: { $in: ids } })
      assert.equal(await AssessmentResponse.countDocuments({ teacherId: { $in: ids } }), 0)
      assert.equal(await AssessmentAttempt.countDocuments({ teacherId: { $in: ids } }), 0)
      assert.equal(await Teacher.countDocuments({ email: { $in: emails } }), 0)
      console.log('Cleanup verified: temporary teachers, attempts and responses removed; no questions created.')
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    await mongoose.disconnect()
  }
})
