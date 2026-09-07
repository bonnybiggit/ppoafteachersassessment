import { AssessmentAttempt, type AssessmentAttemptDocument } from '../models/AssessmentAttempt'
import { AssessmentItem } from '../models/AssessmentItem'
import { AssessmentResponse, type AssessmentResponseDocument } from '../models/AssessmentResponse'

export class AssessmentError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}

export async function initializeAssessment(): Promise<void> {
  // Enforce concurrency constraints before accepting requests; never drop indexes.
  await AssessmentAttempt.createIndexes()
  await AssessmentResponse.createIndexes()
}

function objectId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw new AssessmentError(400, `${field} must be a valid ObjectId.`)
  }
  return value.toLowerCase()
}

function inputObject(body: unknown, fields: string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AssessmentError(400, 'A request object is required.')
  }
  if (Object.keys(body).some(key => !fields.includes(key))) {
    throw new AssessmentError(400, 'Request contains unsupported fields.')
  }
  return body as Record<string, unknown>
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

function safeAttempt(attempt: AssessmentAttemptDocument) {
  return {
    id: attempt._id.toString(),
    teacherId: attempt.teacherId.toString(),
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    currentItemIndex: attempt.currentItemIndex,
    totalItems: attempt.totalItems,
    assessmentVersion: attempt.assessmentVersion,
    selectedItemIds: attempt.selectedItemIds.map(id => id.toString()),
    consentConfirmed: attempt.consentConfirmed,
  }
}

function safeResponse(response: AssessmentResponseDocument) {
  return {
    id: response._id.toString(),
    attemptId: response.attemptId.toString(),
    itemId: response.itemId.toString(),
    selectedResponse: response.selectedResponse,
    responseValue: response.responseValue,
    // API duration is measured in milliseconds, matching the stored field.
    responseDuration: response.responseDurationMs,
    answeredAt: response.answeredAt,
  }
}

async function ownedAttempt(teacherId: string, attemptId: unknown) {
  const id = objectId(attemptId, 'attemptId')
  const attempt = await AssessmentAttempt.findOne({ _id: id, teacherId })
  if (!attempt) throw new AssessmentError(404, 'Assessment attempt not found.')
  return attempt
}

export async function startAttempt(teacherId: string, body: unknown) {
  const input = inputObject(body, ['assessmentVersion', 'totalItems', 'selectedItemIds', 'consentConfirmed', 'currentItemIndex'])
  if (typeof input.assessmentVersion !== 'string' || !input.assessmentVersion.trim()) {
    throw new AssessmentError(400, 'assessmentVersion is required.')
  }
  if (input.consentConfirmed !== true) {
    throw new AssessmentError(400, 'Consent must be confirmed before starting an assessment.')
  }
  if (typeof input.totalItems !== 'number' || !Number.isSafeInteger(input.totalItems) || input.totalItems < 0) {
    throw new AssessmentError(400, 'totalItems must be a nonnegative integer.')
  }
  if (input.currentItemIndex !== undefined && input.currentItemIndex !== 0) {
    throw new AssessmentError(400, 'currentItemIndex must start at 0.')
  }
  if (!Array.isArray(input.selectedItemIds)) {
    throw new AssessmentError(400, 'selectedItemIds must be an array of ObjectIds.')
  }
  const selectedItemIds = input.selectedItemIds.map(value => objectId(value, 'selectedItemIds'))
  if (new Set(selectedItemIds).size !== selectedItemIds.length || input.totalItems !== selectedItemIds.length) {
    throw new AssessmentError(400, 'selectedItemIds must be unique and match totalItems.')
  }
  if (await AssessmentAttempt.exists({ teacherId, status: 'in_progress' })) {
    throw new AssessmentError(409, 'An assessment attempt is already in progress.')
  }
  if (selectedItemIds.length > 0) {
    const count = await AssessmentItem.countDocuments({ _id: { $in: selectedItemIds }, isActive: true })
    if (count !== selectedItemIds.length) {
      throw new AssessmentError(400, 'Selected items must exist and be active.')
    }
  }
  try {
    const attempt = await AssessmentAttempt.create({
      teacherId,
      assessmentVersion: input.assessmentVersion.trim(),
      totalItems: input.totalItems,
      selectedItemIds,
      consentConfirmed: true,
      status: 'in_progress',
      startedAt: new Date(),
      currentItemIndex: 0,
    })
    return safeAttempt(attempt)
  } catch (error) {
    if (duplicateKey(error)) throw new AssessmentError(409, 'An assessment attempt is already in progress.')
    throw error
  }
}

export async function getCurrentAttempt(teacherId: string) {
  const attempt = await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
  if (!attempt) throw new AssessmentError(404, 'Assessment attempt not found.')
  return safeAttempt(attempt)
}

export async function getAttempt(teacherId: string, attemptId: unknown) {
  return safeAttempt(await ownedAttempt(teacherId, attemptId))
}

export async function saveResponse(teacherId: string, attemptId: unknown, body: unknown) {
  const attempt = await ownedAttempt(teacherId, attemptId)
  if (attempt.status !== 'in_progress') {
    throw new AssessmentError(409, 'Assessment attempt is not in progress.')
  }
  const input = inputObject(body, ['itemId', 'selectedResponse', 'responseValue', 'responseDuration', 'answeredAt'])
  const itemId = objectId(input.itemId, 'itemId')
  if (!attempt.selectedItemIds.some(id => id.toString() === itemId)) {
    throw new AssessmentError(400, 'Item is not selected for this attempt.')
  }
  if (input.selectedResponse === undefined || input.selectedResponse === null) {
    throw new AssessmentError(400, 'selectedResponse is required.')
  }
  if (input.responseDuration !== undefined &&
    (typeof input.responseDuration !== 'number' || !Number.isFinite(input.responseDuration) || input.responseDuration < 0)) {
    throw new AssessmentError(400, 'responseDuration must be nonnegative milliseconds.')
  }
  let answeredAt = new Date()
  if (input.answeredAt !== undefined) {
    if (typeof input.answeredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.answeredAt)) {
      throw new AssessmentError(400, 'answeredAt must be an ISO timestamp with a timezone.')
    }
    answeredAt = new Date(input.answeredAt)
    if (!Number.isFinite(answeredAt.getTime())) throw new AssessmentError(400, 'answeredAt is invalid.')
  }
  if (!(await AssessmentItem.exists({ _id: itemId, isActive: true }))) {
    throw new AssessmentError(400, 'Assessment item is unavailable.')
  }
  try {
    const response = await AssessmentResponse.create({
      teacherId,
      attemptId: attempt._id,
      itemId,
      selectedResponse: input.selectedResponse,
      responseValue: input.responseValue,
      responseDurationMs: input.responseDuration,
      answeredAt,
    })
    return safeResponse(response)
  } catch (error) {
    if (duplicateKey(error)) throw new AssessmentError(409, 'A response already exists for this item. Answer updates are not supported yet.')
    throw error
  }
}

export async function getResponses(teacherId: string, attemptId: unknown) {
  const attempt = await ownedAttempt(teacherId, attemptId)
  const responses = await AssessmentResponse.find({ teacherId, attemptId: attempt._id }).sort({ answeredAt: 1, _id: 1 })
  return responses.map(safeResponse)
}
