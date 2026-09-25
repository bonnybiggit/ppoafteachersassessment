import { connection, type ClientSession } from 'mongoose'
import { AssessmentAttempt, type AssessmentAttemptDocument } from '../models/AssessmentAttempt'
import { ASSESSMENT_DOMAINS, AssessmentItem, type IAssessmentItem } from '../models/AssessmentItem'
import { AssessmentResponse } from '../models/AssessmentResponse'
import { OFFICIAL_VERSION, REVERSE_NUMBERS } from './officialAssessmentImport'

export const SCORING_VERSION = 'scoring-v0.1'
export const OFFICIAL_SCORING_VERSION = 'ppoaf-original-scoring.v1'
export const OFFICIAL_ASSESSMENT_VERSION = OFFICIAL_VERSION
export const OFFICIAL_ITEM_COUNT = 450
export const OFFICIAL_ITEMS_PER_DOMAIN = 50
export const OFFICIAL_SECTION_A_COUNT = 30
export const OFFICIAL_SECTION_B_COUNT = 20
export const EXPECTED_ITEMS_PER_DOMAIN = 12
export const MINIMUM_VALID_ITEMS_PER_DOMAIN = Math.ceil(EXPECTED_ITEMS_PER_DOMAIN * 0.70)
export const EVIDENCE_TYPES = [
  'situational judgement',
  'behaviour frequency',
  'knowledge/application',
  'reflective judgement',
  'performance evidence',
] as const

export const EVIDENCE_TYPE_WEIGHTS: Record<typeof EVIDENCE_TYPES[number], number> = {
  'situational judgement': 0.30,
  'behaviour frequency': 0.20,
  'knowledge/application': 0.20,
  'reflective judgement': 0.15,
  'performance evidence': 0.15,
}

export const DOMAIN_WEIGHTS = {
  'Human-Centred Teaching & Empathy': 0.12,
  'Communication & Influence': 0.10,
  'Classroom Leadership & Behaviour Design': 0.12,
  'Adaptive Teaching & Problem Solving': 0.11,
  'Practical Pedagogy & Learning Design': 0.15,
  'Resourcefulness & Entrepreneurial Thinking': 0.10,
  'Digital & Future Skills': 0.10,
  'Personal Effectiveness & Professional Identity': 0.10,
  'Community Engagement': 0.10,
} as const

const DOMAIN_WEIGHT_TOTAL = Object.values(DOMAIN_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
if (Math.abs(DOMAIN_WEIGHT_TOTAL - 1) > 1e-9) {
  throw new Error('Domain weight configuration must sum to 1.0.')
}

export const BAND_BOUNDARIES = [20, 40, 60, 80] as const

export function officialResponseScore(value: unknown, reverseKeyed: boolean): number | null {
  const extracted = extractChoiceId(value)
  const response = extracted === null ? NaN : Number(extracted)
  if (!Number.isInteger(response) || response < 1 || response > 5) return null
  return reverseKeyed ? (5 - response) * 25 : (response - 1) * 25
}

export function classifyOfficialScore(score: number): 'Emerging' | 'Developing' | 'Consolidating' | 'Advanced' | 'Highly Developed' {
  if (score <= 20) return 'Emerging'
  if (score <= 40) return 'Developing'
  if (score <= 60) return 'Consolidating'
  if (score <= 80) return 'Advanced'
  return 'Highly Developed'
}

export function displayOfficialScore(score: number | null): number | null {
  return score === null ? null : Number(score.toFixed(2))
}

export class ScoringError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}

function objectId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ScoringError(400, `${field} must be a valid ObjectId.`)
  }
  return value.toLowerCase()
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score))
}

export function classifyCompetencyScore(score: number): 'Emerging' | 'Basic' | 'Competent' | 'Advanced' | 'Transformational' {
  const normalized = clampScore(score)
  if (normalized <= 20) return 'Emerging'
  if (normalized <= 40) return 'Basic'
  if (normalized <= 60) return 'Competent'
  if (normalized <= 80) return 'Advanced'
  return 'Transformational'
}

export function nearCutScore(score: number): boolean {
  const normalized = clampScore(score)
  return BAND_BOUNDARIES.some(boundary => Math.abs(normalized - boundary) <= 2)
}

function averageScores(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function extractChoiceId(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? String(raw) : null
  }
  if (Array.isArray(raw)) {
    for (const candidate of raw) {
      const value = extractChoiceId(candidate)
      if (value) return value
    }
    return null
  }
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    for (const key of ['selectedOptionId', 'optionId', 'choiceId', 'choice', 'value', 'selectedResponse', 'answer', 'id']) {
      const candidate = extractChoiceId(record[key])
      if (candidate) return candidate
    }
    if (Array.isArray(record.choices)) {
      for (const choice of record.choices) {
        const candidate = extractChoiceId(choice)
        if (candidate) return candidate
      }
    }
  }
  return null
}

