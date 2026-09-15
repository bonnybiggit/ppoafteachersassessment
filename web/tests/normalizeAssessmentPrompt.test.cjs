const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/utils/normalizeAssessmentPrompt.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exportsObject = {}
vm.runInNewContext(compiled, { exports: exportsObject })
const { normalizeAssessmentPrompt: normalize } = exportsObject
const dataDir = path.join(__dirname, '../../server/data')
const bank = fs.readdirSync(dataDir)
  .filter(file => file.endsWith('.synthetic.v0.1.json') && !file.startsWith('courseCatalog'))
  .flatMap(file => JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')))
const id = item => item.itemId ?? item.item_id
const optionsOf = item => (item.responseKey ?? item.response_key).options

for (const [type, itemId] of [['SJT', 'AP-001'], ['KA', 'CI-034'], ['RJ', 'D5-PL-RJ-044'], ['BF', 'HC-019'], ['PE', 'HC-045']]) {
  test(`${type}: removes only the exact trailing options from a real bank question`, () => {
    const item = bank.find(item => id(item) === itemId)
    const before = JSON.stringify(item)
    const boundary = item.prompt.lastIndexOf('\n\n')
    assert.equal(normalize(item.prompt, optionsOf(item)), item.prompt.slice(0, boundary))
    assert.equal(JSON.stringify(item), before)
  })
}

test('all 450 source items: 376 normalized, 74 unchanged, input data untouched', () => {
  const before = JSON.stringify(bank)
  let changed = 0
  assert.equal(bank.length, 450)
  for (const item of bank) {
    const options = optionsOf(item)
    const expectedBlock = options.map(option => `${option.id}. ${option.label}`).join('\n')
    const expected = options.length && item.prompt.endsWith('\n\n' + expectedBlock)
      ? item.prompt.slice(0, -(expectedBlock.length + 2)) : item.prompt
    const result = normalize(item.prompt, options)
    assert.equal(result, expected, id(item))
    if (result !== item.prompt) changed++
    assert.equal(normalize(result, options), result, 'idempotent: ' + id(item))
  }
  assert.equal(changed, 376)
  assert.equal(JSON.stringify(bank), before)
})

const options = ['A', 'B', 'C', 'D'].map(id => ({ id, label: `Choice ${id}` }))
const block = options.map(option => `${option.id}. ${option.label}`).join('\n')
const stem = 'Teacher A. mentions A/B/C/D and Choice A.\n1. Read the scenario.\n2. Choose a response.'
test('preserves natural A., scenario letters, label references and numbered instructions', () => {
  assert.equal(normalize(stem, options), stem)
  assert.equal(normalize(stem + '\n\n' + block, options), stem)
})
for (const [name, prompt, supplied] of [
  ['partial block', 'Question\n\n' + block.split('\n').slice(0, 3).join('\n'), options],
  ['order mismatch', 'Question\n\n' + block, [...options].reverse()],
  ['label mismatch', 'Question\n\n' + block.replace('Choice B', 'Different B'), options],
  ['extra option', 'Question\n\n' + block + '\nE. Extra', options],
  ['trailing instruction', 'Question\n\n' + block + '\nExplain your choice.', options],
  ['empty options', 'Question\n\n' + block, []],
  ['no paragraph boundary', 'Question\n' + block, options],
  ['no stem', '\n\n' + block, options],
  ['duplicate IDs', 'Question\n\nA. One\nA. Two', [{ id: 'A', label: 'One' }, { id: 'A', label: 'Two' }]],
]) test(`${name}: unchanged`, () => assert.equal(normalize(prompt, supplied), prompt))

test('constructed-response PE and Community Engagement remain unchanged', () => {
  for (const itemId of ['D8-PE-PE-049', 'D9-CE-PE-045', 'D9-CE-SJT-001', 'D9-CE-BF-019']) {
    const item = bank.find(item => id(item) === itemId)
    assert.equal(normalize(item.prompt, optionsOf(item)), item.prompt)
  }
})
test('BF incomplete scale including missing NA remains unchanged', () => {
  const item = bank.find(item => id(item) === 'HC-019')
  const partial = item.prompt.slice(0, item.prompt.lastIndexOf('\nNA.'))
  assert.equal(normalize(partial, optionsOf(item)), partial)
})
test('CRLF and other complete option sets are supported exactly', () => {
  assert.equal(normalize(('Question\n\n' + block).replaceAll('\n', '\r\n'), options), 'Question')
  const other = [{ id: 'Yes', label: 'Proceed' }, { id: 'No', label: 'Wait' }]
  assert.equal(normalize('Question\n\nYes. Proceed\nNo. Wait', other), 'Question')
})
