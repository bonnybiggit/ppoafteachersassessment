// Offline data validation only. No database connection, writes, or seed operation.
const assert = require('node:assert/strict')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
const banks = [
  { items: require('../data/human-centred-teaching-empathy.synthetic.v0.1.json'), prefix: 'HC', domain: 'Human-Centred Teaching & Empathy', version: 'synthetic-hc-0.1' },
  { items: require('../data/communication-influence.synthetic.v0.1.json'), prefix: 'CI', domain: 'Communication & Influence', version: 'synthetic-ci-0.1' },
  { items: require('../data/classroom-leadership-behaviour-design.synthetic.v0.1.json'), prefix: 'CB', domain: 'Classroom Leadership & Behaviour Design', version: 'synthetic-cb-0.1' },
  { items: require('../data/adaptive-teaching-problem-solving.synthetic.v0.1.json'), prefix: 'AP', domain: 'Adaptive Teaching & Problem Solving', version: 'synthetic-ap-0.1' },
]

const fields = ['itemId', 'prompt', 'primaryDomain', 'subcompetency', 'evidenceType',
  'difficulty', 'discrimination', 'profileTags', 'reverseKeyed', 'responseKey',
  'socialDesirabilityRisk', 'criticalFlag', 'courseTags', 'version', 'isActive']
const expectedCounts = {
  'situational judgement': 18,
  'behaviour frequency': 11,
  'knowledge/application': 8,
  'reflective judgement': 7,
  'performance evidence': 6,
}
for (const { items, prefix, domain, version } of banks) {
  const counts = Object.fromEntries(Object.keys(expectedCounts).map(type => [type, 0]))
  const prompts = new Set()
  const stems = new Set()
  const scale = ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always']

  assert.equal(items.length, 50)
  assert.equal(new Set(items.map(item => item.itemId)).size, 50)
  items.forEach((item, index) => {
    assert.equal(item.itemId, `${prefix}-${String(index + 1).padStart(3, '0')}`)
    assert.deepEqual(Object.keys(item).sort(), [...fields].sort(), item.itemId)
    for (const field of fields) assert(AssessmentItem.schema.path(field), field)
    assert.equal(item.primaryDomain, domain)
    assert(Object.hasOwn(counts, item.evidenceType))
    counts[item.evidenceType]++
    assert(item.subcompetency.trim())
    assert([1, 2, 3].includes(item.difficulty))
    assert.equal(item.discrimination, 0)
    assert(['low', 'medium', 'high'].includes(item.socialDesirabilityRisk))
    assert(Array.isArray(item.profileTags) && item.profileTags.every(tag => typeof tag === 'string'))
    assert(Array.isArray(item.courseTags) && item.courseTags.length > 0)
    assert.equal(item.version, version)
    assert.equal(item.isActive, false)
    assert.equal(item.criticalFlag, false)
    const normalized = item.prompt.toLowerCase().replace(/\s+/g, ' ').trim()
    assert(!prompts.has(normalized), `Duplicate prompt: ${item.itemId}`)
    prompts.add(normalized)
    const stem = item.prompt.split('\n\n')[1].toLowerCase().replace(/\s+/g, ' ').trim()
    assert(!stems.has(stem), `Duplicate question stem: ${item.itemId}`)
    stems.add(stem)

    const key = item.responseKey
    assert.equal(key.contentStatus, 'synthetic_provisional_not_official_PPOAF')
    assert(key.validationStatus.includes('psychometric validation'))
    assert(key.discriminationStatus.includes('not an empirical estimate'))
    assert.equal(key.difficultyLabel, { 1: 'easy', 2: 'moderate', 3: 'hard' }[item.difficulty])
    assert(key.rationale.trim())
    assert.equal(new Set(key.options.map(option => option.id)).size, key.options.length)
    assert.equal(new Set(key.options.map(option => option.label)).size, key.options.length)
    for (const option of key.options) {
      assert(item.prompt.includes(`${option.id}. ${option.label}`))
    }
    if (['situational judgement', 'knowledge/application', 'reflective judgement'].includes(item.evidenceType)) {
      assert.equal(key.format, 'single_choice')
      assert.equal(key.options.length, 4)
      assert(key.options.some(option => option.id === key.bestOptionId))
      assert.equal(item.reverseKeyed, false)
      assert.equal(key.orderedOptionIds, undefined)
    } else {
      assert.equal(key.bestOptionId, undefined)
      assert.deepEqual(key.unscoredOptionIds, ['NA'])
      const ordered = key.options.filter(option => option.id !== 'NA').map(option => option.id)
      if (item.reverseKeyed) ordered.reverse()
      assert.deepEqual(key.orderedOptionIds, ordered)
      assert.equal(key.orderMeaning, 'weaker_to_stronger_practice')
      assert(!key.orderedOptionIds.includes('NA'))
      if (item.evidenceType === 'behaviour frequency') {
        assert.equal(key.format, 'frequency_scale')
        assert.deepEqual(key.options.slice(0, 5).map(option => option.label), scale)
        assert.equal(key.options.length, 6)
        assert(item.prompt.includes('last four teaching weeks'))
      } else {
        assert.equal(key.format, 'evidence_level')
        assert.equal(key.options.length, 5)
        assert.equal(item.reverseKeyed, false)
        assert(item.prompt.includes('No upload is required'))
      }
    }
    const document = new AssessmentItem(item)
    assert.equal(document.validateSync(), undefined, item.itemId)
    const roundTrip = document.toObject()
    for (const field of fields) assert.deepEqual(roundTrip[field], item[field], `${item.itemId}: ${field}`)
  })

  assert.deepEqual(counts, expectedCounts)
  assert.equal(items.filter(item => item.reverseKeyed).length, 2)
  console.log(`PASS (${prefix}): 50 unique IDs/stems, exact evidence counts, all metadata, response keys/options, synthetic provenance, and Mongoose validation/round-trip.`)
  console.log('Evidence distribution:', JSON.stringify(counts))
  console.log('Subcompetencies:', [...new Set(items.map(item => item.subcompetency))].sort().join('; '))
}

