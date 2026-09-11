import { AssessmentAttempt, type AssessmentAttemptDocument } from '../models/AssessmentAttempt'
import { ASSESSMENT_DOMAINS, AssessmentItem, type IAssessmentItem } from '../models/AssessmentItem'
import { AssessmentResponse } from '../models/AssessmentResponse'

export const SCORING_VERSION = 'scoring-v0.1'
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

function itemScoreFromResponse(item: IAssessmentItem, response: ResponseLike | null): number | null {
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

function determineConfidence(
  validItemCount: number,
  expectedItemCount: number,
  evidenceTypesPresent: string[],
  qualityFlags: string[],
  belowMinimumThreshold: boolean,
): 'High' | 'Medium' | 'Low' {
  if (belowMinimumThreshold) return 'Low'
  const completionRate = expectedItemCount > 0 ? validItemCount / expectedItemCount : 0
  const majorIssues = qualityFlags.some(flag => ['insufficient_responses', 'missing_evidence_type', 'incomplete_attempt', 'critical_item_flagged'].includes(flag))
  if (completionRate >= 0.90 && evidenceTypesPresent.length >= 3 && !majorIssues) return 'High'
  if (completionRate >= 0.80 && evidenceTypesPresent.length >= 2 && !majorIssues) return 'Medium'
  return 'Low'
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

function buildDomainResult(
  domain: string,
  expectedItemCount: number,
  itemsInDomain: Array<IAssessmentItem & { _id: { toString(): string } }>,
  responsesByItemId: Map<string, { itemId: { toString(): string }; selectedResponse: unknown }>,
): DomainScoringResult {
  const evidenceTypeScores: Record<typeof EVIDENCE_TYPES[number], number | null> = {
    'situational judgement': null,
    'behaviour frequency': null,
    'knowledge/application': null,
    'reflective judgement': null,
    'performance evidence': null,
  }

  const evidenceValues: Partial<Record<typeof EVIDENCE_TYPES[number], number[]>> = {}
  const criticalItemIds: string[] = []
  let validItemCount = 0

  for (const item of itemsInDomain) {
    const response = responsesByItemId.get(item._id.toString()) ?? null
    const score = itemScoreFromResponse(item, response)
    if (score !== null) {
      validItemCount += 1
      const list = evidenceValues[item.evidenceType] ?? []
      list.push(score)
      evidenceValues[item.evidenceType] = list
    }
    if (item.criticalFlag) {
      criticalItemIds.push(item.itemId)
    }
  }

  for (const evidenceType of EVIDENCE_TYPES) {
    const values = evidenceValues[evidenceType]
    evidenceTypeScores[evidenceType] = values && values.length > 0 ? averageScores(values) : null
  }

  const evidenceTypesPresent = EVIDENCE_TYPES.filter(type => evidenceTypeScores[type] !== null)
  const evidenceTypesMissing = EVIDENCE_TYPES.filter(type => evidenceTypeScores[type] === null)
  const completionRate = expectedItemCount > 0 ? validItemCount / expectedItemCount : 0
  const belowMinimumThreshold = validItemCount < MINIMUM_VALID_ITEMS_PER_DOMAIN

  const qualityFlags: string[] = []
  if (belowMinimumThreshold) qualityFlags.push('insufficient_responses')
  if (evidenceTypesMissing.length > 0) qualityFlags.push('missing_evidence_type')
  if (completionRate < 1) qualityFlags.push('incomplete_attempt')

  let domainScore: number | null = null
  let classification = 'Insufficient Data'
  let nearCutValue = false
  let criticalItemFlagged = criticalItemIds.length > 0
  let confidenceLevel: 'High' | 'Medium' | 'Low' = 'Low'

  if (!belowMinimumThreshold && evidenceTypesPresent.length > 0) {
    const weightedDomainScore = calculateEvidenceWeightedScore(evidenceTypeScores, evidenceTypesPresent)
    if (weightedDomainScore !== null) {
      domainScore = weightedDomainScore
      classification = classifyCompetencyScore(domainScore)
      nearCutValue = nearCutScore(domainScore)
      if (nearCutValue) qualityFlags.push('near_cut_score')
      if (criticalItemFlagged) qualityFlags.push('critical_item_flagged')
      confidenceLevel = determineConfidence(validItemCount, expectedItemCount, evidenceTypesPresent, qualityFlags, false)
    }
  }

  if (belowMinimumThreshold) {
    classification = 'Insufficient Data'
    nearCutValue = false
    if (criticalItemFlagged) qualityFlags.push('critical_item_flagged')
    confidenceLevel = 'Low'
  }

  const uniqueFlags = Array.from(new Set(qualityFlags))
  if (confidenceLevel === 'Low' && !belowMinimumThreshold) {
    confidenceLevel = determineConfidence(validItemCount, expectedItemCount, evidenceTypesPresent, uniqueFlags, belowMinimumThreshold)
  }

  return {
    domain,
    domainWeight: DOMAIN_WEIGHTS[domain as keyof typeof DOMAIN_WEIGHTS] ?? 0,
    score: domainScore,
    classification,
    validItemCount,
    expectedItemCount,
    completionRate,
    evidenceTypeScores,
    evidenceTypesPresent,
    evidenceTypesMissing,
    confidenceLevel,
    qualityFlags: uniqueFlags,
    nearCutScore: nearCutValue,
    criticalItemFlagged,
    criticalItemIds,
  }
}

function teacherSafeScoringResult(result: { attemptId: string; scoringVersion: string; overallCompetencyScore: number | null; overallClassification: string; domains: DomainScoringResult[] }) {
  return {
    attemptId: result.attemptId,
    scoringVersion: result.scoringVersion,
    overallCompetencyScore: result.overallCompetencyScore,
    overallClassification: result.overallClassification,
    domains: result.domains.map(domain => ({
      domain: domain.domain,
      domainWeight: domain.domainWeight,
      score: domain.score,
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

export async function getAttemptScoring(teacherId: string, attemptId: unknown) {
  const attempt = await attemptForScoring(teacherId, attemptId)
  if (attempt.status !== 'completed') {
    throw new ScoringError(409, 'Assessment attempt must be submitted before scoring.')
  }
  if (!attempt.scoring) {
    const scored = await scoreAttemptInternal(attempt)
    return teacherSafeScoringResult({
      attemptId: attempt._id.toString(),
      scoringVersion: scored.scoringVersion,
      overallCompetencyScore: scored.overallCompetencyScore,
      overallClassification: scored.overallClassification,
      domains: scored.domains,
    })
  }
  return teacherSafeScoringResult({
    attemptId: attempt._id.toString(),
    scoringVersion: attempt.scoring.scoringVersion,
    overallCompetencyScore: attempt.scoring.overallCompetencyScore,
    overallClassification: attempt.scoring.overallClassification,
    domains: attempt.scoring.domains as DomainScoringResult[],
  })
}

async function scoreAttemptInternal(attempt: AssessmentAttemptDocument) {
  const responses = await AssessmentResponse.find({ teacherId: attempt.teacherId, attemptId: attempt._id }).lean()
  const items = await AssessmentItem.find({ _id: { $in: attempt.selectedItemIds } }).lean() as Array<IAssessmentItem & { _id: { toString(): string } }>
  const itemMap = new Map(items.map(item => [item._id.toString(), item]))
  const responsesByItemId = new Map<string, { itemId: { toString(): string }; selectedResponse: unknown }>(
    (responses as Array<{ itemId: { toString(): string }; selectedResponse: unknown }>).map(response => [response.itemId.toString(), response]),
  )

  if (attempt.selectedItemIds.some(id => !itemMap.has(id.toString()))) {
    throw new ScoringError(409, 'An assigned question is unavailable. Please contact assessment support.')
  }

  const domainItems = new Map<string, Array<IAssessmentItem & { _id: { toString(): string } }>>()
  for (const item of items) {
    const list = domainItems.get(item.primaryDomain) ?? []
    list.push(item)
    domainItems.set(item.primaryDomain, list)
  }

  const domainResults: DomainScoringResult[] = ASSESSMENT_DOMAINS.map(domain => buildDomainResult(
    domain,
    domainItems.get(domain)?.length ?? 0,
    domainItems.get(domain) ?? [],
    responsesByItemId,
  ))

  const allDomainsScored = domainResults.every(domain => domain.score !== null)
  let overallCompetencyScore: number | null = null
  let overallClassification = 'Insufficient Data'
  if (allDomainsScored) {
    overallCompetencyScore = domainResults.reduce((total, domain) => total + (domain.score ?? 0) * domain.domainWeight, 0)
    overallClassification = classifyCompetencyScore(overallCompetencyScore)
  }

  const result = {
    status: allDomainsScored ? 'scored' : 'insufficient_data',
    scoredAt: new Date(),
    scoringVersion: SCORING_VERSION,
    overallCompetencyScore,
    overallClassification,
    domains: domainResults,
  }

  await AssessmentAttempt.findOneAndUpdate(
    { _id: attempt._id, teacherId: attempt.teacherId },
    { $set: { scoring: result } },
    { new: true, runValidators: true },
  )

  return result
}

export async function scoreAttemptForTeacher(teacherId: string, attemptId: unknown) {
  const attempt = await attemptForScoring(teacherId, attemptId)
  if (attempt.status !== 'completed') {
    throw new ScoringError(409, 'Assessment attempt must be submitted before scoring.')
  }
  const scoring = await scoreAttemptInternal(attempt)
  return teacherSafeScoringResult({
    attemptId: attempt._id.toString(),
    scoringVersion: scoring.scoringVersion,
    overallCompetencyScore: scoring.overallCompetencyScore,
    overallClassification: scoring.overallClassification,
    domains: scoring.domains,
  })
}
