const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { extractOfficialManifest, validateOfficialManifest, planOfficialImport, importOfficialItems,
  officialImportFilter, ensureOfficialImportIndex, MANIFEST_PATH, ROOT, sha256 } = require('../dist/services/officialAssessmentImport')
const { OfficialAssessmentItem } = require('../dist/models/OfficialAssessmentItem')
const { AssessmentItem } = require('../dist/models/AssessmentItem')

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
const clone = value => structuredClone(value)
const rehash = value => { value.itemsSha256 = sha256(JSON.stringify(value.items)); return value }

test('exactly 450 unique questions and contiguous original document order', () => {
  validateOfficialManifest(manifest)
  assert.equal(manifest.items.length, 450)
  assert.equal(new Set(manifest.items.map(i => i.itemId)).size, 450)
  assert.equal(new Set(manifest.items.map(i => i.prompt)).size, 450)
  assert.deepEqual(manifest.items.map(i => i.documentOrder), Array.from({ length: 450 }, (_, i) => i + 1))
})

test('nine domains, 50 each, exactly 30 A and 20 B with source numbers', () => {
  assert.equal(new Set(manifest.items.map(i => i.primaryDomain)).size, 9)
  for (let d = 1; d <= 9; d++) {
    const items = manifest.items.filter(i => i.domainNumber === d)
    assert.equal(items.length, 50)
    assert.equal(items.filter(i => i.section === 'A').length, 30)
    assert.equal(items.filter(i => i.section === 'B').length, 20)
    assert.deepEqual(items.map(i => i.sourceQuestionNumber), Array.from({ length: 50 }, (_, i) => i + 1))
    assert(items.every(i => i.provenance.domainHeading.startsWith(`DOMAIN ${d}:`)))
    assert(items.every(i => i.provenance.sectionHeading.startsWith(`SECTION ${i.section}:`)))
  }
})

test('exactly 34 reverse indicators with independently enumerated source identities', () => {
  const expected = [
    '1:5', '1:14', '1:23', '2:5', '2:13', '2:22',
    '3:5', '3:10', '3:15', '3:22', '4:5', '4:10', '4:15', '4:22',
    '5:5', '5:10', '5:15', '5:22', '6:5', '6:10', '6:15', '6:22',
    '7:5', '7:10', '7:15', '7:22', '8:5', '8:10', '8:15', '8:22',
    '9:5', '9:10', '9:15', '9:22',
  ]
  const reversed = manifest.items.filter(i => i.reverseKeyed)
  assert.equal(reversed.length, 34)
  assert.deepEqual(reversed.map(i => `${i.domainNumber}:${i.sourceQuestionNumber}`), expected)
  assert(manifest.items.every(i => i.reverseKeyed === i.prompt.includes('(Reverse Indicator)')))
  assert(reversed.every(i => i.section === 'A'))
})

test('exact official identifier/mode, inactive records, no invented metadata', async () => {
  assert.equal(manifest.assessmentVersion, 'ppoaf-original-450.v1')
  assert.equal(manifest.mode, 'official')
  assert.equal(OfficialAssessmentItem.collection.name, AssessmentItem.collection.name)
  for (const item of manifest.items) {
    assert.equal(item.version, 'ppoaf-original-450.v1')
    assert.equal(item.assessmentVersion, 'ppoaf-original-450.v1')
    assert.equal(item.mode, 'official')
    assert.equal(item.isActive, false)
    const doc = new OfficialAssessmentItem(item)
    await doc.validate()
    const { _id, ...stored } = doc.toObject()
    assert.deepEqual(stored, item, 'Schema must not default fabricated metadata or alter source text')
  }
})

test('manifest/checksum reproduces DOCX wording, line breaks, numbering and provenance', () => {
  assert.equal(manifest.sourceSha256, sha256(fs.readFileSync(path.join(ROOT, manifest.sourcePath))))
  assert.deepEqual(extractOfficialManifest(), manifest)
  assert.equal(manifest.items[0].prompt, 'Learners who are usually quiet participate meaningfully during my lessons.')
  assert.equal(manifest.items[30].prompt, 'A learner who usually participates actively suddenly becomes quiet and avoids eye contact during lessons for several days.\nI would privately check on the learner after class before making assumptions.')
  assert.equal(manifest.items[33].sourceQuestionNumber, 34, 'Typed number without a dot is retained')
  assert.equal(manifest.items[50].sourceQuestionNumber, 1, 'Word automatic numbering is resolved')
  assert.equal(manifest.items[80].prompt, 'Several learners appear confused after you explain a classroom activity.\nI would pause and explain the instructions differently before continuing.')
})

