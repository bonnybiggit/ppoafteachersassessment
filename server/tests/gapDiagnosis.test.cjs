// Synthetic fixtures only; no dotenv or database connection.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { diagnoseGaps, teacherSafeGapDiagnosis } = require('../dist/services/gapDiagnosis')
const { reportedContext } = require('../dist/services/gapDiagnosisService')
const { GAP_RULES } = require('../dist/services/gapDiagnosisRules')
const { domain, scoringFixture, evidenceFor, TYPES, SJT, BF, KA, RJ, PE } = require('./helpers/diagnosticFixtures.cjs')
test('gap API ownership, lifecycle, teacher safety, cache persistence and invalidation', () => require('./helpers/diagnosticApi.cjs')('gaps'))
function diagnose(scores, context = {}, signals = [], index = 0) {
  const source = scoringFixture(domain({ evidenceTypeScores: scores }, index))
  return diagnoseGaps(source, evidenceFor(source, signals), context)
}
const has = (result, type, index = 0) => result.domains[index].gaps.some(gap => gap.type === type)
for (const [type, scores, context, signals, index] of [
  ['knowledge', { [KA]: 20 }], ['judgement', { [SJT]: 20 }], ['practice', { [PE]: 20 }],
  ['reflection', { [RJ]: 20 }], ['calibration', { [BF]: 20 }],
  ['confidence', { [BF]: 20 }, { selfEfficacyResilience: 'developing' }],
  ['exposure', { [PE]: 20 }, { digitalTeachingExperience: 'basic' }, ['limited_opportunity'], 6],
  ['resource_access', { [PE]: 20 }, {}, ['resource_access_barrier']],
  ['context_complexity', { [PE]: 20 }, { classSize: 60 }, ['complex_context'], 2],
  ['readiness', { [PE]: 20, [BF]: 20 }],
]) test(`${type} follows evidence patterns and applicable explicit context`, () => {
  assert(has(diagnose(scores, context, signals, index), type, index))
})
test('insufficient, missing, near-threshold and uniformly low evidence do not manufacture gaps', () => {
  for (const patch of [{ score: null }, { classification: 'Insufficient Data' }, { validItemCount: 8 },
    { qualityFlags: ['insufficient_responses'] }]) {
    const source = scoringFixture(domain({ evidenceTypeScores: { [KA]: 0 }, ...patch }))
    const result = diagnoseGaps(source, evidenceFor(source))
    assert.equal(result.domains[0].gapStatus, 'insufficient_evidence')
    assert.equal(result.domains[0].gaps.length, 0)
    assert(!result.priorityGaps.some(gap => gap.domainId === 'D1'))
  }
  assert(!has(diagnose({ [KA]: null }), 'knowledge'))
  assert(!has(diagnose({ [PE]: null }), 'practice'))
  assert.equal(diagnose(Object.fromEntries(TYPES.map(type => [type, 10]))).domains[0].gaps.length, 0)
  assert.equal(diagnose({ [KA]: 80 - GAP_RULES.meaningfulDifference + .01 }).domains[0].gaps.length, 0)
})
test('context alone cannot create gaps or change scores; protected demographics are ignored', () => {
  const context = { age: 90, gender: 'female', incomeRange: 'low', schoolLocation: 'rural', classSize: 90,
    cpdExperience: 'none', digitalTeachingExperience: 'basic', selfEfficacyResilience: 'developing' }
  const source = scoringFixture(), before = JSON.stringify(source)
  assert.equal(diagnoseGaps(source, evidenceFor(source, ['limited_opportunity', 'resource_access_barrier', 'complex_context']), context).priorityGaps.length, 0)
  assert.equal(JSON.stringify(source), before)
  const weak = scoringFixture(domain({ evidenceTypeScores: { [KA]: 20 } }))
  assert.deepEqual(diagnoseGaps(weak, evidenceFor(weak), { age: 20 }), diagnoseGaps(weak, evidenceFor(weak), { age: 90, gender: 'female' }))
  assert(!has(diagnose({ [PE]: 20 }, { cpdExperience: 'none' }), 'exposure'))
  assert(!has(diagnose({ [PE]: 20 }, { classSize: 100 }), 'context_complexity'))
  assert(!has(diagnose({ [BF]: 20 }), 'confidence'))
  assert(!has(diagnose({ [PE]: 20 }, { incomeRange: 'low' }), 'resource_access'))
  assert.deepEqual(reportedContext('A'), [])
  assert.deepEqual(reportedContext({ context: { resourceAccessBarrier: 'true' } }), [])
  assert.deepEqual(reportedContext({ optionId: 'A', context: { resourceAccessBarrier: true } }), ['resource_access_barrier'])
})
test('critical and near-cut signals preserve scores, classifications and confidence', () => {
  const source = scoringFixture(domain({ evidenceTypeScores: { [KA]: 20 }, score: 40, classification: 'Basic',
    nearCutScore: true, criticalItemFlagged: true, criticalItemIds: ['PRIVATE'], confidenceLevel: 'Low' }))
  const before = JSON.stringify(source), result = diagnoseGaps(source, evidenceFor(source))
  assert.equal(result.domains[0].score, 40)
  assert.equal(result.domains[0].classification, 'Basic')
  assert.equal(result.domains[0].nearCutScore, true)
  assert.equal(result.reviewRequired, true)
  assert(result.domains[0].reviewReason.includes('human review'))
  assert.equal(result.domains[0].gaps[0].confidence, 'Low')
  assert.deepEqual(result, diagnoseGaps(source, evidenceFor(source).reverse()))
  assert.equal(JSON.stringify(source), before)
  assert(!JSON.stringify(result).includes('PRIVATE'))
})
test('stable priorities, max three gaps, metadata-derived areas and teacher-safe projection', () => {
  const source = scoringFixture()
  source.domains = source.domains.map((_, index) => domain({ evidenceTypeScores: { [KA]: 20 } }, index))
  const evidence = evidenceFor(source)
  evidence.filter(item => item.domain === source.domains[4].domain && item.evidenceType === KA)
    .forEach(item => { item.subcompetency = 'existing-area'; item.score = 0 })
  const before = JSON.stringify({ source, evidence }), result = diagnoseGaps(source, evidence)
  assert.equal(result.priorityGaps.length, 3)
  assert.deepEqual(result.priorityGaps.map(gap => gap.domainId), ['D5', 'D1', 'D3'])
  assert.equal(result.domains[4].gaps[0].subcompetency, 'existing-area')
  assert.deepEqual(result, diagnoseGaps(source, evidence))
  assert.equal(JSON.stringify({ source, evidence }), before)
  result.responseKey = 'PRIVATE'; result.domains[0].discrimination = 999; result.priorityGaps[0].ruleThreshold = 15
  const safe = teacherSafeGapDiagnosis(result)
  for (const key of ['responseKey', 'discrimination', 'socialDesirabilityRisk', 'ruleThreshold', 'criticalItemIds', 'PRIVATE']) assert(!JSON.stringify(safe).includes(key))
})
