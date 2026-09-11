// Offline assembly tests. No database connection or records.
const assert = require('node:assert/strict')
const { assembleAssessment, DEFAULT_ASSESSMENT_LENGTH, PILOT_ASSESSMENT_MODE } = require('../dist/services/assessmentAssembly')
const { ASSESSMENT_DOMAINS } = require('../dist/models/AssessmentItem')
const { PILOT_ASSESSMENT_BLUEPRINT } = require('../dist/services/pilotAssessmentBlueprint')

const items = ASSESSMENT_DOMAINS.flatMap((primaryDomain, d) => Array.from({ length: 10 }, (_, i) => ({
  _id: `${d}-${i}`,
  itemId: `TEST-${d}-${String(i).padStart(2, '0')}`,
  primaryDomain,
  isActive: true,
  responseKey: { private: true },
  profileTags: ['low_resource'],
})))

const original = JSON.stringify(items)
const selected = assembleAssessment(items)
assert.equal(selected.length, DEFAULT_ASSESSMENT_LENGTH)
assert.equal(new Set(selected.map(x => x._id)).size, 30)
assert.deepEqual(assembleAssessment([...items].reverse()), selected)
assert.equal(JSON.stringify(items), original)
for (const x of selected) assert(items.includes(x), 'Preserve candidate metadata without mutation')
const counts = ASSESSMENT_DOMAINS.map(d => selected.filter(x => x.primaryDomain === d).length)
assert(Math.max(...counts) - Math.min(...counts) <= 1)
assert.equal(assembleAssessment(items, 7).length, 7)
assert.equal(assembleAssessment(items, 100).length, 90)
assert.deepEqual(assembleAssessment([]), [])
for (const count of [0, -1, 0.5, Infinity, NaN, '30']) assert.throws(() => assembleAssessment(items, count), RangeError)
const sparse = items.filter(x => x.primaryDomain === ASSESSMENT_DOMAINS[0] || x._id === '1-0')
assert.equal(assembleAssessment(sparse, 10).length, 10)
assert(assembleAssessment(sparse, 10).some(x => x._id === '1-0'))
assert.deepEqual(assembleAssessment([...items, ...items]), selected)
assert.deepEqual(assembleAssessment([...items, { ...items[0], _id: 'duplicate-bank-id' }]), selected)
assert.deepEqual(assembleAssessment([{ ...items[0], isActive: false }]), [])
assert.deepEqual(assembleAssessment([{ ...items[0], primaryDomain: 'unknown' }]), [])
assert.deepEqual(assembleAssessment(items.map(x => ({ ...x, profileTags: ['urban'] }))).map(x => x._id), selected.map(x => x._id))

const evidencePool = [
  'situational judgement', 'situational judgement', 'situational judgement', 'situational judgement',
  'behaviour frequency', 'behaviour frequency', 'behaviour frequency',
  'knowledge/application', 'knowledge/application',
  'reflective judgement', 'reflective judgement',
  'performance evidence',
  'situational judgement', 'behaviour frequency', 'knowledge/application', 'reflective judgement', 'performance evidence',
  'situational judgement', 'behaviour frequency', 'knowledge/application',
]

const pilotBank = ASSESSMENT_DOMAINS.flatMap((primaryDomain, d) => evidencePool.map((evidenceType, i) => ({
  _id: `${primaryDomain}-${i}`,
  itemId: `P-${d}-${String(i).padStart(2, '0')}`,
  primaryDomain,
  subcompetency: `sub-${(d + i) % 5}`,
  evidenceType,
  difficulty: (i % 3) + 1,
  socialDesirabilityRisk: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'medium' : 'high',
  criticalFlag: i === 0,
  isActive: false,
  version: 'synthetic.v0.1',
  prompt: `Pilot question ${d}-${i}`,
  profileTags: [],
  responseKey: { options: [{ id: 'A', label: 'One' }, { id: 'B', label: 'Two' }] },
  reverseKeyed: false,
  courseTags: [],
})))

const pilotSelection = assembleAssessment(pilotBank, PILOT_ASSESSMENT_BLUEPRINT.totalItems, { assessmentMode: PILOT_ASSESSMENT_MODE })
assert.equal(pilotSelection.length, PILOT_ASSESSMENT_BLUEPRINT.totalItems)
assert.equal(new Set(pilotSelection.map(item => item.itemId)).size, pilotSelection.length)
const perDomain = ASSESSMENT_DOMAINS.map(domain => ({ domain, count: pilotSelection.filter(item => item.primaryDomain === domain).length }))
assert.deepEqual(perDomain.every(item => item.count === 12), true)
const evidenceCounts = {}
for (const item of pilotSelection) {
  evidenceCounts[item.evidenceType] = (evidenceCounts[item.evidenceType] ?? 0) + 1
}
assert.equal(evidenceCounts['situational judgement'], 36)
assert.equal(evidenceCounts['behaviour frequency'], 27)
assert.equal(evidenceCounts['knowledge/application'], 18)
assert.equal(evidenceCounts['reflective judgement'], 18)
assert.equal(evidenceCounts['performance evidence'], 9)
assert.deepEqual(assembleAssessment(pilotBank, PILOT_ASSESSMENT_BLUEPRINT.totalItems, { assessmentMode: PILOT_ASSESSMENT_MODE }), pilotSelection)
console.log('PASS: deterministic order, all nine domains, balanced/sparse coverage, active-only selection, uniqueness, configurable length, metadata preservation and profile-independent routing.')
