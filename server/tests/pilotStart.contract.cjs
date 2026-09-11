// Local HTTP contract regression. No dotenv, database connection, or database writes.
// Real JWT middleware, controller, service, assembly, and delivery; model I/O is in memory.
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const { once } = require('node:events')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const app = require('../dist/app').default
const { Teacher } = require('../dist/models/Teacher')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')
const { AssessmentItem, ASSESSMENT_DOMAINS } = require('../dist/models/AssessmentItem')

const teacherId = new mongoose.Types.ObjectId()
const secret = randomBytes(32).toString('hex')
const oldSecret = process.env.JWT_SECRET
const oldDuration = process.env.JWT_EXPIRES_IN
process.env.JWT_SECRET = secret
process.env.JWT_EXPIRES_IN = '1h'
const token = jwt.sign({ email: 'pilot-contract@example.invalid' }, secret, {
  algorithm: 'HS256', subject: String(teacherId), expiresIn: '1h',
})
const evidence = [
  ...Array(4).fill('situational judgement'), ...Array(3).fill('behaviour frequency'),
  ...Array(2).fill('knowledge/application'), ...Array(2).fill('reflective judgement'),
  'performance evidence', 'situational judgement',
]
const items = ASSESSMENT_DOMAINS.flatMap((primaryDomain, d) => evidence.map((evidenceType, i) => ({
  _id: new mongoose.Types.ObjectId(), itemId: `CONTRACT-${d}-${String(i).padStart(2, '0')}`,
  primaryDomain, evidenceType, prompt: `Contract fixture ${d}-${i}`, subcompetency: `sub-${i}`,
  version: 'synthetic.contract', isActive: false, difficulty: 2,
  socialDesirabilityRisk: 'low', discrimination: 999, criticalFlag: false,
  responseKey: { correctAnswer: 'PRIVATE', options: [{ id: 'A', label: 'Choice A', score: 999 }] },
})))
const original = [Teacher.findById, AssessmentAttempt.findOne, AssessmentAttempt.create, AssessmentItem.find]
const originalResponseIO = [AssessmentItem.exists, AssessmentAttempt.findOneAndUpdate,
  AssessmentResponse.create, AssessmentResponse.find, mongoose.connection.transaction]
const responses = []
let attempt, creates = 0, server
Teacher.findById = id => ({ select: async () => String(id) === String(teacherId)
  ? { _id: teacherId, email: 'pilot-contract@example.invalid', isActive: true } : null })
AssessmentAttempt.findOne = async filter => attempt && filter.teacherId === String(teacherId) &&
  (!filter._id || String(filter._id) === String(attempt._id)) ? attempt : null
AssessmentAttempt.create = async input => {
  creates++
  attempt = new AssessmentAttempt(input)
  await attempt.validate()
  return attempt
}
AssessmentItem.find = filter => ({ select() { return this }, async lean() {
  if (filter.version) {
    assert(filter.version.$regex.test('synthetic.contract'))
    return items.slice().reverse()
  }
  return items.filter(item => filter._id.$in.some(id => String(id) === String(item._id))).reverse()
} })
AssessmentItem.exists = async filter => items.some(item => String(item._id) === String(filter._id))
AssessmentAttempt.findOneAndUpdate = async (filter, update) => {
  assert.equal(filter.teacherId, String(teacherId))
  assert.equal(String(filter._id), String(attempt._id))
  attempt.currentItemIndex += update.$inc.currentItemIndex
  return attempt
}
AssessmentResponse.create = async ([input]) => {
  if (responses.some(response => String(response.itemId) === String(input.itemId))) {
    throw Object.assign(new Error('Duplicate fixture response'), { code: 11000 })
  }
  const response = new AssessmentResponse(input)
  await response.validate()
  responses.push(response)
  return [response]
}
AssessmentResponse.find = filter => ({ sort: async () => responses.filter(response =>
  String(response.teacherId) === String(filter.teacherId) && String(response.attemptId) === String(filter.attemptId)) })
mongoose.connection.transaction = async operation => {
  const index = attempt.currentItemIndex
  try { return await operation({}) }
  catch (error) { attempt.currentItemIndex = index; throw error }
}