function deriveOrderedOptions(item: IAssessmentItem): string[] {
  const key = item.responseKey as Record<string, unknown> | undefined
  const ordered = Array.isArray(key?.orderedOptionIds)
    ? key.orderedOptionIds.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : []
  if (ordered.length > 0) return ordered
  const options = Array.isArray(key?.options) ? key.options : []
  const fallback = options
    .map((option: unknown) => {
      if (!option || typeof option !== 'object') return null
      const record = option as Record<string, unknown>
      return typeof record.id === 'string' && record.id.trim() ? record.id : null
    })
    .filter((id): id is string => id !== null)
  return fallback
}

type ResponseLike = { itemId: { toString(): string }; selectedResponse: unknown }

// Shared with diagnosis for item-level support; the scoring mathematics is unchanged.
export function itemScoreFromResponse(item: IAssessmentItem, response: ResponseLike | null): number | null {
  if (!response) return null
  const key = item.responseKey as Record<string, unknown> | undefined
  if (!key) return null
  const selectedChoiceId = extractChoiceId(response.selectedResponse)
  if (!selectedChoiceId) return null

  if (key.format === 'single_choice' || typeof key.bestOptionId === 'string') {
    const bestOptionId = typeof key.bestOptionId === 'string' ? key.bestOptionId : null
    if (!bestOptionId) return null
    const isCorrect = selectedChoiceId === bestOptionId
    return item.reverseKeyed ? (isCorrect ? 0 : 100) : (isCorrect ? 100 : 0)
  }

  const orderedOptions = deriveOrderedOptions(item)
  if (orderedOptions.length > 0) {
    const index = orderedOptions.indexOf(selectedChoiceId)
    if (index < 0) return null
    return clampScore((index / Math.max(orderedOptions.length - 1, 1)) * 100)
  }

  if (key.format === 'constructed_response') {
    // Provisional safety rule: without a defensible rubric mapping and a verified keyed score,
    // constructed-response performance evidence cannot be scored deterministically.
    return null
  }

  return null
}

export function calculateEvidenceWeightedScore(
  evidenceTypeScores: Record<typeof EVIDENCE_TYPES[number], number | null>,
  evidenceTypesPresent: readonly typeof EVIDENCE_TYPES[number][],
): number | null {
  const validEntries = evidenceTypesPresent
    .map(type => ({ type, score: evidenceTypeScores[type] }))
    .filter((entry): entry is { type: typeof EVIDENCE_TYPES[number]; score: number } => typeof entry.score === 'number')

  if (validEntries.length === 0) return null

  const totalWeight = validEntries.reduce((sum, entry) => sum + EVIDENCE_TYPE_WEIGHTS[entry.type], 0)
  if (totalWeight <= 0) return null

  const weightedSum = validEntries.reduce((sum, entry) => sum + (entry.score * EVIDENCE_TYPE_WEIGHTS[entry.type]), 0)
  return clampScore(weightedSum / totalWeight)
}

type DomainScoringResult = {
  domain: string
  domainWeight: number
  score: number | null
  classification: string
  validItemCount: number
  expectedItemCount: number
  completionRate: number
  evidenceTypeScores: Record<typeof EVIDENCE_TYPES[number], number | null>
  evidenceTypesPresent: string[]
  evidenceTypesMissing: string[]
  confidenceLevel: 'High' | 'Medium' | 'Low'
  qualityFlags: string[]
  nearCutScore: boolean
  criticalItemFlagged: boolean
  criticalItemIds: string[]
}

function teacherSafeScoringResult(result: { attemptId: string; scoringVersion: string; overallCompetencyScore: number | null; overallClassification: string; domains: DomainScoringResult[] }, official = false) {
  return {
    attemptId: result.attemptId,
    scoringVersion: result.scoringVersion,
    overallCompetencyScore: official ? displayOfficialScore(result.overallCompetencyScore) : result.overallCompetencyScore,
    overallClassification: result.overallClassification,
    domains: result.domains.map(domain => ({
      domain: domain.domain,
      domainWeight: domain.domainWeight,
      score: official ? displayOfficialScore(domain.score) : domain.score,
      classification: domain.classification,
      validItemCount: domain.validItemCount,
      expectedItemCount: domain.expectedItemCount,
      completionRate: Number(domain.completionRate.toFixed(4)),
      evidenceTypeScores: domain.evidenceTypeScores,
      evidenceTypesPresent: domain.evidenceTypesPresent,
      evidenceTypesMissing: domain.evidenceTypesMissing,
      confidenceLevel: domain.confidenceLevel,
      qualityFlags: domain.qualityFlags,
      nearCutScore: domain.nearCutScore,
      criticalItemFlagged: domain.criticalItemFlagged,
    })),
  }
}

