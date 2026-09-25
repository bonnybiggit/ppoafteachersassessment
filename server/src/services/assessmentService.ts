import { connection } from 'mongoose'
import { assembleAssessment, OFFICIAL_ASSESSMENT_MODE } from './assessmentAssembly'
import { OFFICIAL_VERSION } from './officialAssessmentImport'
import { officialResponseScore, OFFICIAL_ITEM_COUNT } from './assessmentScoring'
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
    mode: attempt.mode,
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
    .select('_id itemId prompt primaryDomain subcompetency evidenceType section responseKey.options responseKey.format').lean()
  const byId = new Map(items.map(item => [item._id.toString(), item]))
  return attempt.selectedItemIds.map((id, index) => {
    const item = byId.get(id.toString())
    if (!item) throw new AssessmentError(409, 'An assigned question is unavailable. Please contact assessment support.')
    const key = item.responseKey as { options?: unknown; format?: unknown } | undefined
    let responseFormat = typeof key?.format === 'string' &&
      ['single_choice', 'frequency_scale', 'evidence_level', 'constructed_response'].includes(key.format)
      ? key.format : 'unsupported'
    let options = Array.isArray(key?.options) ? key.options.flatMap((option: unknown) => {
      if (!option || typeof option !== 'object') return []
      const value = option as Record<string, unknown>
      return typeof value.id === 'string' && typeof value.label === 'string'
        ? [{ id: value.id, label: value.label }] : []
    }) : []
    if (isOfficialAttempt(attempt)) {
      assertOfficialVersion(attempt)
      const section = (item as { section?: unknown }).section
      if (section !== 'A' && section !== 'B') {
        throw new AssessmentError(409, 'Official question response scale is unavailable. Please contact assessment support.')
      }
      // Source-defined scales are delivery metadata, not stored answer keys.
      const labels = section === 'A'
        ? ['Never', 'Rarely', 'Sometimes', 'Often', 'Consistently']
        : ['Very Unlikely', 'Unlikely', 'Unsure', 'Likely', 'Very Likely']
      responseFormat = section === 'A' ? 'frequency_scale' : 'single_choice'
      options = labels.map((label, optionIndex) => ({ id: String(optionIndex + 1), label }))
    }
    return {
      // ObjectId matches the existing save-response contract; bank ID is separate.
      itemId: id.toString(),
      bankItemId: item.itemId,
      prompt: item.prompt,
      domain: item.primaryDomain,
      subcompetency: item.subcompetency,
      evidenceType: item.evidenceType,
      responseFormat,
      options,
      questionOrder: index + 1,
    }
  })
}

async function deliveredAttempt(attempt: AssessmentAttemptDocument) {
  return { ...safeAttempt(attempt), questions: await questionsForAttempt(attempt) }
}

export async function startAttempt(teacherId: string, body: unknown) {
  const input = inputObject(body, ['consentConfirmed', 'mode'])
  if (input.consentConfirmed !== true) {
    throw new AssessmentError(400, 'Consent must be confirmed before starting an assessment.')
  }
  if (input.mode !== OFFICIAL_ASSESSMENT_MODE) {
    throw new AssessmentError(400, 'Only the official assessment is available.')
  }
  const assessmentMode = OFFICIAL_ASSESSMENT_MODE
  const targetQuestionCount = 450

  const existing = await AssessmentAttempt.findOne({ teacherId, status: 'in_progress' })
  if (existing) return deliveredAttempt(existing)

  const candidates = await AssessmentItem.find({ version: OFFICIAL_VERSION, assessmentVersion: OFFICIAL_VERSION, mode: OFFICIAL_ASSESSMENT_MODE })
    .select('_id itemId prompt primaryDomain isActive version assessmentVersion mode domainNumber section sourceQuestionNumber documentOrder')
    .lean()

  const selected = assembleAssessment(candidates, targetQuestionCount, { assessmentMode })
  if (selected.length !== targetQuestionCount) {
    throw new AssessmentError(409, 'Insufficient official questions for the configured assessment length.')
  }
  try {
    const attempt = await AssessmentAttempt.create({
      teacherId,
      mode: assessmentMode,
      assessmentVersion: OFFICIAL_VERSION,
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
  if (isOfficialAttempt(owned)) {
    const submitted = await connection.transaction(async session => {
      // Serialize validation and completion with response saves on the same parent.
      const locked = await AssessmentAttempt.findOneAndUpdate(
        { _id: owned._id, teacherId, status: 'in_progress' },
        { $inc: { __v: 1 } },
        { session, new: true },
      )
      if (!locked) throw new AssessmentError(409, 'Assessment attempt is not in progress.')
      assertOfficialVersion(locked)
      const assignedIds = new Set(locked.selectedItemIds.map(id => id.toString()))
      if (locked.totalItems !== OFFICIAL_ITEM_COUNT || locked.selectedItemIds.length !== OFFICIAL_ITEM_COUNT ||
        assignedIds.size !== OFFICIAL_ITEM_COUNT) {
        throw new AssessmentError(409, 'Official assessment must contain exactly 450 assigned items.')
      }
      const responses = await AssessmentResponse.find({ teacherId, attemptId: locked._id }).session(session).lean()
      const answeredIds = new Set(responses.map(response => response.itemId.toString()))
      if (responses.length !== OFFICIAL_ITEM_COUNT || answeredIds.size !== OFFICIAL_ITEM_COUNT ||
        responses.some(response => !assignedIds.has(response.itemId.toString()) ||
          officialResponseScore(response.selectedResponse, false) === null)) {
        throw new AssessmentError(409, 'Official assessment requires 450 valid responses before submission.')
      }
      locked.status = 'completed'
      locked.completedAt = new Date()
      await locked.save({ session })
      return safeAttempt(locked)
    })
    return submitted
  }
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

function isOfficialAttempt(attempt: AssessmentAttemptDocument): boolean {
  return attempt.mode === OFFICIAL_ASSESSMENT_MODE || attempt.assessmentVersion === OFFICIAL_VERSION
}

function assertOfficialVersion(attempt: AssessmentAttemptDocument): void {
  if (attempt.mode !== OFFICIAL_ASSESSMENT_MODE || attempt.assessmentVersion !== OFFICIAL_VERSION) {
    throw new AssessmentError(409, 'Assessment version is incompatible with official assessment.')
  }
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
  if (isOfficialAttempt(attempt)) {
    assertOfficialVersion(attempt)
    if (officialResponseScore(input.selectedResponse, false) === null) {
      throw new AssessmentError(400, 'Official assessment responses must be values from 1 to 5.')
    }
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
