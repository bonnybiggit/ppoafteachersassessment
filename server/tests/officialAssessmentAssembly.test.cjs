const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { assembleAssessment, OFFICIAL_ASSESSMENT_MODE, OFFICIAL_VERSION } = require('../dist/services/assessmentAssembly')
const { ASSESSMENT_DOMAINS } = require('../dist/models/AssessmentItem')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const { startAttempt } = require('../dist/services/assessmentService')

const officialItems = ASSESSMENT_DOMAINS.flatMap((primaryDomain, domainIndex) => Array.from({ length: 50 }, (_, questionIndex) => {
  const sourceQuestionNumber = questionIndex + 1
  return {
    _id: new mongoose.Types.ObjectId(),
    itemId: `${OFFICIAL_VERSION}:D${domainIndex + 1}:Q${String(sourceQuestionNumber).padStart(2, '0')}`,
    prompt: `Official question ${domainIndex + 1}-${sourceQuestionNumber}`,
    primaryDomain,
    isActive: false,
    version: OFFICIAL_VERSION,
    assessmentVersion: OFFICIAL_VERSION,
    mode: OFFICIAL_ASSESSMENT_MODE,
    domainNumber: domainIndex + 1,
    section: sourceQuestionNumber <= 30 ? 'A' : 'B',
    sourceQuestionNumber,
    documentOrder: domainIndex * 50 + sourceQuestionNumber,
  }
}))

const selected = assembleAssessment([...officialItems].reverse(), 450, { assessmentMode: OFFICIAL_ASSESSMENT_MODE })
assert.equal(selected.length, 450)
assert.equal(new Set(selected.map(item => String(item._id))).size, 450)
assert.deepEqual(selected.map(item => item.itemId), officialItems.map(item => item.itemId))
for (const domain of ASSESSMENT_DOMAINS) {
  const domainItems = selected.filter(item => item.primaryDomain === domain)
  assert.equal(domainItems.length, 50)
  assert.equal(domainItems.filter(item => item.section === 'A').length, 30)
  assert.equal(domainItems.filter(item => item.section === 'B').length, 20)
  assert.deepEqual(domainItems.map(item => item.sourceQuestionNumber), Array.from({ length: 50 }, (_, index) => index + 1))
}

const teacherId = new mongoose.Types.ObjectId().toString()
let attempt
let creates = 0
const originalFindOneAttempt = AssessmentAttempt.findOne
const originalCreateAttempt = AssessmentAttempt.create
const originalFindItem = AssessmentItem.find

AssessmentAttempt.findOne = async filter => filter.teacherId === teacherId && filter.status === 'in_progress' ? attempt : null
AssessmentAttempt.create = async input => {
  creates++
  attempt = new AssessmentAttempt(input)
  await attempt.validate()
  return attempt
}
AssessmentItem.find = filter => ({
  select() { return this },
  async lean() {
    if (filter._id) return officialItems.filter(item => filter._id.$in.some(id => String(id) === String(item._id)))
    assert.equal(filter.version, OFFICIAL_VERSION)
    assert.equal(filter.assessmentVersion, OFFICIAL_VERSION)
    assert.equal(filter.mode, OFFICIAL_ASSESSMENT_MODE)
    return [...officialItems].reverse()
  },
})

startAttempt(teacherId, { consentConfirmed: true, mode: OFFICIAL_ASSESSMENT_MODE })
  .then(async delivered => {
    assert.equal(delivered.mode, OFFICIAL_ASSESSMENT_MODE)
    assert.equal(delivered.assessmentVersion, OFFICIAL_VERSION)
    assert.equal(delivered.totalItems, 450)
    assert.equal(delivered.selectedItemIds.length, 450)
    assert.deepEqual(delivered.questions.map(question => question.bankItemId), officialItems.map(item => item.itemId))
    for (const [index, question] of delivered.questions.entries()) {
      const sectionA = officialItems[index].section === 'A'
      assert.equal(question.prompt, officialItems[index].prompt)
      assert.equal(question.responseFormat, sectionA ? 'frequency_scale' : 'single_choice')
      assert.deepEqual(question.options, (sectionA
        ? ['Never', 'Rarely', 'Sometimes', 'Often', 'Consistently']
        : ['Very Unlikely', 'Unlikely', 'Unsure', 'Likely', 'Very Likely']
      ).map((label, optionIndex) => ({ id: String(optionIndex + 1), label })))
      assert.equal('responseKey' in officialItems[index], false, 'Delivery must not mutate stored item data')
    }

    const resumed = await startAttempt(teacherId, { consentConfirmed: true, mode: OFFICIAL_ASSESSMENT_MODE })
    assert.equal(resumed.id, delivered.id)
    assert.equal(creates, 1)
    assert.deepEqual(resumed.questions, delivered.questions)
    console.log('PASS: official assembly is 450 items, manifest ordered, 50 per domain, 30 Section A plus 20 Section B, and resumes the same attempt.')
  })
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    AssessmentAttempt.findOne = originalFindOneAttempt
    AssessmentAttempt.create = originalCreateAttempt
    AssessmentItem.find = originalFindItem
  })