async function attemptForScoring(teacherId: string, attemptId: unknown) {
  const id = objectId(attemptId, 'attemptId')
  const attempt = await AssessmentAttempt.findOne({ _id: id, teacherId })
  if (!attempt) throw new ScoringError(404, 'Assessment attempt not found.')
  return attempt
}

type OfficialItemForScoring = IAssessmentItem & {
  _id: { toString(): string }
  assessmentVersion?: string
  mode?: string
  domainNumber?: number
  section?: 'A' | 'B'
  sourceQuestionNumber?: number
  documentOrder?: number
}

function officialScoringDomainResult(
  domain: typeof ASSESSMENT_DOMAINS[number],
  items: OfficialItemForScoring[],
  responsesByItemId: Map<string, { selectedResponse: unknown }>,
): DomainScoringResult {
  const sectionScores: Record<'A' | 'B', number[]> = { A: [], B: [] }
  for (const item of items) {
    const score = officialResponseScore(responsesByItemId.get(item._id.toString())?.selectedResponse, item.reverseKeyed)
    if (score === null) throw new ScoringError(409, 'Official assessment contains an invalid or incomplete response.')
    if (item.section !== 'A' && item.section !== 'B') throw new ScoringError(409, 'Official assessment item metadata is incompatible with official scoring.')
    sectionScores[item.section].push(score)
  }
  if (sectionScores.A.length !== OFFICIAL_SECTION_A_COUNT || sectionScores.B.length !== OFFICIAL_SECTION_B_COUNT) {
    throw new ScoringError(409, 'Official assessment does not contain the required section counts.')
  }
  const sectionA = averageScores(sectionScores.A)
  const sectionB = averageScores(sectionScores.B)
  const score = sectionA * 0.60 + sectionB * 0.40
  return {
    domain, domainWeight: DOMAIN_WEIGHTS[domain], score, classification: classifyOfficialScore(score),
    validItemCount: items.length, expectedItemCount: OFFICIAL_ITEMS_PER_DOMAIN, completionRate: 1,
    evidenceTypeScores: { 'situational judgement': null, 'behaviour frequency': null, 'knowledge/application': null, 'reflective judgement': null, 'performance evidence': null },
    evidenceTypesPresent: [], evidenceTypesMissing: [], confidenceLevel: 'Low', qualityFlags: [], nearCutScore: false,
    criticalItemFlagged: false, criticalItemIds: [],
  }
}

async function scoreOfficialAttemptInternal(attempt: AssessmentAttemptDocument) {
  if (attempt.mode !== 'official' || attempt.assessmentVersion !== OFFICIAL_ASSESSMENT_VERSION) {
    throw new ScoringError(409, 'Assessment version is incompatible with official scoring.')
  }
  const savedResult = (saved: NonNullable<AssessmentAttemptDocument['scoring']>) => {
    if (saved.scoringVersion !== OFFICIAL_SCORING_VERSION) {
      throw new ScoringError(409, 'Official assessment has an incompatible scoring version.')
    }
    return {
      scoringVersion: saved.scoringVersion,
      overallCompetencyScore: saved.overallCompetencyScore,
      overallClassification: saved.overallClassification,
      domains: saved.domains as DomainScoringResult[],
    }
  }
  if (attempt.scoring) return savedResult(attempt.scoring)
  return connection.transaction(async session => {
    const locked = await AssessmentAttempt.findOneAndUpdate(
      { _id: attempt._id, teacherId: attempt.teacherId, status: 'completed',
        mode: 'official', assessmentVersion: OFFICIAL_ASSESSMENT_VERSION },
      { $inc: { __v: 1 } }, { session, new: true },
    )
    if (!locked) throw new ScoringError(409, 'Official assessment is unavailable for scoring.')
    if (locked.scoring) return savedResult(locked.scoring)
    return savedResult(await calculateOfficialAttempt(locked, session))
  })
}