// Screening aids for editorial review, not evidence of construct validity.
const stopWords = new Set('a an the of to in on for with and or is are was were you your i my it that this what which how could would provide evidence have has had when at as by from their they them pupil pupils teacher teachers'.split(' '))
function stem(item) { return item.prompt.split('\n\n')[1].toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() }
function tokens(item) { return new Set(stem(item).split(' ').filter(word => !stopWords.has(word))) }
function similarity(first, second) {
  const a = tokens(first), b = tokens(second)
  const intersection = [...a].filter(word => b.has(word)).length
  return intersection / new Set([...a, ...b]).size
}
const overlaps = []
for (let bankIndex = 1; bankIndex < banks.length; bankIndex++) {
  for (const current of banks[bankIndex].items) {
    for (const previous of banks.slice(0, bankIndex).flatMap(bank => bank.items)) {
      assert.notEqual(stem(current), stem(previous), `Duplicate cross-domain stem: ${current.itemId}/${previous.itemId}`)
      overlaps.push({ first: current.itemId, second: previous.itemId, similarity: similarity(current, previous) })
    }
  }
}
overlaps.sort((a, b) => b.similarity - a.similarity)
assert(overlaps[0].similarity < 0.65, 'High lexical overlap requires editorial review.')
console.log('Highest cross-domain stem similarities (Jaccard, editorial screen):', JSON.stringify(overlaps.slice(0, 5)))
for (const bank of banks.slice(1)) {
const choices = bank.items.filter(item => item.responseKey.format === 'single_choice')
const keyedLongest = choices.filter(item => {
  const options = item.responseKey.options
  const count = option => option.label.split(/\s+/).length
  const best = options.find(option => option.id === item.responseKey.bestOptionId)
  return options.every(option => option.id === best.id || count(best) > count(option))
})
const positions = Object.fromEntries('ABCD'.split('').map(id => [id, choices.filter(item => item.responseKey.bestOptionId === id).length]))
assert(keyedLongest.length < choices.length / 2, 'Keyed answers are too frequently uniquely longest.')
console.log(`${bank.prefix} uniquely longest keyed options: ${keyedLongest.length}/${choices.length}; key positions: ${JSON.stringify(positions)}`)
}
console.log('Highest Domain 3 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('CB-')).slice(0, 5)))
console.log('Highest Domain 4 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('AP-')).slice(0, 5)))
console.log('Offline only: no MongoDB connection or inserts. Editorial screens do not establish psychometric validity.')
