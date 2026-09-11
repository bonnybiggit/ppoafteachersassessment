// Offline data validation only. No database connection, writes, or seed operation.
const assert = require('node:assert/strict')
const { AssessmentItem } = require('../dist/models/AssessmentItem')
// D5–D8 follow the requested export naming, IDs and version. This projection is
// ONLY for offline schema checks; it is not an importer or application adapter.
const d5Raw = require('../data/practical-pedagogy-learning-design.synthetic.v0.1.json')
const d6Raw = require('../data/resourcefulness-entrepreneurial-thinking.synthetic.v0.1.json')
const d7Raw = require('../data/digital-future-skills.synthetic.v0.1.json')
const d8Raw = require('../data/personal-effectiveness-professional-identity.synthetic.v0.1.json')
const d8Subcompetencies = [
  'self-management', 'reliability and follow-through', 'professional responsibility',
  'time and workload management', 'accountability', 'reflective practice', 'self-awareness',
  'professional confidence and self-efficacy', 'resilience and recovery from setbacks',
  'continuous professional development', 'openness to feedback', 'professional identity',
  'ethical judgement', 'professional boundaries', 'commitment to improvement',
  'managing competing professional responsibilities', 'maintaining professional standards under pressure',
  'recognising personal limitations and seeking appropriate support',
]
const d8CriticalIds = new Set(['D8-PE-SJT-013', 'D8-PE-SJT-017', 'D8-PE-KA-035'])
const d7Subcompetencies = [
  'basic digital teaching competence', 'selecting appropriate digital tools',
  'digital lesson preparation', 'digital communication and collaboration',
  'digital information literacy', 'evaluating online information and resources',
  'safe and responsible technology use', 'digital learner engagement',
  'blended and technology-supported learning', 'digital assessment and feedback',
  'adapting when technology fails', 'appropriate use of AI and emerging technologies',
  'digital creativity', 'technology-enabled problem solving',
  'future readiness and learning new tools',
]
const d7CriticalIds = new Set(['D7-DF-SJT-004', 'D7-DF-SJT-016', 'D7-DF-SJT-018', 'D7-DF-KA-033'])
const exportFieldMap = {
  item_id: 'itemId', prompt: 'prompt', primary_domain: 'primaryDomain',
  subcompetency: 'subcompetency', evidence_type: 'evidenceType', difficulty: 'difficulty',
  discrimination: 'discrimination', profile_tags: 'profileTags', reverse_keyed: 'reverseKeyed',
  response_key: 'responseKey', social_desirability_risk: 'socialDesirabilityRisk',
  critical_flag: 'criticalFlag', course_tags: 'courseTags', version: 'version', is_active: 'isActive',
}
const evidenceCodes = { 'situational judgement': 'SJT', 'behaviour frequency': 'BF',
  'knowledge/application': 'KA', 'reflective judgement': 'RJ', 'performance evidence': 'PE' }
