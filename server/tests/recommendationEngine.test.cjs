// Synthetic catalog and in-memory fixtures only; no production requests or writes.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { generateRecommendations, teacherSafeRecommendations } = require('../dist/services/recommendationEngine')
const { loadCourseCatalog, validateCourseCatalog } = require('../dist/services/courseCatalog')
const { RECOMMENDATION_WEIGHTS } = require('../dist/services/recommendationRules')
const { diagnosisFixture } = require('./helpers/diagnosticFixtures.cjs')
const realCatalog = loadCourseCatalog()
const sub = 'formative assessment for learning'
function diagnosis(classification = 'Basic') {
  const result = diagnosisFixture({ score: classification === 'Basic' ? 35 : 70, classification }, 4)
  for (const domain of result.domains) for (const gap of domain.gaps) gap.subcompetency = sub
  for (const gap of result.priorityGaps) gap.subcompetency = sub
  return result
}
function course(id = 'PPOAF-D5-101', overrides = {}) {
  return { ...structuredClone(realCatalog.courses.find(item => item.courseId === 'PPOAF-D5-001')),
    courseId: id, subcompetencies: { D5: [sub] }, level: 'developing', prerequisites: [], priorLearningEquivalence: [], ...overrides }
}
const catalog = courses => ({ ...realCatalog, courses })
const run = (courses, context = {}, gaps = diagnosis()) => generateRecommendations(gaps, catalog(courses), context)
const ranked = output => output.result.recommendations
const audit = (output, id) => output.audit.find(entry => entry.courseId === id)

