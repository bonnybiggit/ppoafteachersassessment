const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const scoring = require('../dist/services/assessmentScoring')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')
const { ASSESSMENT_DOMAINS } = require('../dist/models/AssessmentItem')
const { REVERSE_NUMBERS, OFFICIAL_VERSION } = require('../dist/services/officialAssessmentImport')

assert.equal(scoring.officialResponseScore('1', false), 0)
assert.equal(scoring.officialResponseScore('5', false), 100)
assert.equal(scoring.officialResponseScore('1', true), 100)
assert.equal(scoring.officialResponseScore('5', true), 0)
assert.equal(scoring.officialResponseScore('0', false), null)
assert.equal(scoring.officialResponseScore('6', false), null)
assert.equal(scoring.classifyOfficialScore(20), 'Emerging')
assert.equal(scoring.classifyOfficialScore(20.01), 'Developing')
assert.equal(scoring.classifyOfficialScore(40), 'Developing')
assert.equal(scoring.classifyOfficialScore(40.01), 'Consolidating')
assert.equal(scoring.classifyOfficialScore(60), 'Consolidating')
assert.equal(scoring.classifyOfficialScore(60.01), 'Advanced')
assert.equal(scoring.classifyOfficialScore(80), 'Advanced')
assert.equal(scoring.classifyOfficialScore(80.01), 'Highly Developed')
assert.equal(scoring.displayOfficialScore(12.345), 12.35)
assert.equal(scoring.displayOfficialScore(12.344), 12.34)
const reverseKeys = REVERSE_NUMBERS.flatMap((numbers, domainIndex) => numbers.map(number => `${domainIndex + 1}:${number}`))
assert.equal(reverseKeys.length, 34)
assert.equal(new Set(reverseKeys).size, 34)

const items = ASSESSMENT_DOMAINS.flatMap((domain, domainIndex) => Array.from({ length: 50 }, (_, index) => {
  const sourceQuestionNumber = index + 1
  const id = new mongoose.Types.ObjectId()
  return {
    _id: id,
    itemId: `${OFFICIAL_VERSION}:D${domainIndex + 1}:Q${String(sourceQuestionNumber).padStart(2, '0')}`,
    primaryDomain: domain,
    section: sourceQuestionNumber <= 30 ? 'A' : 'B',
    sourceQuestionNumber,
    domainNumber: domainIndex + 1,
    assessmentVersion: OFFICIAL_VERSION,
    mode: 'official',
    reverseKeyed: reverseKeys.includes(`${domainIndex + 1}:${sourceQuestionNumber}`),
  }
}))
const responses = items.map(item => ({ itemId: item._id, selectedResponse: '1' }))
const attemptId = new mongoose.Types.ObjectId()
const teacherId = new mongoose.Types.ObjectId()
const attempt = {
  _id: attemptId,
  teacherId,
  status: 'completed',
  mode: 'official',
  assessmentVersion: OFFICIAL_VERSION,
  totalItems: 450,
  selectedItemIds: items.map(item => item._id),
  scoring: undefined,
}
let persisted
const originals = [AssessmentAttempt.findOne, AssessmentAttempt.findOneAndUpdate, AssessmentItem.find, AssessmentResponse.find]
const originalTransaction = mongoose.connection.transaction
mongoose.connection.transaction = async callback => callback({})
AssessmentAttempt.findOne = async () => attempt
AssessmentAttempt.findOneAndUpdate = async (_filter, update) => {
  const current = await AssessmentAttempt.findOne()
  if (update.$set) { persisted = update.$set.scoring; current.scoring = persisted }
  return current
}
AssessmentItem.find = () => ({ session() { return this }, lean: async () => items })
AssessmentResponse.find = () => ({ session() { return this }, lean: async () => responses })

async function run() {
  const result = await scoring.scoreAttemptForTeacher(String(teacherId), String(attemptId))
  assert.equal(result.scoringVersion, 'ppoaf-original-scoring.v1')
  assert.equal(result.domains.length, 9)
  assert(result.domains.every(domain => domain.expectedItemCount === 50 && domain.validItemCount === 50))
  const expectedDomainScores = REVERSE_NUMBERS.map(numbers => {
    const sectionAScore = numbers.filter(number => number <= 30).length * 100 / 30
    const sectionBScore = numbers.filter(number => number > 30).length * 100 / 20
    return sectionAScore * 0.60 + sectionBScore * 0.40
  })
  result.domains.forEach((domain, index) => assert.equal(domain.score, Number(expectedDomainScores[index].toFixed(2))))
  assert.equal(result.domains[0].score, 6)
  assert.equal(result.domains[0].domainWeight, scoring.DOMAIN_WEIGHTS[ASSESSMENT_DOMAINS[0]])
  assert.equal(result.overallCompetencyScore, Number(result.overallCompetencyScore.toFixed(2)))
  assert.equal(persisted.scoringVersion, 'ppoaf-original-scoring.v1')
  const expectedOverall = expectedDomainScores.reduce((total, score, index) => total + score * scoring.DOMAIN_WEIGHTS[ASSESSMENT_DOMAINS[index]], 0)
  assert.equal(persisted.overallCompetencyScore, expectedOverall)
  assert.equal(result.overallCompetencyScore, Number(expectedOverall.toFixed(2)))
  assert.equal(attempt.scoring.scoringVersion, 'ppoaf-original-scoring.v1')

  const incomplete = { ...attempt, _id: new mongoose.Types.ObjectId(), scoring: undefined }
  AssessmentAttempt.findOne = async () => incomplete
  AssessmentResponse.find = () => ({ session() { return this }, lean: async () => responses.slice(1) })
  await assert.rejects(() => scoring.scoreAttemptForTeacher(String(teacherId), String(incomplete._id)), /450 complete responses/)

  console.log('PASS: official mappings, exact reverse set, 450-response validation, section/domain weighting, version gating, levels, and display precision.')
}

run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  ;[AssessmentAttempt.findOne, AssessmentAttempt.findOneAndUpdate, AssessmentItem.find, AssessmentResponse.find] = originals
  mongoose.connection.transaction = originalTransaction
})
