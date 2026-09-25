// Service/query contract with in-memory data; never connects to a database.
const assert = require('node:assert/strict')
const { Teacher } = require('../dist/models/Teacher')
const { listAdminTeachers, getAdminTeacher } = require('../dist/services/adminTeacherService')
const rows = ['not_started', 'in_progress', 'completed', 'abandoned'].map((status, i) => ({
  _id: String(i + 1).repeat(24), firstName: ['Ada', 'Bola', 'Chidi', 'Dayo'][i], lastName: 'Teacher', email: `teacher${i}@example.test`,
  profileCompleted: i > 0, isActive: true, assessmentCompleted: true, passwordHash: 'PRIVATE', incomeRange: 'PRIVATE',
  assessmentStatus: status, attempt: i ? { _id: 'a'.repeat(24), status, startedAt: '2026-01-01', totalItems: 450, scoring: 'PRIVATE' } : null,
  responseCounts: i ? [{ count: i * 5 }] : [], rawResponses: 'PRIVATE',
}))
let lastPipeline
Teacher.aggregate = pipeline => ({ option: async options => {
  assert.equal(options.maxTimeMS, 10000)
  lastPipeline = pipeline
  const projection = pipeline[1].$project
  for (const key of ['passwordHash', 'incomeRange', 'age', 'gender', 'assessmentCompleted']) assert.equal(projection[key], undefined)
  const lookup = pipeline.find(stage => stage.$lookup).$lookup
  assert.deepEqual(lookup.pipeline[0], { $match: { $expr: { $eq: ['$teacherId', '$$teacherId'] } } })
  assert.deepEqual(lookup.pipeline[1], { $sort: { startedAt: -1, _id: -1 } })
  assert.deepEqual(lookup.pipeline[2], { $limit: 1 })
  assert.deepEqual(Object.keys(lookup.pipeline[3].$project).sort(), ['_id', 'status', 'startedAt', 'completedAt', 'totalItems'].sort())
  assert.deepEqual(pipeline[4], { $set: { assessmentStatus: { $ifNull: ['$attempt.status', 'not_started'] } } })
  const match = pipeline[0].$match
  let selected = rows.filter(row => (!match._id || String(match._id) === row._id) && (match.profileCompleted === undefined || row.profileCompleted === match.profileCompleted))
  if (match.$or) {
    const pattern = match.$or[0].firstName.$regex
    assert.equal(match.$or[0].firstName.$options, 'i')
    selected = selected.filter(row => [row.firstName, row.lastName, row.email, row.firstName + ' ' + row.lastName].some(value => new RegExp(pattern, 'i').test(value)))
  }
  const status = pipeline.find(stage => stage.$match?.assessmentStatus)?.$match.assessmentStatus
  if (status) selected = selected.filter(row => row.assessmentStatus === status)
  const facet = pipeline.at(-1).$facet
  const counts = (facet ? facet.teachers : pipeline).find(stage => stage.$lookup?.as === 'responseCounts').$lookup
  assert.deepEqual(counts.pipeline.at(-1), { $count: 'count' })
  assert.equal(counts.pipeline[0].$match.$expr.$and.length, 2)
  if (!facet) return selected
  assert.deepEqual(facet.total, [{ $count: 'count' }])
  assert.deepEqual(facet.teachers[0], { $sort: { createdAt: -1, _id: -1 } })
  const skip = facet.teachers[1].$skip, limit = facet.teachers[2].$limit
  return [{ teachers: selected.slice(skip, skip + limit), total: [{ count: selected.length }] }]
} })
async function run() {
  const all = await listAdminTeachers({})
  assert.equal(all.total, 4)
  assert.equal(all.teachers[0].assessmentStatus, 'not_started', 'Ignore legacy assessmentCompleted flag')
  assert.equal(all.teachers[1].assessment.responseCount, 5)
  for (const forbidden of ['PRIVATE', 'passwordHash', 'incomeRange', 'rawResponses', 'scoring', 'responseKey', 'token']) assert(!JSON.stringify(all).includes(forbidden))
  const page = await listAdminTeachers({ page: '2', pageSize: '2' })
  assert.equal(page.teachers[0].firstName, 'Chidi'); assert.equal(page.total, 4); assert.equal(page.totalPages, 2)
  for (const search of ['ADA', 'Ada Teacher', 'teacher0@']) assert.equal((await listAdminTeachers({ search })).total, 1)
  assert.equal((await listAdminTeachers({ search: '.*' })).total, 0)
  assert.equal(lastPipeline[0].$match.$or[0].firstName.$regex, '\\.\\*')
  for (const status of ['not_started', 'in_progress', 'completed', 'abandoned']) {
    const result = await listAdminTeachers({ status }); assert.equal(result.total, 1); assert.equal(result.teachers[0].assessmentStatus, status)
  }
  assert.equal((await listAdminTeachers({ status: 'profile_complete' })).total, 3)
  assert.equal((await listAdminTeachers({ status: 'profile_incomplete' })).total, 1)
  assert.equal((await getAdminTeacher(rows[2]._id)).teacher.assessment.status, 'completed')
  await assert.rejects(getAdminTeacher('f'.repeat(24)), error => error.statusCode === 404)
  await assert.rejects(getAdminTeacher('invalid'), error => error.statusCode === 400)
  for (const query of [{ page: '0' }, { page: '1.5' }, { pageSize: '101' }, { search: { $ne: '' } }, { status: 'unknown' }, { search: 'x'.repeat(101) }, { secret: 'x' }]) await assert.rejects(listAdminTeachers(query), error => error.statusCode === 400)
  console.log('PASS: admin teacher pagination, literal search, filters, latest-attempt query, counts, detail and safe allowlists; in-memory query contract only.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
