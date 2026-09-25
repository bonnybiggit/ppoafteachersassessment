// Uses real MongoDB transactions on temporary attempts; bank/response fixtures stay in memory.
require('dotenv/config')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { connectDatabase } = require('../dist/config/database')
const scoring = require('../dist/services/assessmentScoring')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')
const manifest = require('../data/ppoaf-original-450.v1.manifest.json')
const items = manifest.items.map(item => ({ ...item, _id: new mongoose.Types.ObjectId() }))
let responses = items.map(item => ({ itemId: item._id, selectedResponse: '3' }))
let itemReads = 0, responseReads = 0
const originalItemFind = AssessmentItem.find
const originalResponseFind = AssessmentResponse.find
const ids = []
AssessmentItem.find = () => ({ session() { return this }, async lean() { itemReads++; return items } })
AssessmentResponse.find = () => ({ session() { return this }, async lean() { responseReads++; return responses } })

async function createAttempt(overrides = {}) {
  const attempt = await AssessmentAttempt.create({
    teacherId: new mongoose.Types.ObjectId(), status: 'completed', completedAt: new Date(),
    mode: 'official', assessmentVersion: manifest.assessmentVersion, totalItems: 450,
    selectedItemIds: items.map(item => item._id), consentConfirmed: true, ...overrides,
  })
  ids.push(attempt._id)
  return attempt
}

async function run() {
  await connectDatabase()
  const attempt = await createAttempt()
  const args = [String(attempt.teacherId), String(attempt._id)]
  // Separate callers get separate document snapshots; the database must serialize them.
  const settled = await Promise.allSettled(Array.from({ length: 9 }, (_, index) => [
    scoring.getAttemptScoring, scoring.scoreAttemptForTeacher, scoring.scoreOfficialAttemptForTeacher,
  ][index % 3](...args)))
  const results = settled.map(result => {
    if (result.status === 'rejected') throw result.reason
    return result.value
  })
  assert.equal(itemReads, 1, 'Only one request may load items/calculate')
  assert.equal(responseReads, 1, 'Only one request may load responses/calculate')
  for (const result of results) assert.deepEqual(result, results[0])
  const stored = (await AssessmentAttempt.findById(attempt._id)).scoring.toObject()
  for (const call of [scoring.getAttemptScoring, scoring.scoreAttemptForTeacher, scoring.scoreOfficialAttemptForTeacher]) {
    assert.deepEqual(await call(...args), results[0])
  }
  assert.deepEqual((await AssessmentAttempt.findById(attempt._id)).scoring.toObject(), stored)
  assert.equal(itemReads, 1)
  assert.equal(responseReads, 1)
  console.log('PASS: concurrent GET/POST/direct requests calculate once; repeated requests reuse identical saved results and timestamp.')

  const incomplete = await createAttempt()
  const incompleteArgs = [String(incomplete.teacherId), String(incomplete._id)]
  responses = responses.slice(0, 449)
  await assert.rejects(() => scoring.scoreAttemptForTeacher(...incompleteArgs), /450 complete responses/)
  assert.equal((await AssessmentAttempt.findById(incomplete._id)).scoring, undefined)
  responses.push({ itemId: items[449]._id, selectedResponse: '3' })
  await scoring.scoreAttemptForTeacher(...incompleteArgs)
  assert((await AssessmentAttempt.findById(incomplete._id)).scoring)
  console.log('PASS: failed scoring rolls back and can be retried.')

  const incompatible = await createAttempt({ scoring: { ...stored, scoringVersion: 'unknown' } })
  const pending = await createAttempt({ status: 'in_progress' })
  for (const call of [scoring.getAttemptScoring, scoring.scoreAttemptForTeacher, scoring.scoreOfficialAttemptForTeacher]) {
    await assert.rejects(() => call(String(incompatible.teacherId), String(incompatible._id)), /incompatible scoring version/)
    await assert.rejects(() => call(String(pending.teacherId), String(pending._id)), /submitted/)
  }
  console.log('PASS: all official entry points reject unsubmitted attempts and incompatible saved scoring.')

}

run().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  AssessmentItem.find = originalItemFind
  AssessmentResponse.find = originalResponseFind
  try {
    if (ids.length) {
      await AssessmentAttempt.deleteMany({ _id: { $in: ids } })
      assert.equal(await AssessmentAttempt.countDocuments({ _id: { $in: ids } }), 0)
      console.log('PASS: temporary attempts removed; no bank items or responses written.')
    }
  } finally { await mongoose.disconnect() }
})
