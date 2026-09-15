const assert = require('node:assert/strict')

const scoring = require('../dist/services/assessmentScoring')

assert.ok(scoring)
// The five actual pilot written tasks remain unscored after text capture support.
const fs = require('node:fs')
const path = require('node:path')
const writtenIds = new Set(['D5-PL-PE-048', 'D6-RE-PE-045', 'D7-DF-PE-048', 'D8-PE-PE-048', 'D9-CE-PE-045'])
const dataDir = path.join(__dirname, '../data')
let writtenChecks = 0
for (const file of fs.readdirSync(dataDir).filter(file => file.endsWith('.synthetic.v0.1.json') && !file.startsWith('courseCatalog'))) {
  for (const raw of JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))) {
    if (!writtenIds.has(raw.itemId ?? raw.item_id)) continue
    const item = { ...raw, responseKey: raw.responseKey ?? raw.response_key }
    assert.equal(item.responseKey.format, 'constructed_response')
    assert.equal(scoring.itemScoreFromResponse(item, { itemId: 'test', selectedResponse: 'A written design and reflection.' }), null)
    writtenChecks++
  }
}
assert.equal(writtenChecks, 5)
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
