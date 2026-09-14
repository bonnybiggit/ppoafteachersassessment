// Exercise real Express/JWT/services with in-memory model I/O, never MongoDB.
module.exports = async function verifyDiagnosticApi(target) {
  const assert = require('node:assert/strict'), mongoose = require('mongoose'), jwt = require('jsonwebtoken')
  const { randomBytes } = require('node:crypto'), { once } = require('node:events')
  const { domain, scoringFixture, evidenceFor, KA } = require('./diagnosticFixtures.cjs')
  const { Teacher } = require('../../dist/models/Teacher')
  const { AssessmentAttempt } = require('../../dist/models/AssessmentAttempt')
  const { AssessmentItem } = require('../../dist/models/AssessmentItem')
  const { AssessmentResponse } = require('../../dist/models/AssessmentResponse')
  const app = require('../../dist/app').default
  const owner = new mongoose.Types.ObjectId(), other = new mongoose.Types.ObjectId()
  const source = scoringFixture(domain({ evidenceTypeScores: { [KA]: 20 } }))
  const items = evidenceFor(source).map((evidence, i) => ({ ...evidence, _id: new mongoose.Types.ObjectId(),
    itemId: `FIXTURE-${i}`, primaryDomain: evidence.domain, reverseKeyed: false,
    responseKey: { orderedOptionIds: Array.from({ length: 11 }, (_, n) => `C${n}`), private: 'PRIVATE' } }))
  const responses = items.map(item => ({ itemId: item._id, selectedResponse: `C${item.score / 10}` }))
  const attempt = new AssessmentAttempt({ teacherId: owner, status: 'completed', mode: 'pilot-synthetic',
    assessmentVersion: 'fixture', totalItems: items.length, selectedItemIds: items.map(item => item._id), consentConfirmed: true, scoring: source })
  const profile = { _id: owner, email: 'fixture@example.invalid', isActive: true }
  const writes = { gapDiagnosis: 0, recommendations: 0 }
  let race = false, server
  const original = [Teacher.findById, AssessmentAttempt.findOne, AssessmentAttempt.findOneAndUpdate, AssessmentItem.find, AssessmentResponse.find]
  const oldSecret = process.env.JWT_SECRET, oldExpiry = process.env.JWT_EXPIRES_IN
  process.env.JWT_SECRET = randomBytes(32).toString('hex'); process.env.JWT_EXPIRES_IN = '1h'
  const token = id => jwt.sign({ email: 'fixture@example.invalid' }, process.env.JWT_SECRET, { subject: String(id), expiresIn: '1h' })
  const query = value => ({ select() { return this }, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) })
  Teacher.findById = id => query({ ...profile, _id: id })
  AssessmentAttempt.findOne = async filter => String(filter._id) === String(attempt._id) && String(filter.teacherId) === String(owner) ? attempt : null
  AssessmentItem.find = () => query(items)
  AssessmentResponse.find = filter => { assert.equal(String(filter.teacherId), String(owner)); return query(responses) }
  AssessmentAttempt.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(filter.status, 'completed'); assert.equal(options.runValidators, true)
    assert.equal(Object.keys(update.$set).length, 1)
    const field = Object.keys(update.$set)[0]
    assert(['gapDiagnosis', 'recommendations'].includes(field))
    if (race) return null
    writes[field]++; attempt.set(field, update.$set[field]); await attempt.validate(); return attempt
  }
  try {
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
    const root = `http://127.0.0.1:${server.address().port}/api/assessment/attempts/${attempt.id}`
    const url = `${root}/${target}`
    const request = async (auth, location = url) => { const r = await fetch(location, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} }); return { status: r.status, body: await r.json() } }
    const ownerToken = token(owner)
    assert.equal((await request()).status, 401)
    assert.equal((await request(token(other))).status, 404)
    profile.isActive = false; assert.equal((await request(ownerToken)).status, 401); profile.isActive = true
    assert.equal((await request(ownerToken, url.replace(attempt.id, 'bad'))).status, 400)
    attempt.status = 'in_progress'; assert.equal((await request(ownerToken)).status, 409); attempt.status = 'completed'
    const scoring = attempt.scoring; attempt.scoring = undefined
    assert.equal((await request(ownerToken)).status, 409); attempt.scoring = scoring
    if (target === 'recommendations') {
      assert.equal((await request(ownerToken)).status, 409, 'Diagnosis is a required dependency')
      assert.equal((await request(ownerToken, `${root}/gaps`)).status, 200)
    }
    const before = JSON.stringify(attempt.scoring), gapBefore = JSON.stringify(attempt.gapDiagnosis)
    const first = await request(ownerToken); assert.equal(first.status, 200)
    assert.deepEqual((await request(ownerToken)).body, first.body)
    assert.equal(writes.gapDiagnosis, 1)
    if (target === 'recommendations') {
      assert.equal(writes.recommendations, 1)
      assert.equal(JSON.stringify(attempt.gapDiagnosis), gapBefore)
      assert(first.body.recommendations.recommendations.length > 0)
      assert(attempt.recommendations.audit.some(entry => entry.components))
      // Cached payloads still undergo explicit field projection.
      attempt.recommendations.result.recommendations[0].components = { secret: 'PRIVATE' }
      assert.deepEqual((await request(ownerToken)).body, first.body)
    } else assert(first.body.diagnosis.domains[0].gaps.some(gap => gap.type === 'knowledge'))
    assert.equal(JSON.stringify(attempt.scoring), before)
    for (const key of ['PRIVATE', 'responseKey', 'sourceFingerprint', 'criticalItemIds', '__v', '"_id"', 'components', 'ruleIds', 'penalties']) assert(!JSON.stringify(first.body).includes(key))
    attempt.scoring.scoredAt = new Date('2026-09-02T00:00:00Z')
    assert.equal((await request(ownerToken)).status, 200)
    assert.equal(writes.gapDiagnosis, 2)
    if (target === 'recommendations') assert.equal(writes.recommendations, 2)
    attempt.scoring.scoredAt = new Date('2026-09-03T00:00:00Z'); race = true
    assert.equal((await request(ownerToken)).status, 409)
    assert.equal(mongoose.connection.readyState, 0)
    assert.equal(items.length, 108); assert.equal(responses.length, 108)
  } finally {
    ;[Teacher.findById, AssessmentAttempt.findOne, AssessmentAttempt.findOneAndUpdate, AssessmentItem.find, AssessmentResponse.find] = original
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret
    if (oldExpiry === undefined) delete process.env.JWT_EXPIRES_IN; else process.env.JWT_EXPIRES_IN = oldExpiry
    if (server) await new Promise(resolve => server.close(resolve))
  }
}
