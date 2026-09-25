// Local HTTP contract regression for the complete official 450-item lifecycle.
// Application code is exercised through the real app, controllers, services, and delivery.
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const app = require('../dist/app').default
const manifest = require('../data/ppoaf-original-450.v1.manifest.json')
const { Teacher } = require('../dist/models/Teacher')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')

const teacherId = new mongoose.Types.ObjectId()
const officialItems = manifest.items.map(item => ({ ...item, _id: new mongoose.Types.ObjectId() }))
const responses = []
const secret = randomBytes(32).toString('hex')
const oldSecret = process.env.JWT_SECRET
const oldDuration = process.env.JWT_EXPIRES_IN
process.env.JWT_SECRET = secret
process.env.JWT_EXPIRES_IN = '1h'
const token = jwt.sign({ email: 'official-e2e@example.invalid' }, secret, {
  algorithm: 'HS256', subject: String(teacherId), expiresIn: '1h',
})

let attempt
let server
const original = {
  teacherFindById: Teacher.findById,
  attemptFindOne: AssessmentAttempt.findOne,
  attemptCreate: AssessmentAttempt.create,
  attemptFindOneAndUpdate: AssessmentAttempt.findOneAndUpdate,
  itemFind: AssessmentItem.find,
  itemExists: AssessmentItem.exists,
  responseCreate: AssessmentResponse.create,
  responseFind: AssessmentResponse.find,
  transaction: mongoose.connection.transaction,
}

function same(value, expected) {
  return value !== undefined && String(value) === String(expected)
}

function responseQuery(filter) {
  const matching = responses.filter(response =>
    same(response.teacherId, filter.teacherId) && same(response.attemptId, filter.attemptId))
  return {
    session() { return this },
    async lean() { return matching },
    async sort() { return matching },
  }
}

Teacher.findById = id => ({
  select: async () => same(id, teacherId)
    ? { _id: teacherId, email: 'official-e2e@example.invalid', isActive: true }
    : null,
})

AssessmentAttempt.findOne = async filter => {
  if (!attempt || !same(attempt.teacherId, filter.teacherId)) return null
  if (filter._id && !same(attempt._id, filter._id)) return null
  if (filter.status && attempt.status !== filter.status) return null
  return attempt
}

AssessmentAttempt.create = async input => {
  attempt = new AssessmentAttempt(input)
  await attempt.validate()
  attempt.save = async function save() { return this }
  return attempt
}

AssessmentAttempt.findOneAndUpdate = async (filter, update) => {
  if (!attempt || !same(attempt._id, filter._id) || !same(attempt.teacherId, filter.teacherId)) return null
  if (filter.status && attempt.status !== filter.status) return null
  if (filter.mode && attempt.mode !== filter.mode) return null
  if (filter.assessmentVersion && attempt.assessmentVersion !== filter.assessmentVersion) return null
  if (filter.selectedItemIds && !attempt.selectedItemIds.some(id => same(id, filter.selectedItemIds))) return null
  if (update.$inc) {
    attempt.currentItemIndex += update.$inc.currentItemIndex || 0
    attempt.__v = (attempt.__v || 0) + (update.$inc.__v || 0)
  }
  if (update.$set) Object.assign(attempt, update.$set)
  return attempt
}

AssessmentItem.find = filter => ({
  select() { return this },
  session() { return this },
  async lean() {
    if (filter.version) return officialItems.slice().reverse()
    return officialItems.filter(item => filter._id.$in.some(id => same(id, item._id)))
  },
})

AssessmentItem.exists = async filter => officialItems.some(item => same(item._id, filter._id))

AssessmentResponse.create = async ([input]) => {
  if (responses.some(response => same(response.itemId, input.itemId))) {
    throw Object.assign(new Error('Duplicate fixture response'), { code: 11000 })
  }
  const response = new AssessmentResponse(input)
  await response.validate()
  responses.push(response)
  return [response]
}

