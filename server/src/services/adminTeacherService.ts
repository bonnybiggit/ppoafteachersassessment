import { Types, type PipelineStage } from 'mongoose'
import { Teacher } from '../models/Teacher'
import AssessmentAttempt from '../models/AssessmentAttempt'
import AssessmentResponse from '../models/AssessmentResponse'
import { AuthError } from './authService'

const fields = ['email', 'firstName', 'lastName', 'isActive', 'profileCompleted', 'currentRole', 'subject', 'gradeOrClass', 'schoolType', 'schoolLocation', 'yearsOfTeachingExperience', 'highestEducation', 'classSize', 'createdAt', 'updatedAt'] as const
const projection = Object.fromEntries(fields.map(field => [field, 1]))
const filters = ['all', 'profile_incomplete', 'profile_complete', 'not_started', 'in_progress', 'completed', 'abandoned']

function scalar(value: unknown, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string') throw new AuthError(400, 'Invalid teacher search parameters.')
  return value.trim()
}

function latestAttempt(): PipelineStage[] {
  return [
    { $lookup: { from: AssessmentAttempt.collection.name, let: { teacherId: '$_id' }, pipeline: [
      { $match: { $expr: { $eq: ['$teacherId', '$$teacherId'] } } },
      { $sort: { startedAt: -1, _id: -1 } }, { $limit: 1 },
      { $project: { _id: 1, status: 1, startedAt: 1, completedAt: 1, totalItems: 1 } },
    ], as: 'attempt' } },
    { $set: { attempt: { $arrayElemAt: ['$attempt', 0] } } },
    { $set: { assessmentStatus: { $ifNull: ['$attempt.status', 'not_started'] } } },
  ]
}

function responseCount(): PipelineStage[] {
  return [{ $lookup: { from: AssessmentResponse.collection.name, let: { attemptId: '$attempt._id', teacherId: '$_id' }, pipeline: [
    { $match: { $expr: { $and: [{ $eq: ['$attemptId', '$$attemptId'] }, { $eq: ['$teacherId', '$$teacherId'] }] } } },
    { $count: 'count' },
  ], as: 'responseCounts' } }]
}

// Explicit output allowlist in addition to database projections. Never return raw documents.
function publicTeacher(row: Record<string, any>) {
  const profile = Object.fromEntries(fields.map(field => [field, row[field] ?? null]))
  return { id: String(row._id), ...profile, assessmentStatus: row.assessmentStatus,
    assessment: row.attempt ? { id: String(row.attempt._id), status: row.attempt.status,
      startedAt: row.attempt.startedAt ?? null, completedAt: row.attempt.completedAt ?? null,
      assignedItemCount: row.attempt.totalItems, responseCount: row.responseCounts?.[0]?.count ?? 0 } : null }
}

export async function listAdminTeachers(query: Record<string, unknown>) {
  if (Object.keys(query).some(key => !['page', 'pageSize', 'search', 'status'].includes(key))) throw new AuthError(400, 'Invalid teacher search parameters.')
  const pageText = scalar(query.page, '1'), sizeText = scalar(query.pageSize, '20')
  const page = Number(pageText), pageSize = Number(sizeText)
  const search = scalar(query.search, ''), status = scalar(query.status, 'all')
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(sizeText) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || search.length > 100 || !filters.includes(status)) {
    throw new AuthError(400, 'Invalid teacher search parameters.')
  }
  const match: Record<string, unknown> = {}
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    match.$or = ['firstName', 'lastName', 'email'].map(field => ({ [field]: { $regex: literal, $options: 'i' } }))
    // Full-name search uses the same escaped literal, never an executable regex supplied by a user.
    ;(match.$or as unknown[]).push({ $expr: { $regexMatch: { input: { $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }] }, regex: literal, options: 'i' } } })
  }
  if (status === 'profile_complete' || status === 'profile_incomplete') match.profileCompleted = status === 'profile_complete'
  const pipeline: PipelineStage[] = [{ $match: match }, { $project: projection }, ...latestAttempt()]
  if (['not_started', 'in_progress', 'completed', 'abandoned'].includes(status)) pipeline.push({ $match: { assessmentStatus: status } })
  pipeline.push({ $facet: {
    teachers: [{ $sort: { createdAt: -1, _id: -1 } }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }, ...responseCount()] as PipelineStage.FacetPipelineStage[],
    total: [{ $count: 'count' }],
  } })
  const [result] = await Teacher.aggregate(pipeline).option({ maxTimeMS: 10000 })
  const total = result?.total?.[0]?.count ?? 0
  return { teachers: (result?.teachers ?? []).map(publicTeacher), page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
}

export async function getAdminTeacher(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new AuthError(400, 'Invalid teacher ID.')
  const [row] = await Teacher.aggregate([
    { $match: { _id: new Types.ObjectId(id) } }, { $project: projection }, ...latestAttempt(), ...responseCount(),
  ]).option({ maxTimeMS: 10000 })
  if (!row) throw new AuthError(404, 'Teacher not found.')
  return { teacher: publicTeacher(row) }
}
