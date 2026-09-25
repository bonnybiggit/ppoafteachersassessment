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

test('CRLF and other complete option sets are supported exactly', () => {
  assert.equal(normalize(('Question\n\n' + block).replaceAll('\n', '\r\n'), options), 'Question')
  const other = [{ id: 'Yes', label: 'Proceed' }, { id: 'No', label: 'Wait' }]
  assert.equal(normalize('Question\n\nYes. Proceed\nNo. Wait', other), 'Question')
})