AssessmentResponse.find = responseQuery
mongoose.connection.transaction = async operation => operation({})

async function request(method, path, body) {
  const result = await fetch(`${server.url}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: result.status, body: await result.json() }
}

async function run() {
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  server.url = `http://127.0.0.1:${server.address().port}`
  const root = '/api/assessment/attempts'
  const input = { consentConfirmed: true, mode: 'official' }

  const started = await request('POST', root, input)
  assert.equal(started.status, 201)
  assert.equal(started.body.attempt.mode, 'official')
  assert.equal(started.body.attempt.assessmentVersion, manifest.assessmentVersion)
  assert.equal(started.body.attempt.totalItems, 450)
  assert.equal(started.body.attempt.questions.length, 450)
  assert.deepEqual(started.body.attempt.questions.map(question => question.itemId), started.body.attempt.selectedItemIds)
  assert.equal(new Set(started.body.attempt.selectedItemIds).size, 450)
  const delivered = started.body.attempt

  const saved = await request('POST', `${root}/${delivered.id}/responses`, {
    itemId: delivered.selectedItemIds[0], selectedResponse: '3', responseValue: '3',
  })
  assert.equal(saved.status, 201)
  assert.equal(saved.body.response.itemId, delivered.selectedItemIds[0])

  const resumed = await request('GET', `${root}/current`)
  assert.equal(resumed.status, 200)
  assert.equal(resumed.body.attempt.id, delivered.id)
  assert.equal(resumed.body.attempt.currentItemIndex, 1)
  assert.deepEqual(resumed.body.attempt.questions, delivered.questions)

  for (let index = 1; index < 449; index++) {
    responses.push(new AssessmentResponse({
      teacherId, attemptId: attempt._id, itemId: officialItems[index]._id, selectedResponse: '3', answeredAt: new Date(),
    }))
  }
  assert.equal(responses.length, 449)

  const blocked = await request('POST', `${root}/${delivered.id}/submit`)
  assert.equal(blocked.status, 409)
  assert.match(blocked.body.message, /450 valid responses/)
  assert.equal(attempt.status, 'in_progress')

  const finalSave = await request('POST', `${root}/${delivered.id}/responses`, {
    itemId: delivered.selectedItemIds[449], selectedResponse: '3', responseValue: '3',
  })
  assert.equal(finalSave.status, 201)
  assert.equal(responses.length, 450)

  const submitted = await request('POST', `${root}/${delivered.id}/submit`)
  assert.equal(submitted.status, 200)
  assert.equal(submitted.body.attempt.status, 'submitted')
  assert.equal(attempt.status, 'completed')

  const firstScore = await request('POST', `${root}/${delivered.id}/score`)
  assert.equal(firstScore.status, 200)
  assert.equal(firstScore.body.scoring.scoringVersion, 'ppoaf-original-scoring.v1')
  assert.equal(firstScore.body.scoring.domains.length, 9)

  const repeatedScore = await request('POST', `${root}/${delivered.id}/score`)
  assert.equal(repeatedScore.status, 200)
  assert.deepEqual(repeatedScore.body.scoring, firstScore.body.scoring)
  console.log('PASS: official 450 start, delivery, save, resume, 449-response submission block, 450 submit, score, and repeated score.')
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  Object.assign(Teacher, { findById: original.teacherFindById })
  Object.assign(AssessmentAttempt, {
    findOne: original.attemptFindOne,
    create: original.attemptCreate,
    findOneAndUpdate: original.attemptFindOneAndUpdate,
  })
  Object.assign(AssessmentItem, { find: original.itemFind, exists: original.itemExists })
  Object.assign(AssessmentResponse, { create: original.responseCreate, find: original.responseFind })
  mongoose.connection.transaction = original.transaction
  if (oldSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = oldSecret
  if (oldDuration === undefined) delete process.env.JWT_EXPIRES_IN
  else process.env.JWT_EXPIRES_IN = oldDuration
  if (server) await new Promise(resolve => server.close(resolve))
})
