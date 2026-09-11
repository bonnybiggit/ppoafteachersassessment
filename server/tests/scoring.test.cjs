const assert = require('node:assert/strict')

const scoring = require('../dist/services/assessmentScoring')

assert.ok(scoring)
assert.ok(scoring.DOMAIN_WEIGHTS)
assert.ok(scoring.EVIDENCE_TYPE_WEIGHTS)
assert.equal(typeof scoring.classifyCompetencyScore, 'function')
assert.equal(typeof scoring.scoreAttemptForTeacher, 'function')
assert.equal(typeof scoring.getAttemptScoring, 'function')

const total = Object.values(scoring.DOMAIN_WEIGHTS).reduce((sum, value) => sum + value, 0)
assert.ok(Math.abs(total - 1) < 1e-9, `Domain weights must sum to 1.0 within floating-point tolerance, received ${total}`)
assert.equal(scoring.classifyCompetencyScore(20), 'Emerging')
assert.equal(scoring.classifyCompetencyScore(21), 'Basic')
assert.equal(scoring.classifyCompetencyScore(40), 'Basic')
assert.equal(scoring.classifyCompetencyScore(41), 'Competent')
assert.equal(scoring.classifyCompetencyScore(60), 'Competent')
assert.equal(scoring.classifyCompetencyScore(61), 'Advanced')
assert.equal(scoring.classifyCompetencyScore(80), 'Advanced')
assert.equal(scoring.classifyCompetencyScore(81), 'Transformational')

const weightedExample = scoring.calculateEvidenceWeightedScore({ 'situational judgement': 80, 'behaviour frequency': 60, 'knowledge/application': 40 }, ['situational judgement', 'behaviour frequency', 'knowledge/application'])
assert.ok(Math.abs(weightedExample - ((80 * 0.30 + 60 * 0.20 + 40 * 0.20) / (0.30 + 0.20 + 0.20))) < 1e-9)
const missingEvidenceExample = scoring.calculateEvidenceWeightedScore({ 'situational judgement': 80, 'behaviour frequency': null, 'knowledge/application': 40 }, ['situational judgement', 'knowledge/application'])
assert.ok(Math.abs(missingEvidenceExample - ((80 * 0.30 + 40 * 0.20) / (0.30 + 0.20))) < 1e-9)
assert.equal(scoring.calculateEvidenceWeightedScore({ 'situational judgement': 80 }, ['situational judgement']), 80)

console.log('PASS: scoring service exposes deterministic domain weights, evidence weighting, and competency banding.')
