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
  questions: Array.from({ length: 108 }, (_, index) => ({
    itemId: `item-${index}`, questionOrder: index + 1, prompt: `Pilot prompt ${index + 1}\n\nA. Choice A\nB. Choice B`,
    domain: 'Domain', evidenceType: 'situational judgement', responseFormat: 'single_choice',
    options: [{ id: 'A', label: 'Choice A' }, { id: 'B', label: 'Choice B' }],
  })),
}
const response = (index, choice = 'A') => ({
  id: `response-${index}`, attemptId: attempt.id, itemId: attempt.questions[index].itemId,
  selectedResponse: choice, responseValue: choice,
})

test('actual 108-item pilot: choices and all five written tasks save, resume, and submit', async () => {
  // Execute the actual assembly against the bank, without connecting to MongoDB.
  const model = compile('../server/src/models/AssessmentItem.ts', { mongoose: require('../../server/node_modules/mongoose') })
  const blueprint = compile('../server/src/services/pilotAssessmentBlueprint.ts', { '../models/AssessmentItem': model })
  const assembly = compile('../server/src/services/assessmentAssembly.ts', {
    '../models/AssessmentItem': model, './pilotAssessmentBlueprint': blueprint,
  })
  const dataDir = path.join(__dirname, '../../server/data')
  const candidates = fs.readdirSync(dataDir).filter(file => file.endsWith('.synthetic.v0.1.json') && !file.startsWith('courseCatalog'))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')))
    .map((raw, index) => {
      const item = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.replace(/^_+/, '').replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]))
      return { ...item, _id: String(index), primaryDomain: /^D[5-9]$/.test(item.primaryDomain) ? model.ASSESSMENT_DOMAINS[Number(item.primaryDomain.slice(1)) - 1] : item.primaryDomain }
    })
  const items = assembly.assembleAssessment(candidates, 108, { assessmentMode: 'pilot-synthetic' })
  const pilot = { id: 'written-pilot', teacherId: 'teacher-one', questions: items.map((item, index) => ({
    itemId: item._id, bankItemId: item.itemId, prompt: item.prompt, domain: item.primaryDomain,
    evidenceType: item.evidenceType, responseFormat: item.responseKey.format,
    options: item.responseKey.options, questionOrder: index + 1,
  })) }
  const expectedWritten = new Map([[60, 'D5-PL-PE-048'], [72, 'D6-RE-PE-045'], [84, 'D7-DF-PE-048'], [96, 'D8-PE-PE-048'], [108, 'D9-CE-PE-045']])
  const original = JSON.stringify(pilot)
  const storage = new Map(), saved = []
  let renderer, failSave = false, loseReply = false, submitFailure = false, submissions = 0, destination
  class AuthApiError extends Error {}
  const Component = compile('src/pages/teacher/AssessmentQuestions.tsx', {
    'react-router-dom': { useNavigate: () => target => { destination = target } },
    'lucide-react': { ArrowLeft: () => null, ArrowRight: () => null, Info: () => null },
    '../../assets/ppoaf-logo.jpeg': 'logo', '../../services/authService': { AuthApiError },
    '../../services/assessmentResume': resume, '../../utils/normalizeAssessmentPrompt': promptNormalization,
    '../../services/assessmentService': {
      getCurrentAttempt: async () => structuredClone(pilot),
      getAssessmentResponses: async () => structuredClone(saved),
      saveAssessmentResponse: async (attemptId, itemId, selectedResponse, responseValue) => {
        assert.equal(attemptId, pilot.id)
        assert.equal(selectedResponse, responseValue)
        if (failSave) throw new AuthApiError('Written save failed')
        assert(!saved.some(answer => answer.itemId === itemId), 'Never resave an immutable answer')
        const answer = { attemptId, itemId, selectedResponse, responseValue }
        saved.push(answer)
        if (loseReply) throw new AuthApiError('Save reply lost')
        return answer
      },
      submitAssessmentAttempt: async () => {
        assert.equal(saved.length, 108, 'Final answer must be saved before submitting')
        if (submitFailure) throw new AuthApiError('Submission failed')
        submissions++
        return { id: pilot.id }
      },
      getAssessmentScore: async () => ({ overallCompetencyScore: null }),
    },
  }, { sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } }).default
  const text = child => Array.isArray(child) ? child.map(text).join(' ') : typeof child === 'object' && child !== null ? text(child.props?.children) : String(child ?? '')
  const button = label => renderer.root.findAllByType('button').find(node => text(node.props.children).includes(label))
  const forward = () => button('Next Question') ?? button('Finish Assessment')
  const field = () => renderer.root.findByType('textarea')
  const type = async value => { await act(async () => field().props.onChange({ target: { value } })) }
  const click = async node => { assert(node && !node.props.disabled); await act(async () => node.props.onClick()) }
  const mount = async () => { await act(async () => { renderer = create(React.createElement(Component)) }) }
  const refresh = async () => { await act(async () => renderer.unmount()); await mount() }
  try {
    await mount()
    for (const question of pilot.questions) {
      assert(JSON.stringify(renderer.toJSON()).includes(`Question ${question.questionOrder} of 108`))
      assert.equal(forward().props.disabled, true)
      if (question.responseFormat === 'constructed_response') {
        assert.equal(question.bankItemId, expectedWritten.get(question.questionOrder))
        assert.equal(renderer.root.findAllByType('button').filter(node => node.props['aria-pressed'] !== undefined).length, 0)
        assert.equal(field().props.value, '')
        assert.equal(renderer.root.findByType('label').props.htmlFor, field().props.id)
        await type(' \n\t ')
        assert.equal(forward().props.disabled, true)
        const written = `  Written response for ${question.bankItemId}.\nA second paragraph.  `
        await type(written)
        assert.equal(forward().props.disabled, false)
        await click(button('Previous'))
        await click(forward())
        assert.equal(field().props.value, written, 'Draft survives previous/next')
        await refresh()
        assert.equal(field().props.value, written, 'Draft survives refresh')
        failSave = true
        await click(forward())
        assert.equal(field().props.value, written)
        assert(JSON.stringify(renderer.toJSON()).includes('Written save failed'))
        await refresh()
        assert.equal(field().props.value, written, 'Failed save retains draft')
        failSave = false
        loseReply = question.questionOrder === 72
        // Save & Exit also verifies immutable display of the final written answer before submission.
        await click(button('Save & Exit'))
        assert.equal(destination, '/teacher')
        loseReply = false
        assert.equal(saved.at(-1).selectedResponse, written)
        assert.equal(JSON.parse(storage.get(resume.draftKey(pilot)))[question.itemId], undefined)
        await refresh()
        if (question.questionOrder < 108) await click(button('Previous'))
        assert.equal(field().props.value, written)
        assert.equal(field().props.readOnly, true)
        assert.equal(forward().props.disabled, false)
        if (question.questionOrder === 108) {
          submitFailure = true
          await click(forward())
          assert.equal(submissions, 0)
          assert.equal(field().props.value, written)
          submitFailure = false
        }
        await click(forward())
      } else {
        assert.equal(renderer.root.findAllByType('textarea').length, 0)
        const choices = renderer.root.findAllByType('button').filter(node => node.props['aria-pressed'] !== undefined)
        assert.equal(choices.length, question.options.length)
        await click(choices[0])
        assert.equal(forward().props.disabled, false)
        await click(forward())
      }
    }
    assert.equal(saved.length, 108)
    assert.equal(submissions, 1)
    assert.equal(destination, '/teacher/results')
    assert.equal(JSON.stringify(pilot), original)
    assert.equal(pilot.questions.filter(question => question.responseFormat === 'constructed_response').length, 5)
  } finally { if (renderer) await act(async () => renderer.unmount()) }
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
  assert.equal(resume.restoreAssessment(attempt, attempt.questions.map((_, i) => response(i))).currentIndex, 107)
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
    assert(content().includes('Question 1 of 108'))
    assert.equal(text(renderer.root.findByType('h2').props.children), 'Pilot prompt 1')
    assert.equal(renderer.root.findAllByType('button').filter(node => node.props['aria-pressed'] !== undefined).length, 2)
    assert.equal(text(choice('A').props.children), 'A Choice A')
    assert.equal(text(choice('B').props.children), 'B Choice B')
    assert.equal(attempt.questions[0].prompt, 'Pilot prompt 1\n\nA. Choice A\nB. Choice B')
    await click(choice('A'))
    await act(async () => {
      const next = button('Next Question')
      next.props.onClick()
      next.props.onClick()
    })
    assert.equal(posts, 1, 'Rapid clicks must save only once')
    assert.equal(saved.length, 1)
    assert(content().includes('Question 2 of 108'))
    storage.set(resume.draftKey(attempt), JSON.stringify({ 'item-0': 'B', 'unselected': 'A' }))
    await refresh()
    assert(content().includes('Question 2 of 108'))
    await click(button('Previous'))
    assert.equal(choice('A').props['aria-pressed'], true)
    assert.equal(choice('B').props.disabled, true)
    await click(button('Next Question'))
    assert.equal(posts, 1)
    // An unsubmitted selection survives a tab refresh, but is not called saved.
    await click(choice('B'))
    await refresh()
    assert(content().includes('Question 2 of 108'))
    assert.equal(choice('B').props['aria-pressed'], true)
    assert(content().includes('Selection retained in this tab'))
    assert.equal(saved.length, 1)
    saveFailure = true
    await click(button('Next Question'))
    assert(content().includes('Question 2 of 108'))
    assert(content().includes('Save failed'))
    assert.equal(choice('B').props['aria-pressed'], true)
    saveFailure = false
    loseReply = true
    await click(button('Next Question'))
    assert(content().includes('Question 3 of 108'))
    assert.equal(saved.length, 2)
    await refresh()
    assert(content().includes('Question 3 of 108'))
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
    assert(content().includes('Question 4 of 108'))
    assert(currentReads >= 5 && responseReads >= currentReads)
    assert(saved.every(answer => answer.attemptId === attempt.id))
    loadFailure = true
    await refresh()
    assert(content().includes('Could not load saved responses'))
    assert(!content().includes('Pilot prompt'))
  } finally { if (renderer) await act(async () => renderer.unmount()) }
})
