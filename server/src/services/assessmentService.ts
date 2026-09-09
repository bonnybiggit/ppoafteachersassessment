import { connection } from 'mongoose'
import { assembleAssessment, DEFAULT_ASSESSMENT_LENGTH, MVP_ASSESSMENT_VERSION } from './assessmentAssembly'
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
    status: attempt.status === 'completed' ? 'submitted' : attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    submittedAt: attempt.completedAt,
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

// Fetch only delivery fields and explicitly copy public option properties.
async function questionsForAttempt(attempt: AssessmentAttemptDocument) {
  const items = await AssessmentItem.find({ _id: { $in: attempt.selectedItemIds } })
    .select('_id itemId prompt primaryDomain subcompetency evidenceType responseKey.options').lean()
  const byId = new Map(items.map(item => [item._id.toString(), item]))
  return attempt.selectedItemIds.map((id, index) => {
    const item = byId.get(id.toString())
    if (!item) throw new AssessmentError(409, 'An assigned question is unavailable. Please contact assessment support.')
    const key = item.responseKey as { options?: unknown } | undefined
    const options = Array.isArray(key?.options) ? key.options.flatMap((option: unknown) => {
      if (!option || typeof option !== 'object') return []
      const value = option as Record<string, unknown>
      return typeof value.id === 'string' && typeof value.label === 'string'
        ? [{ id: value.id, label: value.label }] : []
    }) : []
    return {
      // ObjectId matches the existing save-response contract; bank ID is separate.
      itemId: id.toString(),
      bankItemId: item.itemId,
      prompt: item.prompt,
      domain: item.primaryDomain,
      subcompetency: item.subcompetency,
      evidenceType: item.evidenceType,
      options,
      questionOrder: index + 1,
    }
  })
}

async function deliveredAttempt(attempt: AssessmentAttemptDocument) {
  return { ...safeAttempt(attempt), questions: await questionsForAttempt(attempt) }
}

export async function startAttempt(teacherId: string, body: unknown, questionCount = DEFAULT_ASSESSMENT_LENGTH) {
  const input = inputObject(body, ['consentConfirmed'])
  if (input.consentConfirmed !== true) {
    throw new AssessmentError(400, 'Consent must be confirmed before starting an assessment.')
  }
  const existing = await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
  if (existing) return deliveredAttempt(existing)
  const candidates = await AssessmentItem.find({ isActive: true })
    .select('_id itemId primaryDomain isActive').lean()
  const selected = assembleAssessment(candidates, questionCount)
  if (selected.length !== questionCount) {
    throw new AssessmentError(409, 'Insufficient active assessment questions for the configured assessment length.')
  }
  try {
    const attempt = await AssessmentAttempt.create({
      teacherId,
      assessmentVersion: MVP_ASSESSMENT_VERSION,
      totalItems: selected.length,
      selectedItemIds: selected.map(item => item._id),
      consentConfirmed: true,
      status: 'in_progress',
      startedAt: new Date(),
      currentItemIndex: 0,
    })
    return await deliveredAttempt(attempt)
  } catch (error) {
    if (duplicateKey(error)) {
      const concurrent = await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
      if (concurrent) return deliveredAttempt(concurrent)
      throw new AssessmentError(409, 'Assessment state changed. Please retry starting.')
    }
    throw error
  }
}

export async function getQuestions(teacherId: string, attemptId?: unknown) {
  const attempt = attemptId === undefined
    ? await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
    : await ownedAttempt(teacherId, attemptId)
  if (!attempt) throw new AssessmentError(404, 'Assessment attempt not found.')
  return { attemptId: attempt._id.toString(), questions: await questionsForAttempt(attempt) }
}

export async function submitAttempt(teacherId: string, attemptId: unknown) {
  const owned = await ownedAttempt(teacherId, attemptId)
  const attempt = await AssessmentAttempt.findOneAndUpdate(
    { _id: owned._id, teacherId, status: 'in_progress' },
    { $set: { status: 'completed', completedAt: new Date() }, $inc: { __v: 1 } },
    { new: true, runValidators: true },
  )
  if (!attempt) throw new AssessmentError(409, 'Assessment attempt is not in progress.')
  return safeAttempt(attempt)
}

export async function getCurrentAttempt(teacherId: string) {
  const attempt = await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
  if (!attempt) throw new AssessmentError(404, 'Assessment attempt not found.')
  return deliveredAttempt(attempt)
}

export async function getAttempt(teacherId: string, attemptId: unknown) {
  return deliveredAttempt(await ownedAttempt(teacherId, attemptId))
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
  if (!(await AssessmentItem.exists({ _id: itemId }))) {
    throw new AssessmentError(400, 'Assessment item is unavailable.')
  }
  try {
    // Parent write serializes answer creation against submission across servers.
    // The transaction rolls back progress as well as the answer on failure.
    const response = await connection.transaction(async session => {
      const locked = await AssessmentAttempt.findOneAndUpdate(
        { _id: attempt._id, teacherId, status: 'in_progress', selectedItemIds: itemId },
        { $inc: { __v: 1, currentItemIndex: 1 } },
        { session, new: true },
      )
      if (!locked) throw new AssessmentError(409, 'Assessment attempt is not in progress.')
      const [saved] = await AssessmentResponse.create([{
        teacherId,
        attemptId: attempt._id,
        itemId,
        selectedResponse: input.selectedResponse,
        responseValue: input.responseValue,
        responseDurationMs: input.responseDuration,
        answeredAt,
      }], { session })
      return saved
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
