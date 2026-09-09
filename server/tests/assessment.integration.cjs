// Explicit Atlas integration test. Temporary test accounts/attempts/answers are cleaned up.
// Item fixtures exist ONLY in memory; no AssessmentItem documents are written.
require('dotenv/config')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const app = require('../dist/app').default
const { connectDatabase } = require('../dist/config/database')
const { initializeAuth } = require('../dist/services/authService')
const { initializeAssessment, startAttempt } = require('../dist/services/assessmentService')
const { Teacher } = require('../dist/models/Teacher')
const { AssessmentItem, ASSESSMENT_DOMAINS } = require('../dist/models/AssessmentItem')
const { AssessmentAttempt } = require('../dist/models/AssessmentAttempt')
const { AssessmentResponse } = require('../dist/models/AssessmentResponse')
const emails = [0, 1].map(() => `step6f-${randomUUID()}@example.invalid`)
const password = randomUUID() + 'Aa9!'
const originalFind = AssessmentItem.find
const originalExists = AssessmentItem.exists
let fixtures = ASSESSMENT_DOMAINS.flatMap((primaryDomain, d) => Array.from({ length: 5 }, (_, i) => ({
  _id: new mongoose.Types.ObjectId(), itemId: `TEST-${d}-${i}`, primaryDomain,
  isActive: i !== 4, prompt: `Test-only prompt ${d}-${i}`, subcompetency: 'test fixture',
  evidenceType: 'situational judgement', difficulty: 2, discrimination: 999,
  socialDesirabilityRisk: 'high', criticalFlag: true, profileTags: ['internal-context'],
  courseTags: ['private-course'], responseKey: { bestOptionId: 'PRIVATE-KEY', rationale: 'PRIVATE-RATIONALE',
    options: [{ id: 'A', label: 'First choice', score: 999, answerKey: 'PRIVATE-NESTED' }, { id: 'B', label: 'Second choice' }] },
})))
AssessmentItem.find = filter => ({ select() { return this }, async lean() {
  return fixtures.filter(x => filter.isActive === true ? x.isActive : filter._id.$in.some(id => String(id) === String(x._id)))
    .slice().reverse() // Delivery must restore persisted order, not database order.
} })
AssessmentItem.exists = async filter => fixtures.some(x => String(x._id) === String(filter._id)) ? { _id: filter._id } : null
let server, base, checks = 0
function safe(data) {
  const text = JSON.stringify(data)
  for (const forbidden of ['passwordHash', '__v', '"_id"', 'responseKey', 'discrimination', 'socialDesirabilityRisk', 'criticalFlag', 'bestOptionId', 'rationale', 'answerKey', 'PRIVATE-', 'profileTags', 'courseTags', 'domainScores', '"score"', password, process.env.JWT_SECRET]) {
    if (forbidden) assert(!text.includes(forbidden), `Unexpected private field/value: ${forbidden === process.env.JWT_SECRET ? 'secret' : forbidden}`)
  }
}
async function request(method, path, token, body, status) {
  const res = await fetch(base + path, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await res.json()
  assert.equal(res.status, status, `${method} ${path}: expected ${status}, got ${res.status}`)
  safe(data); checks++
  return data
}
async function run() {
  await connectDatabase()
  assert.equal((await mongoose.connection.db.admin().ping()).ok, 1)
  await initializeAuth()
  await initializeAssessment()
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
  const root = '/api/assessment/attempts', missing = new mongoose.Types.ObjectId().toString()
  for (const [method, path] of [['POST', root], ['GET', root+'/current'], ['GET', root+'/current/questions'], ['GET', root+'/'+missing], ['GET', root+'/'+missing+'/questions'], ['POST', root+'/'+missing+'/responses'], ['GET', root+'/'+missing+'/responses'], ['POST', root+'/'+missing+'/submit']]) {
    await request(method, path, undefined, undefined, 401)
  }
  const identities=[]
  for (const email of emails) {
    const registered=await request('POST','/api/auth/register',undefined,{email,password,firstName:'Verification',lastName:'Temporary'},201)
    const login=await request('POST','/api/auth/login',undefined,{email,password},200)
    identities.push({id:registered.teacher.id,token:login.token})
  }
  const [owner,other]=identities, body={consentConfirmed:true}
  await request('GET',root+'/current',owner.token,undefined,404)
  await request('GET',root+'/current/questions',owner.token,undefined,404)
  for(const input of [{}, {consentConfirmed:false}, {consentConfirmed:'true'}, {...body,totalItems:1}, {...body,selectedItemIds:[missing]}, {...body,assessmentVersion:'client'}, {...body,teacherId:other.id}, {...body,currentItemIndex:1}]) {
    await request('POST',root,owner.token,input,400)
  }
  await Teacher.updateOne({_id:owner.id},{$set:{isActive:false}})
  await request('POST',root,owner.token,body,401)
  assert.equal(await AssessmentAttempt.countDocuments({teacherId:owner.id}),0)
  await Teacher.updateOne({_id:owner.id},{$set:{isActive:true}})
  const available=fixtures
  fixtures=[]
  await request('POST',root,owner.token,body,409)
  fixtures=available.slice(0,2)
  await request('POST',root,owner.token,body,409)
  assert.equal(await AssessmentAttempt.countDocuments({teacherId:owner.id}),0)
  fixtures=available
  const starts=await Promise.all([0,1].map(()=>request('POST',root,owner.token,body,201)))
  const attempt=starts[0].attempt
  assert.equal(starts[1].attempt.id,attempt.id)
  assert.equal(await AssessmentAttempt.countDocuments({teacherId:owner.id,status:'in_progress'}),1)
  assert.equal(attempt.status,'in_progress')
  assert.equal(attempt.totalItems,30)
  assert.equal(attempt.questions.length,30)
  assert.equal(new Set(attempt.questions.map(q=>q.itemId)).size,30)
  assert.equal(attempt.currentItemIndex,0)
  assert.equal(attempt.submittedAt,undefined)
  assert(Number.isFinite(Date.parse(attempt.startedAt)))
  const counts=ASSESSMENT_DOMAINS.map(d=>attempt.questions.filter(q=>q.domain===d).length)
  assert(Math.max(...counts)-Math.min(...counts)<=1)
  attempt.questions.forEach((q,i)=>{
    assert.equal(q.questionOrder,i+1)
    assert.equal(q.itemId,attempt.selectedItemIds[i])
    assert(fixtures.find(x=>String(x._id)===q.itemId).isActive)
    assert.deepEqual(q.options,[{id:'A',label:'First choice'},{id:'B',label:'Second choice'}])
  })
  assert.deepEqual((await request('POST',root,owner.token,body,201)).attempt.questions,attempt.questions)
  // Deactivation excludes new selection, but must not silently replace assigned questions.
  fixtures.find(x=>String(x._id)===attempt.questions[0].itemId).isActive=false
  assert.deepEqual((await request('GET',root+'/current',owner.token,undefined,200)).attempt.questions,attempt.questions)
  for(const path of [root+'/current/questions',root+'/'+attempt.id+'/questions']) {
    assert.deepEqual((await request('GET',path,owner.token,undefined,200)).questions,attempt.questions)
  }
  await request('GET',root+'/'+attempt.id,owner.token,undefined,200)
  for(const suffix of ['', '/questions','/responses']) await request('GET',root+'/'+attempt.id+suffix,other.token,undefined,404)
  await request('POST',root+'/'+attempt.id+'/submit',other.token,{},404)
  await request('GET',root+'/bad',owner.token,undefined,400)
  await request('GET',root+'/'+missing,owner.token,undefined,404)
  const path=root+'/'+attempt.id+'/responses'
  const answer={itemId:attempt.questions[0].itemId,selectedResponse:{choices:['A']},responseValue:false,responseDuration:0,answeredAt:new Date().toISOString()}
  const unassigned=fixtures.find(x=>!attempt.selectedItemIds.includes(String(x._id)))
  for(const patch of [{itemId:'bad'},{itemId:missing},{itemId:String(unassigned._id)},{selectedResponse:null},{responseDuration:-1},{responseDuration:'1'},{answeredAt:'bad'},{teacherId:other.id}]) {
    await request('POST',path,owner.token,{...answer,...patch},400)
  }
  await request('POST',path,other.token,answer,404)
  const missingFixture=fixtures.find(x=>String(x._id)===answer.itemId)
  fixtures=fixtures.filter(x=>x!==missingFixture)
  await request('POST',path,owner.token,answer,400)
  await request('GET',root+'/current/questions',owner.token,undefined,409)
  fixtures.push(missingFixture)
  const response=await request('POST',path,owner.token,answer,201)
  assert.deepEqual(response.response.selectedResponse,answer.selectedResponse)
  await request('POST',path,owner.token,answer,409)
  await request('POST',path,owner.token,{itemId:attempt.questions[1].itemId,selectedResponse:false},201)
  const duplicateAnswer = { itemId: attempt.questions[2].itemId, selectedResponse: 'B' }
  const duplicateOutcomes = await Promise.all([0, 1].map(async () => {
    const result = await fetch(base + path, { method: 'POST', headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}`,
    }, body: JSON.stringify(duplicateAnswer) })
    safe(await result.json())
    return result.status
  }))
  assert.deepEqual(duplicateOutcomes.sort(), [201, 409])
  const answers=(await request('GET',path,owner.token,undefined,200)).responses
  assert.equal(answers.length,3)
  assert.equal((await request('GET',root+'/current',owner.token,undefined,200)).attempt.currentItemIndex,3)
  const saved=await AssessmentResponse.findOne({attemptId:attempt.id,itemId:answer.itemId})
  assert.equal(saved.teacherId.toString(),owner.id)
  assert.equal(saved.responseDurationMs,0)
  for(const field of ['score','domainScores','competencyResults'])assert.equal(saved.get(field),undefined)
  const originalResponseFind=AssessmentResponse.find
  try {
    AssessmentResponse.find=()=>{throw Error('private database details')}
    const failure=await request('GET',path,owner.token,undefined,500)
    assert.equal(failure.message,'Unable to complete assessment request.')
  } finally {AssessmentResponse.find=originalResponseFind}
  await Teacher.updateOne({_id:owner.id},{$set:{isActive:false}})
  await request('POST',root+'/'+attempt.id+'/submit',owner.token,{},401)
  await request('POST',path,owner.token,{itemId:attempt.questions[2].itemId,selectedResponse:'A'},401)
  await request('GET',root+'/current/questions',owner.token,undefined,401)
  await Teacher.updateOne({_id:owner.id},{$set:{isActive:true}})
  const submitted=(await request('POST',root+'/'+attempt.id+'/submit',owner.token,{},200)).attempt
  assert.equal(submitted.status,'submitted')
  assert(Number.isFinite(Date.parse(submitted.submittedAt)))
  await request('POST',root+'/'+attempt.id+'/submit',owner.token,{},409)
  await request('POST',path,owner.token,{itemId:attempt.questions[2].itemId,selectedResponse:'A'},409)
  assert.equal((await request('GET',root+'/'+attempt.id,owner.token,undefined,200)).attempt.submittedAt,submitted.submittedAt)
  const stored=await AssessmentAttempt.findById(attempt.id)
  assert.equal(stored.status,'completed')
  assert.equal(stored.completedAt.toISOString(),submitted.submittedAt)
  await request('GET',root+'/current',owner.token,undefined,404)
  // Service configuration and abandoned lifecycle retain the same persistence contract.
  const configured=await startAttempt(owner.id,body,5)
  assert.equal(configured.totalItems,5)
  await AssessmentAttempt.updateOne({_id:configured.id},{$set:{status:'abandoned'}})
  await request('POST',root+'/'+configured.id+'/submit',owner.token,{},409)
  await request('POST',root+'/'+configured.id+'/responses',owner.token,{itemId:configured.questions[0].itemId,selectedResponse:'A'},409)
  // Race an answer against submission. Either the answer precedes closure, or it is rejected.
  const race=(await request('POST',root,owner.token,body,201)).attempt
  const racePath=root+'/'+race.id
  const outcomes=await Promise.all([
    fetch(base+racePath+'/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${owner.token}`},body:JSON.stringify({itemId:race.questions[0].itemId,selectedResponse:'A'})}).then(async r=>({status:r.status,data:await r.json()})),
    request('POST',racePath+'/submit',owner.token,{},200),
  ])
  assert([201,409].includes(outcomes[0].status));safe(outcomes[0].data)
  const closed=await AssessmentAttempt.findById(race.id)
  assert.equal(closed.status,'completed')
  assert.equal(await AssessmentResponse.countDocuments({attemptId:race.id}),outcomes[0].status===201?1:0)
  await request('POST',racePath+'/responses',owner.token,{itemId:race.questions[1].itemId,selectedResponse:'B'},409)
  assert.equal((await request('GET',racePath,owner.token,undefined,200)).attempt.status,'submitted')
  console.log(`PASS: ${checks} HTTP checks; Atlas ping, JWT/active-account checks, concurrent start reuse, assembly, ordered resume, safe delivery, ownership, membership, response persistence, submission and save/submit race. Item fixtures stayed in memory.`)
}
run().catch(error=>{
  // Assertion text is restricted to the test's non-secret labels/statuses.
  console.error(error instanceof assert.AssertionError ? `FAIL: ${error.message}` : 'FAIL: assessment integration; no secrets printed.')
  process.exitCode=1
}).finally(async()=>{
  AssessmentItem.find=originalFind;AssessmentItem.exists=originalExists
  try {
    if(mongoose.connection.readyState===1){
      const teachers=await Teacher.find({email:{$in:emails}}).select('_id')
      const ids=teachers.map(t=>t._id)
      await AssessmentResponse.deleteMany({teacherId:{$in:ids}})
      await AssessmentAttempt.deleteMany({teacherId:{$in:ids}})
      await Teacher.deleteMany({_id:{$in:ids}})
      assert.equal(await AssessmentResponse.countDocuments({teacherId:{$in:ids}}),0)
      assert.equal(await AssessmentAttempt.countDocuments({teacherId:{$in:ids}}),0)
      assert.equal(await Teacher.countDocuments({email:{$in:emails}}),0)
      console.log('Cleanup verified: temporary test teachers, attempts and responses removed; no questions written.')
    }
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve))
    await mongoose.disconnect()
  }
})