test('27 provisional opportunities cover nine domains, all gap types, and real bank subcompetencies', () => {
  const fs = require('node:fs'), path = require('node:path')
  assert.equal(realCatalog.courses.length, 27)
  assert.equal(new Set(realCatalog.courses.map(item => item.courseId)).size, 27)
  assert.equal(new Set(realCatalog.courses.flatMap(item => item.domains)).size, 9)
  assert.equal(new Set(realCatalog.courses.flatMap(item => item.gapTypes)).size, 10)
  const files = fs.readdirSync(path.join(__dirname, '../data')).filter(file => file.endsWith('.json') && !file.startsWith('courseCatalog'))
  const bankNames = new Set(files.flatMap(file => JSON.parse(fs.readFileSync(path.join(__dirname, '../data', file), 'utf8').replace(/^\uFEFF/, '')).map(item => item.subcompetency)))
  for (const item of realCatalog.courses) for (const names of Object.values(item.subcompetencies)) for (const name of names) assert(bankNames.has(name))
  assert.throws(() => validateCourseCatalog(catalog([course(), course()])))
  assert.throws(() => validateCourseCatalog(catalog([course(undefined, { prerequisites: [{ kind: 'course', value: 'missing', mandatory: true }] })])))
})
test('exact domain, subcompetency, gap and evidence matches outrank broad and secondary matches', () => {
  const exact = course(), broad = course('PPOAF-D5-102', { subcompetencies: { D5: [] } })
  const secondary = course('PPOAF-D7-103', { domains: ['D7'], secondaryDomains: ['D5'] })
  const output = run([broad, secondary, exact])
  assert.equal(ranked(output)[0].courseId, exact.courseId)
  assert(audit(output, exact.courseId).components.needMatch > audit(output, broad.courseId).components.needMatch)
  assert(audit(output, exact.courseId).components.needMatch > audit(output, secondary.courseId).components.needMatch)
  assert.equal(audit(output, exact.courseId).subcompetencyMatch, 100)
  assert.equal(audit(output, exact.courseId).gapTypeMatch, 100)
})
test('unrelated domains, wrong specific subcompetencies, wrong gap types and inactive entries are excluded', () => {
  const courses = [course(undefined, { domains: ['D7'], subcompetencies: { D7: [] } }),
    course('PPOAF-D5-102', { subcompetencies: { D5: ['feedback for learning'] } }),
    course('PPOAF-D5-103', { gapTypes: ['practice'] }), course('PPOAF-D5-104', { active: false })]
  const output = run(courses)
  assert.equal(ranked(output).length, 0)
  assert.equal(output.result.status, 'no_matches')
  assert(output.audit.every(entry => entry.exclusionReasons.length > 0 && entry.score === null))
})
test('formula uses the seven prescribed weights with an auditable component sum', () => {
  assert.deepEqual(Object.values(RECOMMENDATION_WEIGHTS), [.30, .20, .15, .10, .10, .10, .05])
  const entry = run([course()]).audit[0]
  const expected = Object.entries(RECOMMENDATION_WEIGHTS).reduce((sum, [key, weight]) => sum + entry.components[key] * weight, 0)
  assert(Math.abs(entry.score - expected) < .0001)
  assert(Object.values(entry.components).every(score => score >= 0 && score <= 100))
})
test('same inputs and reordered catalogs produce stable ties, maximum three suggestions and two alternatives', () => {
  const courses = Array.from({ length: 7 }, (_, i) => course(`PPOAF-D5-${101 + i}`))
  const original = JSON.stringify(courses), a = run(courses), b = run([...courses].reverse())
  assert.deepEqual(a, b)
  assert.equal(JSON.stringify(courses), original)
  assert.deepEqual(ranked(a).map(item => item.courseId), ['PPOAF-D5-101', 'PPOAF-D5-102', 'PPOAF-D5-103'])
  assert(ranked(a).every(item => item.alternatives.length <= 2))
  const primary = new Set(ranked(a).map(item => item.courseId))
  for (const item of ranked(a)) for (const alternative of item.alternatives) {
    assert(!primary.has(alternative.courseId)); assert.equal(alternative.gapType, item.gapType)
  }
})
test('stored large-class, grade and subject context improve fit without creating a gap', () => {
  const general = course(), contextual = course('PPOAF-D5-102', { largeClassSupport: true, gradeRelevance: ['primary'], subjectRelevance: ['mathematics'] })
  const output = run([general, contextual], { classSize: 60, gradeOrClass: 'primary', subject: 'Mathematics' })
  assert.equal(ranked(output)[0].courseId, contextual.courseId)
  assert(audit(output, contextual.courseId).components.contextFit > audit(output, general.courseId).components.contextFit)
  assert(ranked(output)[0].matchFactors.some(text => text.includes('large-class')))
})
test('limited connectivity and accessibility preferences affect opportunity suitability only', () => {
  const offline = course(), online = course('PPOAF-D5-102', { bandwidth: 'standard_online', accessibility: {
    captions: false, transcript: false, downloadable_materials: false, mobile_friendly: false } })
  const output = run([online, offline], { connectivity: 'limited', accessibilityNeeds: ['transcript', 'mobile_friendly'] })
  assert.equal(ranked(output)[0].courseId, offline.courseId)
  assert(audit(output, offline.courseId).components.accessibility > audit(output, online.courseId).components.accessibility)
  assert(ranked(output)[0].matchFactors.some(text => text.includes('limited-connectivity')))
  assert(!ranked(run([offline]))[0].matchFactors.some(text => text.includes('limited-connectivity')))
  assert.equal(ranked(run([online], { connectivity: 'offline' })).length, 0)
})
test('prerequisites distinguish met, unmet, and unknown; optional requirements produce explained penalties', () => {
  const mandatory = course(undefined, { prerequisites: [{ kind: 'digital_experience', value: 'intermediate', mandatory: true }] })
  assert.equal(ranked(run([mandatory], { digitalTeachingExperience: 'basic' })).length, 0)
  assert.equal(ranked(run([mandatory])).length, 0)
  assert.equal(ranked(run([mandatory], { digitalTeachingExperience: 'advanced' })).length, 1)
  const optional = { ...mandatory, prerequisites: [{ ...mandatory.prerequisites[0], mandatory: false }] }
  const unmet = run([optional], { digitalTeachingExperience: 'basic' })
  assert(unmet.audit[0].penalties.length)
  assert(ranked(unmet)[0].limitations.some(text => text.includes('prerequisite')))
  assert(run([optional]).audit[0].penalties[0].amount < unmet.audit[0].penalties[0].amount)
})
test('course prerequisites and prior equivalence use explicit completions, never CPD as mastery', () => {
  const prerequisite = course('PPOAF-D5-102', { active: false })
  const target = course(undefined, { prerequisites: [{ kind: 'course', value: prerequisite.courseId, mandatory: true }] })
  assert.equal(ranked(run([target, prerequisite], { cpdExperience: 'frequent' })).length, 0)
  assert.equal(ranked(run([target, prerequisite], { completedCourseIds: [prerequisite.courseId] })).length, 1)
  const equivalent = course(undefined, { priorLearningEquivalence: [prerequisite.courseId] })
  const context = { completedCourseIds: [prerequisite.courseId] }
  assert(run([equivalent, prerequisite], context, diagnosis('Advanced')).audit.some(entry => entry.penalties.some(penalty => penalty.ruleId === 'prior_equivalence')))
  assert(!run([equivalent, prerequisite], context).audit.some(entry => entry.penalties.some(penalty => penalty.ruleId === 'prior_equivalence')))
  assert.equal(ranked(run([equivalent, prerequisite], { completedCourseIds: [equivalent.courseId] })).length, 0)
})
test('foundational needs exclude advanced courses; prior CPD can reduce redundant foundation fit', () => {
  assert.equal(ranked(run([course(undefined, { level: 'advanced' })])).length, 0)
  const foundation = course(undefined, { level: 'foundation' })
  const withCpd = run([foundation], { cpdExperience: 'frequent' }, diagnosis('Advanced'))
  assert(withCpd.audit[0].penalties.some(penalty => penalty.ruleId === 'prior_cpd_foundation'))
  assert(!run([foundation], { cpdExperience: 'frequent' }).audit[0].penalties.length)
})
test('insufficient domains and absent diagnoses never become normal recommendations', () => {
  const gaps = diagnosis()
  gaps.domains[4].gapStatus = 'insufficient_evidence'; gaps.domains[4].score = null; gaps.status = 'insufficient_evidence'
  assert.equal(ranked(run([course()], {}, gaps)).length, 0)
  assert.equal(run([course()], {}, gaps).result.status, 'insufficient_evidence')
  const empty = diagnosis(); empty.priorityGaps = []; empty.domains[4].gaps = []
  assert.equal(run([course()], {}, empty).result.status, 'no_diagnosed_gaps')
})
test('critical review and low gap confidence are developmental and do not rescore a teacher', () => {
  const gaps = diagnosis(), before = JSON.stringify(gaps)
  const baseline = run([course()], {}, gaps)
  assert.equal(JSON.stringify(gaps), before)
  gaps.reviewRequired = true; gaps.domains[4].reviewRequired = true
  const flagged = run([course()], {}, gaps)
  assert.equal(flagged.result.reviewRequired, true)
  assert.equal(ranked(flagged)[0].score, ranked(baseline)[0].score)
  assert.equal(gaps.domains[4].score, 35)
  gaps.domains[4].gaps[0].confidence = 'Low'
  assert.equal(ranked(run([course()], {}, gaps))[0].confidence, 'Low')
  assert(!flagged.result.reviewReason.includes('incompetent'))
})
test('protected demographic fields have no effect; safe projection omits internal audit data', () => {
  const first = run([course()], { age: 20, gender: 'male', maritalStatus: 'single', incomeRange: 'high', schoolLocation: 'urban' })
  const second = run([course()], { age: 90, gender: 'female', maritalStatus: 'married', incomeRange: 'low', schoolLocation: 'rural' })
  assert.deepEqual(first, second)
  assert(first.audit[0].components && first.audit[0].ruleIds.length)
  first.result.audit = first.audit
  first.result.recommendations[0].components = { secret: 'PRIVATE' }
  first.result.recommendations[0].responseKey = 'PRIVATE'
  const safe = teacherSafeRecommendations(first.result)
  for (const key of ['PRIVATE', 'responseKey', 'discrimination', 'socialDesirabilityRisk', 'components', 'ruleIds', 'penalties', 'needWeights']) assert(!JSON.stringify(safe).includes(key))
})
test('real authenticated API: dependency order, ownership, safe cache, idempotency and scoring/gap immutability', () => require('./helpers/diagnosticApi.cjs')('recommendations'))
