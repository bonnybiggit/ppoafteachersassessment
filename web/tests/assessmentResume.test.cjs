// Component regression with in-memory API responses. No production requests.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const { create, act } = require('react-test-renderer')
global.IS_REACT_ACT_ENVIRONMENT = true

function compile(relativePath, overrides = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports,
    require: name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), ...globals })
  return module.exports
}
const resume = compile('src/services/assessmentResume.ts')
const promptNormalization = compile('src/utils/normalizeAssessmentPrompt.ts')
const attempt = {
  id: 'attempt-one', teacherId: 'teacher-one', currentItemIndex: 0,
  questions: Array.from({ length: 4 }, (_, index) => ({
    itemId: `item-${index}`, questionOrder: index + 1, prompt: `Assessment prompt ${index + 1}\n\nA. Choice A\nB. Choice B`,
    domain: 'Domain', evidenceType: 'situational judgement', responseFormat: 'single_choice',
    options: [{ id: 'A', label: 'Choice A' }, { id: 'B', label: 'Choice B' }],
  })),
}
const response = (index, choice = 'A') => ({
  id: `response-${index}`, attemptId: attempt.id, itemId: attempt.questions[index].itemId,
  selectedResponse: choice, responseValue: choice,
})

test('resume finds answer gaps, filters foreign responses, preserves order, and handles completion', () => {
  const original = JSON.stringify(attempt)
  const restored = resume.restoreAssessment({ ...attempt, currentItemIndex: 99 }, [
    response(0), response(2), { ...response(1), attemptId: 'other' },
    { ...response(3), itemId: 'unselected' },
  ])
  assert.equal(restored.currentIndex, 1)
  assert.deepEqual(Object.keys(restored.answers), ['item-0', 'item-2'])
  assert.equal(JSON.stringify(attempt), original)
  assert.equal(resume.restoreAssessment(attempt, []).currentIndex, 0)
  assert.equal(resume.restoreAssessment(attempt, attempt.questions.map((_, i) => response(i))).currentIndex, 3)
  assert.notEqual(resume.draftKey(attempt), resume.draftKey({ ...attempt, teacherId: 'other' }))
  assert.notEqual(resume.draftKey(attempt), resume.draftKey({ ...attempt, id: 'other' }))
})

test('question page restores saved answers and drafts, avoids duplicate saves, and recovers failed saves', async () => {
  const storage = new Map()
  let saved = [], posts = 0, currentReads = 0, responseReads = 0, destination
  let saveFailure = false, loseReply = false, loadFailure = false
  const sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  class AuthApiError extends Error {}
  const service = {
    getCurrentAttempt: async () => { currentReads++; return structuredClone(attempt) },
    getAssessmentResponses: async id => {
      assert.equal(id, attempt.id)
      responseReads++
      if (loadFailure) throw new AuthApiError('Could not load saved responses')
      return structuredClone(saved)
    },
    saveAssessmentResponse: async (id, itemId, choice, value) => {
      posts++
      assert.equal(id, attempt.id)
      assert.equal(choice, value)
      if (saveFailure) throw new AuthApiError('Save failed')
      assert(!saved.some(answer => answer.itemId === itemId), 'Already saved answers must not be posted again')
      const answer = { ...response(Number(itemId.split('-')[1]), choice) }
      saved.push(answer)
      if (loseReply) throw new AuthApiError('Reply lost')
      return answer
    },
    submitAssessmentAttempt: async () => { throw new Error('Do not submit during resume verification') },
  }
  const Component = compile('src/pages/teacher/AssessmentQuestions.tsx', {
    'react-router-dom': { useNavigate: () => target => { destination = target } },
    'lucide-react': { ArrowLeft: () => null, ArrowRight: () => null, Info: () => null },
    '../../assets/ppoaf-logo.jpeg': 'logo',
    '../../services/authService': { AuthApiError },
    '../../services/assessmentService': service,
    '../../services/assessmentResume': resume,
    '../../utils/normalizeAssessmentPrompt': promptNormalization,
  }, { sessionStorage }).default
  let renderer
  async function mount() { await act(async () => { renderer = create(React.createElement(Component)) }) }
  async function refresh() { await act(async () => { renderer.unmount() }); await mount() }
  const content = () => JSON.stringify(renderer.toJSON())
  const text = child => Array.isArray(child) ? child.map(text).join(' ') :
    typeof child === 'object' && child !== null ? text(child.props?.children) : String(child ?? '')
  const button = label => renderer.root.findAllByType('button').find(node => text(node.props.children).includes(label))
  const choice = id => renderer.root.findAllByType('button').find(node => node.props['aria-pressed'] !== undefined && text(node.props.children).includes(`Choice ${id}`))
  async function click(node) { assert(node && !node.props.disabled); await act(async () => { await node.props.onClick() }) }
  try {
    await mount()
    assert(content().includes('Question 1 of 4'))
    assert.equal(text(renderer.root.findByType('h2').props.children), 'Assessment prompt 1')
    assert.equal(renderer.root.findAllByType('button').filter(node => node.props['aria-pressed'] !== undefined).length, 2)
    assert.equal(text(choice('A').props.children), 'A Choice A')
    assert.equal(text(choice('B').props.children), 'B Choice B')
    assert.equal(attempt.questions[0].prompt, 'Assessment prompt 1\n\nA. Choice A\nB. Choice B')
    await click(choice('A'))
    await act(async () => {
      const next = button('Next Question')
      next.props.onClick()
      next.props.onClick()
    })
    assert.equal(posts, 1, 'Rapid clicks must save only once')
    assert.equal(saved.length, 1)
    assert(content().includes('Question 2 of 4'))
    storage.set(resume.draftKey(attempt), JSON.stringify({ 'item-0': 'B', 'unselected': 'A' }))
    await refresh()
    assert(content().includes('Question 2 of 4'))
    await click(button('Previous'))
    assert.equal(choice('A').props['aria-pressed'], true)
    assert.equal(choice('B').props.disabled, true)
    await click(button('Next Question'))
    assert.equal(posts, 1)
    // An unsubmitted selection survives a tab refresh, but is not called saved.
    await click(choice('B'))
    await refresh()
    assert(content().includes('Question 2 of 4'))
    assert.equal(choice('B').props['aria-pressed'], true)
    assert(content().includes('Selection retained in this tab'))
    assert.equal(saved.length, 1)
    saveFailure = true
    await click(button('Next Question'))
    assert(content().includes('Question 2 of 4'))
    assert(content().includes('Save failed'))
    assert.equal(choice('B').props['aria-pressed'], true)
    saveFailure = false
    loseReply = true
    await click(button('Next Question'))
    assert(content().includes('Question 3 of 4'))
    assert.equal(saved.length, 2)
    await refresh()
    assert(content().includes('Question 3 of 4'))
    await click(button('Previous'))
    assert.equal(choice('B').props['aria-pressed'], true)
    assert.equal(choice('B').props.disabled, true)
    const postCount = posts
    await click(button('Next Question'))
    assert.equal(posts, postCount)
    loseReply = false
    await click(choice('A'))
    await click(button('Save & Exit'))
    assert.equal(saved.length, 3)
    assert.equal(destination, '/teacher')
    await refresh()
    assert(content().includes('Question 4 of 4'))
    assert(currentReads >= 5 && responseReads >= currentReads)
    assert(saved.every(answer => answer.attemptId === attempt.id))
    loadFailure = true
    await refresh()
    assert(content().includes('Could not load saved responses'))
    assert(!content().includes('Assessment prompt'))
  } finally { if (renderer) await act(async () => renderer.unmount()) }
})