function memoryStore(initial = []) {
  const records = clone(initial)
  let writes = 0
  const filter = officialImportFilter()
  const matches = record => filter.$or.some(condition => Object.entries(condition).every(([key, value]) =>
    typeof value === 'object' ? new RegExp(value.$regex).test(record[key]) : record[key] === value))
  return {
    records,
    get writes() { return writes },
    read: async () => clone(records.filter(matches)),
    insert: async items => {
      writes++
      for (const item of items) {
        assert(!records.some(r => r.itemId === item.itemId), 'Unique itemId index')
        records.push(clone(item))
      }
    },
  }
}

test('first import and rerun are insert-only and idempotent', async () => {
  const store = memoryStore()
  assert.equal((await importOfficialItems(manifest, store, false)).inserted, 450)
  const before = clone(store.records)
  const rerun = await importOfficialItems(manifest, store, false)
  assert.equal(rerun.inserted, 0)
  assert.equal(rerun.skipped, 450)
  assert.equal(store.writes, 1)
  assert.deepEqual(store.records, before)
})

test('partial identical import inserts only missing items; database metadata is ignored', async () => {
  const existing = manifest.items.slice(0, 10).map(i => ({ ...clone(i), _id: i.itemId, __v: 0, createdAt: new Date(), updatedAt: new Date() }))
  const store = memoryStore(existing)
  assert.equal((await importOfficialItems(manifest, store, false)).inserted, 440)
  assert.deepEqual(store.records.slice(0, 10), existing)
})

test('dry run performs no inserts', async () => {
  const store = memoryStore()
  assert.equal((await importOfficialItems(manifest, store, true)).planned, 450)
  assert.equal(store.writes, 0)
  assert.equal(store.records.length, 0)
})

test('unique bank index is provisioned safely, reused, and refused for dirty legacy IDs', async () => {
  let created = 0
  const collection = {
    indexes: async () => [{ key: { _id: 1 }, name: '_id_' }],
    aggregate: () => ({ toArray: async () => [] }),
    countDocuments: async () => 0,
    createIndex: async (key, options) => {
      assert.deepEqual(key, { itemId: 1 })
      assert.deepEqual(options, { unique: true, name: 'itemId_1' })
      created++
    },
  }
  await ensureOfficialImportIndex(collection)
  assert.equal(created, 1)
  await ensureOfficialImportIndex({ ...collection, indexes: async () => [{ key: { itemId: 1 }, unique: true }] })
  assert.equal(created, 1)
  await assert.rejects(ensureOfficialImportIndex({ ...collection, aggregate: () => ({ toArray: async () => [{ count: 2 }] }) }), /duplicate or missing/)
  await assert.rejects(ensureOfficialImportIndex({ ...collection, countDocuments: async () => 1 }), /duplicate or missing/)
  assert.equal(created, 1)
})

test('conflicting, duplicate, or unexpected official records abort before writes', async () => {
  const changed = { ...clone(manifest.items[449]), prompt: 'Changed' }
  for (const initial of [[changed], [clone(manifest.items[0]), clone(manifest.items[0])],
    [{ ...clone(manifest.items[0]), itemId: 'unexpected' }]]) {
    const store = memoryStore(initial)
    await assert.rejects(importOfficialItems(manifest, store, false))
    assert.equal(store.writes, 0)
    assert.deepEqual(store.records, initial)
  }
})

test('bad counts, identities, reversal, checksum, version and metadata fail before database reads', async () => {
  const variants = [
    m => m.items.pop(), m => { m.items[0].section = 'B' },
    m => { m.items[0].reverseKeyed = true }, m => { m.items[0].version = 'synthetic.v1' },
    m => { m.items[0].sourceQuestionNumber = 2 }, m => { m.items[0].difficulty = 1 },
    m => { m.items[0].itemId = m.items[1].itemId }, m => { m.items[0].prompt = m.items[1].prompt },
  ]
  for (const change of variants) {
    const bad = clone(manifest); change(bad); rehash(bad)
    await assert.rejects(importOfficialItems(bad, { read: async () => assert.fail('Must not read'), insert: async () => assert.fail('Must not write') }, false))
  }
  const bad = clone(manifest); bad.itemsSha256 = '0'.repeat(64)
  assert.throws(() => planOfficialImport(bad, []), /checksum/)
})