const d5Subcompetencies = [
  'lesson planning and learning objectives', 'instructional sequencing',
  'learner-centred delivery', 'active learning and participation',
  'questioning and checking for understanding', 'formative assessment for learning',
  'feedback for learning', 'alignment of objectives instruction and assessment',
  'differentiation within learning design', 'use and design of learning resources',
  'lesson reflection and improvement',
]
const d6Subcompetencies = [
  'improvisation with available resources', 'initiative and proactive action',
  'low-cost teaching innovation', 'resource mobilisation', 'creative problem solving',
  'design thinking', 'opportunity identification',
  'making effective use of community/local resources',
  'sustainable use and reuse of teaching materials',
  'small-scale innovation and experimentation',
  'scaling or adapting successful low-cost practices',
]
function mapExportBank(raw, domainId, prefix, domainName, subcompetencies) {
  const items = raw.map((item, index) => {
  assert.deepEqual(Object.keys(item).sort(), Object.keys(exportFieldMap).sort())
  assert.equal(item.primary_domain, domainId)
  const code = index < 18 ? 'SJT' : index < 29 ? 'BF' : index < 37 ? 'KA' : index < 44 ? 'RJ' : 'PE'
  assert.equal(evidenceCodes[item.evidence_type], code)
  assert.equal(item.item_id, `${prefix}-${code}-${String(index + 1).padStart(3, '0')}`)
  assert.equal(item.version, 'synthetic.v0.1')
  assert.equal(item.is_active, false)
  assert.deepEqual(item.profile_tags, [])
  assert(item.course_tags.every(tag => typeof tag === 'string' && tag.trim()))
  assert(subcompetencies.includes(item.subcompetency))
  assert(item.response_key.difficultyStatus.includes('Provisional'))
  assert(item.response_key.scoringStatus.includes('not an operational scoring rule'))
  if (domainId === 'D8') {
    assert(item.response_key.fairnessRule.includes('Profile variables must not determine competence classification'))
    assert(item.response_key.developmentalRule.includes('not whether someone is a good or bad teacher'))
    assert(item.response_key.developmentalRule.includes('not tolerating unsafe, abusive or exploitative conditions'))
    assert.equal(item.critical_flag, d8CriticalIds.has(item.item_id))
    if (item.critical_flag) assert(item.response_key.criticalFlagReason.includes('editorial concern flag only'))
    else assert.equal(item.response_key.criticalFlagReason, undefined)
    if (code === 'PE') {
      assert(item.response_key.missingEvidencePolicy.includes('hypothetical plan or record can earn full design credit'))
      assert(item.response_key.artifactScoringRule.includes('not writing style'))
      assert(item.prompt.includes('No paid resources, software or extra working hours are required'))
    }
  }
  if (domainId === 'D7') {
    assert(item.response_key.fairnessRule.includes('Resource access must not determine competence classification'))
    assert(item.response_key.fairnessRule.includes('AI use is optional'))
    assert(item.response_key.digitalSafetyRule.includes('Do not disclose identifiable learner data'))
    assert.equal(item.critical_flag, d7CriticalIds.has(item.item_id))
    if (item.critical_flag) {
      assert(item.response_key.criticalFlagReason.includes('editorial concern flag only'))
    } else assert.equal(item.response_key.criticalFlagReason, undefined)
    if (code === 'PE') {
      assert(item.response_key.missingEvidencePolicy.includes('text-only simulation can earn full design credit'))
      assert(item.response_key.artifactScoringRule.includes('not visual polish'))
      assert(item.prompt.includes('No device, internet connection, paid software or AI account is required'))
    }
  }
  if (domainId === 'D6') {
    assert(item.response_key.fairnessRule.includes('Resource access must not determine competence classification'))
    if (code === 'PE') {
      assert(item.response_key.artifactScoringRule.includes('Resource access and implementation opportunity earn no points'))
      assert(item.response_key.resourceMobilisationRule.includes('No personal teacher funding'))
      assert(item.response_key.resourceMobilisationRule.includes('pupil fundraising'))
      assert(item.response_key.missingEvidencePolicy.includes('Hypothetical and implemented designs'))
      assert(item.prompt.includes('Do not spend money, seek donations or contact anyone'))
    }
  }
  return Object.fromEntries(Object.entries(exportFieldMap).map(([source, target]) =>
    [target, source === 'primary_domain' ? domainName : item[source]]))
  })
  assert.deepEqual([...new Set(raw.map(item => item.subcompetency))].sort(), [...subcompetencies].sort())
  assert.deepEqual([...new Set(raw.map(item => item.difficulty))].sort(), [1, 2, 3])
  return items
}
const d5Items = mapExportBank(d5Raw, 'D5', 'D5-PL', 'Practical Pedagogy & Learning Design', d5Subcompetencies)
const d6Items = mapExportBank(d6Raw, 'D6', 'D6-RE', 'Resourcefulness & Entrepreneurial Thinking', d6Subcompetencies)
const d7Items = mapExportBank(d7Raw, 'D7', 'D7-DF', 'Digital & Future Skills', d7Subcompetencies)
const d8Items = mapExportBank(d8Raw, 'D8', 'D8-PE', 'Personal Effectiveness & Professional Identity', d8Subcompetencies)
const exportPrefixes = new Set(['D5-PL', 'D6-RE', 'D7-DF', 'D8-PE'])
const banks = [
  { items: require('../data/human-centred-teaching-empathy.synthetic.v0.1.json'), prefix: 'HC', domain: 'Human-Centred Teaching & Empathy', version: 'synthetic-hc-0.1' },
  { items: require('../data/communication-influence.synthetic.v0.1.json'), prefix: 'CI', domain: 'Communication & Influence', version: 'synthetic-ci-0.1' },
  { items: require('../data/classroom-leadership-behaviour-design.synthetic.v0.1.json'), prefix: 'CB', domain: 'Classroom Leadership & Behaviour Design', version: 'synthetic-cb-0.1' },
  { items: require('../data/adaptive-teaching-problem-solving.synthetic.v0.1.json'), prefix: 'AP', domain: 'Adaptive Teaching & Problem Solving', version: 'synthetic-ap-0.1' },
  { items: d5Items, prefix: 'D5-PL', domain: 'Practical Pedagogy & Learning Design', version: 'synthetic.v0.1' },
  { items: d6Items, prefix: 'D6-RE', domain: 'Resourcefulness & Entrepreneurial Thinking', version: 'synthetic.v0.1' },
  { items: d7Items, prefix: 'D7-DF', domain: 'Digital & Future Skills', version: 'synthetic.v0.1' },
  { items: d8Items, prefix: 'D8-PE', domain: 'Personal Effectiveness & Professional Identity', version: 'synthetic.v0.1' },
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
    const idPrefix = exportPrefixes.has(prefix) ? `${prefix}-${evidenceCodes[item.evidenceType]}` : prefix
    assert.equal(item.itemId, `${idPrefix}-${String(index + 1).padStart(3, '0')}`)
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
    assert.equal(item.criticalFlag, d7CriticalIds.has(item.itemId) || d8CriticalIds.has(item.itemId))
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
      if (exportPrefixes.has(prefix)) {
        assert.equal(key.maxScore, 1)
        assert.deepEqual(key.optionScores, Object.fromEntries('ABCD'.split('').map(id => [id, id === key.bestOptionId ? 1 : 0])))
      }
    } else if (exportPrefixes.has(prefix) && item.evidenceType === 'performance evidence') {
      assert.equal(key.format, 'constructed_response')
      assert.deepEqual(key.options, [])
      assert.equal(key.bestOptionId, undefined)
      assert.equal(item.reverseKeyed, false)
      assert(item.prompt.includes('No upload is required'))
      assert.equal(key.rubric.length, 4)
      assert.equal(new Set(key.rubric.map(criterion => criterion.criterion)).size, 4)
      key.rubric.forEach(criterion => {
        assert(criterion.criterion.trim())
        assert.deepEqual(criterion.levels.map(level => level.score), [0, 1, 2])
        criterion.levels.forEach(level => assert(level.descriptor.trim()))
      })
      assert.equal(key.maxScore, key.rubric.reduce((total, criterion) => total + Math.max(...criterion.levels.map(level => level.score)), 0))
      assert(key.aggregation.includes('An assessor'))
      assert(key.missingEvidencePolicy.includes('unscored'))
      assert(key.fairnessRule.includes('teacher profile'))
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
        if (exportPrefixes.has(prefix)) {
          assert.equal(key.maxScore, 4)
          assert.deepEqual(Object.keys(key.optionScores).sort(), ['1', '2', '3', '4', '5', 'NA'].sort())
          assert.equal(key.optionScores.NA, null)
          key.orderedOptionIds.forEach((id, score) => assert.equal(key.optionScores[id], score))
          assert(key.evidenceLimitation.includes('never treat it alone as proof'))
        }
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
  console.log(`PASS (${prefix}): 50 unique IDs/stems, exact evidence counts, all metadata, response keys/options, synthetic provenance, and ${exportPrefixes.has(prefix) ? 'offline mapped ' : ''}Mongoose validation/round-trip.`)
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
if (['D6-RE', 'D7-DF', 'D8-PE'].includes(bank.prefix)) assert(Math.max(...Object.values(positions)) - Math.min(...Object.values(positions)) <= 1, `${bank.prefix} key positions should be balanced.`)
console.log(`${bank.prefix} uniquely longest keyed options: ${keyedLongest.length}/${choices.length}; key positions: ${JSON.stringify(positions)}`)
}
console.log('Highest Domain 3 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('CB-')).slice(0, 5)))
console.log('Highest Domain 4 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('AP-')).slice(0, 5)))
console.log('Highest Domain 5 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('D5-')).slice(0, 5)))
console.log('Highest Domain 6 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('D6-')).slice(0, 5)))
console.log('Highest Domain 7 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('D7-')).slice(0, 5)))
console.log('Highest Domain 8 cross-domain similarities:', JSON.stringify(overlaps.filter(pair => pair.first.startsWith('D8-')).slice(0, 5)))
for (const {id, items, subcompetencies} of [
  {id:'D5', items:d5Items, subcompetencies:d5Subcompetencies},
  {id:'D6', items:d6Items, subcompetencies:d6Subcompetencies},
  {id:'D7', items:d7Items, subcompetencies:d7Subcompetencies},
  {id:'D8', items:d8Items, subcompetencies:d8Subcompetencies},
]) {
const internal = []
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    internal.push({ first: items[i].itemId, second: items[j].itemId, similarity: similarity(items[i], items[j]) })
  }
}
internal.sort((a, b) => b.similarity - a.similarity)
assert(internal[0].similarity < 0.65, `High within-${id} lexical overlap requires editorial review.`)
console.log(`Highest within-${id} similarities:`, JSON.stringify(internal.slice(0, 5)))
console.log(`${id} subcompetency counts:`, JSON.stringify(Object.fromEntries(subcompetencies.map(name => [name, items.filter(item => item.subcompetency === name).length]))))
console.log(`${id} provisional difficulty counts:`, JSON.stringify(Object.fromEntries([1, 2, 3].map(level => [level, items.filter(item => item.difficulty === level).length]))))
}
console.log('Offline only: no MongoDB connection or inserts. Editorial screens do not establish psychometric validity.')