async function run() {
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}/api/assessment/attempts`
  async function post(body, authenticated = true) {
    const response = await fetch(url, { method: 'POST', headers: {
      'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
    }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json() }
  }
  const input = { consentConfirmed: true, mode: 'pilot-synthetic' }
  assert.equal((await post(input, false)).status, 401)
  assert.equal((await post({ mode: 'pilot-synthetic' })).status, 400)
  const extra = await post({ ...input, consent: true })
  assert.equal(extra.status, 400)
  assert.equal(extra.body.message, 'Request contains unsupported fields.')
  const result = await post(input)
  assert.equal(result.status, 201)
  assert.equal(result.body.success, true)
  const delivered = result.body.attempt
  assert.equal(delivered.teacherId, String(teacherId))
  assert.equal(delivered.mode, 'pilot-synthetic')
  assert.equal(delivered.consentConfirmed, true)
  assert.equal(delivered.totalItems, 108)
  assert.equal(delivered.questions.length, 108)
  assert.equal(new Set(delivered.selectedItemIds).size, 108)
  assert.deepEqual(delivered.questions.map(q => q.itemId), delivered.selectedItemIds)
  for (const domain of ASSESSMENT_DOMAINS) assert.equal(delivered.questions.filter(q => q.domain === domain).length, 12)
  delivered.questions.forEach((q, i) => {
    assert.equal(q.questionOrder, i + 1)
    assert.deepEqual(q.options, [{ id: 'A', label: 'Choice A' }])
  })
  for (const field of ['responseKey', 'correctAnswer', 'difficulty', 'discrimination', 'socialDesirabilityRisk', 'PRIVATE', secret]) {
    assert(!JSON.stringify(result.body).includes(field), 'Delivery must exclude private metadata')
  }
  const resumed = await (await fetch(`${url}/current`, { headers: { Authorization: `Bearer ${token}` } })).json()
  assert.deepEqual(resumed.attempt, delivered)
  assert.equal((await post(input)).body.attempt.id, delivered.id)
  assert.equal(creates, 1)
  const responseUrl = `${url}/${delivered.id}/responses`
  const answer = { itemId: delivered.selectedItemIds[0], selectedResponse: 'A', responseValue: 'A' }
  const save = () => fetch(responseUrl, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
  }, body: JSON.stringify(answer) })
  assert.equal((await save()).status, 201)
  const listed = await (await fetch(responseUrl, { headers: { Authorization: `Bearer ${token}` } })).json()
  assert.equal(listed.responses.length, 1)
  assert.equal(listed.responses[0].attemptId, delivered.id)
  assert.equal(listed.responses[0].itemId, answer.itemId)
  assert.equal(listed.responses[0].selectedResponse, 'A')
  assert.equal((await save()).status, 409)
  const refreshed = await (await fetch(`${url}/current`, { headers: { Authorization: `Bearer ${token}` } })).json()
  assert.equal(refreshed.attempt.id, delivered.id)
  assert.equal(refreshed.attempt.currentItemIndex, 1)
  assert.deepEqual(refreshed.attempt.questions, delivered.questions)
  assert.deepEqual(refreshed.attempt.selectedItemIds, delivered.selectedItemIds)
  assert.equal((await post(input)).body.attempt.id, delivered.id)
  assert.equal(creates, 1)
  assert.equal(responses.length, 1)
  assert(items.every(item => item.isActive === false))
  assert.equal(mongoose.connection.readyState, 0)
  console.log('PASS: exact pilot start HTTP contract, JWT ownership, consent, 108 unique items, nine domains, ordered safe delivery, and attempt reuse; no database connection or writes.')
  console.log('PASS: save/list/refresh preserves response association and question order; duplicate save rejected. Persistence is in memory.')
}
run().catch(() => { console.error('FAIL: pilot start contract regression'); process.exitCode = 1 }).finally(async () => {
  ;[Teacher.findById, AssessmentAttempt.findOne, AssessmentAttempt.create, AssessmentItem.find] = original
  ;[AssessmentItem.exists, AssessmentAttempt.findOneAndUpdate, AssessmentResponse.create,
    AssessmentResponse.find, mongoose.connection.transaction] = originalResponseIO
  if (oldSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = oldSecret
  if (oldDuration === undefined) delete process.env.JWT_EXPIRES_IN
  else process.env.JWT_EXPIRES_IN = oldDuration
  if (server) await new Promise(resolve => server.close(resolve))
})