async function calculateOfficialAttempt(attempt: AssessmentAttemptDocument, session: ClientSession) {
  if (attempt.selectedItemIds.length !== OFFICIAL_ITEM_COUNT || attempt.totalItems !== OFFICIAL_ITEM_COUNT) {
    throw new ScoringError(409, 'Official assessment must contain exactly 450 assigned items.')
  }
  const responses = await AssessmentResponse.find({ teacherId: attempt.teacherId, attemptId: attempt._id }).session(session).lean()
  const items = await AssessmentItem.find({ _id: { $in: attempt.selectedItemIds } }).session(session).lean() as OfficialItemForScoring[]
  if (items.length !== OFFICIAL_ITEM_COUNT || new Set(items.map(item => item._id.toString())).size !== OFFICIAL_ITEM_COUNT) {
    throw new ScoringError(409, 'Official assessment items are unavailable or duplicated.')
  }
  const reverseKeys = new Set(items.filter(item => item.reverseKeyed).map(item => `${item.domainNumber}:${item.sourceQuestionNumber}`))
  const expectedReverseKeys = new Set(REVERSE_NUMBERS.flatMap((numbers, domainIndex) => numbers.map(number => `${domainIndex + 1}:${number}`)))
  if (reverseKeys.size !== expectedReverseKeys.size || [...expectedReverseKeys].some(key => !reverseKeys.has(key)) ||
    items.some(item => item.assessmentVersion !== OFFICIAL_ASSESSMENT_VERSION || item.mode !== 'official')) {
    throw new ScoringError(409, 'Official assessment item metadata is incompatible with official scoring.')
  }
  const responsesByItemId = new Map<string, { selectedResponse: unknown }>(
    (responses as Array<{ itemId: { toString(): string }; selectedResponse: unknown }>).map(response => [response.itemId.toString(), response]),
  )
  if (responsesByItemId.size !== OFFICIAL_ITEM_COUNT || attempt.selectedItemIds.some(id => !responsesByItemId.has(id.toString()))) {
    throw new ScoringError(409, 'Official assessment must have 450 complete responses before scoring.')
  }
  const domainResults = ASSESSMENT_DOMAINS.map(domain => {
    const domainItems = items.filter(item => item.primaryDomain === domain)
    if (domainItems.length !== OFFICIAL_ITEMS_PER_DOMAIN ||
      domainItems.filter(item => item.section === 'A').length !== OFFICIAL_SECTION_A_COUNT ||
      domainItems.filter(item => item.section === 'B').length !== OFFICIAL_SECTION_B_COUNT) {
      throw new ScoringError(409, 'Official assessment domain metadata is incompatible with official scoring.')
    }
    return officialScoringDomainResult(domain, domainItems, responsesByItemId)
  })
  const overallCompetencyScore = domainResults.reduce((total, domain) => total + (domain.score ?? 0) * domain.domainWeight, 0)
  const result = {
    status: 'scored', scoredAt: new Date(), scoringVersion: OFFICIAL_SCORING_VERSION,
    overallCompetencyScore, overallClassification: classifyOfficialScore(overallCompetencyScore), domains: domainResults,
  }
  const persisted = await AssessmentAttempt.findOneAndUpdate(
    { _id: attempt._id, teacherId: attempt.teacherId }, { $set: { scoring: result } }, { session, new: true, runValidators: true },
  )
  if (!persisted?.scoring) throw new ScoringError(409, 'Official scoring could not be saved.')
  return persisted.scoring
}

export async function scoreOfficialAttemptForTeacher(teacherId: string, attemptId: unknown) {
  const attempt = await attemptForScoring(teacherId, attemptId)
  if (attempt.status !== 'completed') throw new ScoringError(409, 'Assessment attempt must be submitted before scoring.')
  if (attempt.mode !== 'official' || attempt.assessmentVersion !== OFFICIAL_ASSESSMENT_VERSION) {
    throw new ScoringError(409, 'Assessment version is incompatible with official scoring.')
  }
  const scoring = await scoreOfficialAttemptInternal(attempt)
  return teacherSafeScoringResult({
    attemptId: attempt._id.toString(), scoringVersion: scoring.scoringVersion,
    overallCompetencyScore: scoring.overallCompetencyScore, overallClassification: scoring.overallClassification,
    domains: scoring.domains,
  }, true)
}

async function scoreSubmittedOfficialAttempt(teacherId: string, attemptId: unknown) {
  const attempt = await attemptForScoring(teacherId, attemptId)
  if (attempt.status !== 'completed') {
    throw new ScoringError(409, 'Assessment attempt must be submitted before scoring.')
  }
  if (attempt.mode !== 'official' || attempt.assessmentVersion !== OFFICIAL_ASSESSMENT_VERSION) {
    throw new ScoringError(409, 'Assessment version is incompatible with official scoring.')
  }
  const scoring = await scoreOfficialAttemptInternal(attempt)
  return teacherSafeScoringResult({
    attemptId: attempt._id.toString(),
    scoringVersion: scoring.scoringVersion,
    overallCompetencyScore: scoring.overallCompetencyScore,
    overallClassification: scoring.overallClassification,
    domains: scoring.domains,
  }, true)
}

export const getAttemptScoring = scoreSubmittedOfficialAttempt
export const scoreAttemptForTeacher = scoreSubmittedOfficialAttempt
