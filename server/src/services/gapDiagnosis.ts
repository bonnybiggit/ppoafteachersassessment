import { ASSESSMENT_DOMAINS, type EVIDENCE_TYPES } from '../models/AssessmentItem'
import type { IAssessmentDomainScoringResult, IAssessmentScoringResult } from '../models/AssessmentAttempt'
import { GAP_TAXONOMY, type DomainGapDiagnosis, type GapCandidate, type GapConfidence,
  type GapDiagnosis, type GapPriority, type GapType, type PriorityGap } from '../models/GapDiagnosis'
import type { ITeacher } from '../models/Teacher'
import { DOMAIN_WEIGHTS, MINIMUM_VALID_ITEMS_PER_DOMAIN } from './assessmentScoring'
import { BAND_SEVERITY, CONTEXT_GAP_TYPES, EVIDENCE_LABELS, GAP_DIAGNOSIS_VERSION,
  GAP_RULES, PROVISIONAL_LIMITATIONS } from './gapDiagnosisRules'

type EvidenceType = typeof EVIDENCE_TYPES[number]
export type ContextSignal = 'limited_opportunity' | 'resource_access_barrier' | 'complex_context' | 'low_self_efficacy'
export type GapContext = Pick<ITeacher, 'classSize' | 'cpdExperience' | 'digitalTeachingExperience' | 'selfEfficacyResilience'>
export interface GapItemEvidence {
  domain: string
  subcompetency: string
  evidenceType: EvidenceType
  score: number | null
  // Explicit teacher-reported context from a structured BF/PE response, never
  // inferred from item prompts, scenario resources, profile tags, or demographics.
  contextualSignals?: ContextSignal[]
}
interface Pattern { type: GapType; difference: number; targets: EvidenceType[]; rationale: string; context: string[] }
interface RankedGap { gap: GapCandidate; domain: string; domainId: string; severity: number; difference: number }

const KA: EvidenceType = 'knowledge/application'
const SJT: EvidenceType = 'situational judgement'
const BF: EvidenceType = 'behaviour frequency'
const RJ: EvidenceType = 'reflective judgement'
const PE: EvidenceType = 'performance evidence'
const allEvidence: EvidenceType[] = [SJT, BF, KA, RJ, PE]
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const isScore = (score: unknown): score is number => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100
const priorityOrder: Record<GapPriority, number> = { high: 0, medium: 1, low: 2 }
const confidenceOrder: Record<GapConfidence, number> = { High: 0, Medium: 1, Low: 2 }

function patterns(domain: IAssessmentDomainScoringResult, evidence: GapItemEvidence[], context: GapContext): Pattern[] {
  const scores = domain.evidenceTypeScores
  const mean = (types: EvidenceType[], minimum = GAP_RULES.minimumComparators): number | null => {
    const values = types.map(type => scores[type]).filter(isScore)
    return values.length >= minimum ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  }
  const difference = (target: EvidenceType, reference: number | null): number | null => {
    const score = scores[target]
    return isScore(score) && reference !== null && score <= GAP_RULES.weaknessCeiling &&
      reference - score >= GAP_RULES.meaningfulDifference ? reference - score : null
  }
  const result: Pattern[] = []
  const add = (type: GapType, delta: number | null, targets: EvidenceType[], rationale: string, factors: string[] = []) => {
    if (delta !== null) result.push({ type, difference: delta, targets, rationale, context: factors })
  }
  add('knowledge', difference(KA, mean([SJT, BF, RJ, PE])), [KA],
    'Evidence suggests a possible knowledge development need: Knowledge/Application is materially weaker than other available evidence.')
  const judgementReference = mean([KA, BF])
  const weakJudgement = [SJT, RJ].map(type => ({ type, delta: difference(type, judgementReference) }))
    .filter((entry): entry is { type: EvidenceType; delta: number } => entry.delta !== null)
  if (weakJudgement.length) add('judgement', Math.max(...weakJudgement.map(entry => entry.delta)),
    weakJudgement.map(entry => entry.type), 'Evidence suggests a possible judgement development need: scenario or reflective judgement is weaker than knowledge and reported behaviour.')
  const capability = mean([KA, SJT])
  const practiceDifference = capability !== null && capability >= GAP_RULES.capabilityFloor ? difference(PE, capability) : null
  add('practice', practiceDifference, [PE],
    'Evidence suggests a possible practice development need: performance evidence is weaker than demonstrated knowledge and scenario judgement.')
  add('reflection', difference(RJ, mean([KA, SJT, BF, PE])), [RJ],
    'Evidence suggests a possible reflection development need: Reflective Judgement is materially weaker than other available evidence.')
  const observed = mean([SJT, RJ, PE])
  if (isScore(scores[BF]) && observed !== null && Math.abs(scores[BF] - observed) >= GAP_RULES.meaningfulDifference) {
    add('calibration', Math.abs(scores[BF] - observed), scores[BF] < observed ? [BF] : [SJT, RJ, PE],
      'Reported behaviour and judgement/performance evidence differ materially; evidence suggests a possible calibration issue, not dishonesty.')
  }
  const behaviourDifference = capability !== null && capability >= GAP_RULES.capabilityFloor ? difference(BF, capability) : null
  if (practiceDifference !== null && behaviourDifference !== null) add('readiness', Math.min(practiceDifference, behaviourDifference), [BF, PE],
    'Knowledge and scenario judgement suggest some capability, while behaviour and performance suggest limited readiness for consistent application.')

  const signals = new Set(evidence.filter(item => item.evidenceType === BF || item.evidenceType === PE)
    .flatMap(item => item.contextualSignals ?? []))
  const confidenceReference = mean([KA, SJT, PE])
  const confidenceDifference = confidenceReference !== null && confidenceReference >= GAP_RULES.capabilityFloor
    ? difference(BF, confidenceReference) : null
  if (context.selfEfficacyResilience === 'developing' || signals.has('low_self_efficacy')) {
    add('confidence', confidenceDifference, [BF],
      'Stronger demonstrated capability alongside weaker reported behaviour and reported developing confidence suggests a possible confidence-related need.',
      ['Developing confidence is explicitly self-reported; it is contextual support, not proof of a competency deficit.'])
  }
  const digitalLimited = domain.domain === ASSESSMENT_DOMAINS[6] && ['none', 'basic'].includes(context.digitalTeachingExperience ?? '')
  if (signals.has('limited_opportunity') && (digitalLimited || context.cpdExperience === 'none')) {
    add('exposure', practiceDifference, [PE],
      'A capability-to-practice difference and explicitly reported limited opportunity suggest exposure may be a contextual factor.',
      ['Limited opportunity to practise is explicitly self-reported.', digitalLimited
        ? 'The stored profile reports limited digital teaching experience.' : 'The stored profile reports no formal CPD experience.'])
  }
  if (signals.has('resource_access_barrier')) add('resource_access', practiceDifference, [PE],
    'A capability-to-practice difference and an explicit access barrier suggest resource access may affect demonstrated practice; resource ownership is not a competence measure.',
    ['A resource/access barrier affecting practice is explicitly self-reported in the assessment response.'])
  const teachingContextDomain = [ASSESSMENT_DOMAINS[2], ASSESSMENT_DOMAINS[3], ASSESSMENT_DOMAINS[4]].includes(domain.domain as typeof ASSESSMENT_DOMAINS[2])
  if (signals.has('complex_context') && teachingContextDomain && typeof context.classSize === 'number' &&
    Number.isFinite(context.classSize) && context.classSize >= GAP_RULES.largeClassSize) {
    add('context_complexity', practiceDifference, [PE],
      'A capability-to-practice difference and an explicitly complex teaching context suggest contextual demands warrant interpretation alongside the evidence.',
      ['A complex teaching context is explicitly self-reported.', 'The stored profile reports a large class.'])
  }
  return result
}

function developmentAreas(evidence: GapItemEvidence[], targets: EvidenceType[]) {
  const grouped = new Map<string, number[]>()
  for (const item of evidence) {
    if (!targets.includes(item.evidenceType) || !isScore(item.score) || !item.subcompetency.trim()) continue
    const values = grouped.get(item.subcompetency) ?? []
    values.push(item.score)
    grouped.set(item.subcompetency, values)
  }
  return [...grouped].map(([name, values]) => ({ name, count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length }))
    .filter(area => area.mean <= GAP_RULES.weaknessCeiling)
    .sort((a, b) => a.mean - b.mean || b.count - a.count || lexical(a.name, b.name))
    .slice(0, GAP_RULES.maxDevelopmentAreas)
}

function compareGaps(a: RankedGap, b: RankedGap): number {
  return priorityOrder[a.gap.priority] - priorityOrder[b.gap.priority] || b.severity - a.severity ||
    b.difference - a.difference || confidenceOrder[a.gap.confidence] - confidenceOrder[b.gap.confidence] ||
    (DOMAIN_WEIGHTS[b.domain as keyof typeof DOMAIN_WEIGHTS] - DOMAIN_WEIGHTS[a.domain as keyof typeof DOMAIN_WEIGHTS]) ||
    lexical(a.domainId, b.domainId) || lexical(a.gap.type, b.gap.type)
}

export function diagnoseGaps(scoring: IAssessmentScoringResult, itemEvidence: GapItemEvidence[] = [], context: GapContext = {}): GapDiagnosis {
  const ranked: RankedGap[] = []
  const domains: DomainGapDiagnosis[] = ASSESSMENT_DOMAINS.map((name, index) => {
    const source = scoring.domains.find(domain => domain.domain === name)
    const reviewRequired = source?.criticalItemFlagged === true
    const domain: DomainGapDiagnosis = {
      domain: name, domainId: `D${index + 1}`, score: source?.score ?? null,
      classification: source?.classification ?? 'Insufficient Data', confidence: source?.confidenceLevel ?? 'Low',
      nearCutScore: source?.nearCutScore ?? false, gapStatus: 'insufficient_evidence',
      priority: null, primaryGapType: null, gaps: [], reviewRequired,
      reviewReason: reviewRequired ? 'Critical item flagged; human review recommended. This does not lower the competency score.' : null,
      limitations: [],
    }
    const eligible = source && isScore(source.score) && Object.hasOwn(BAND_SEVERITY, source.classification) &&
      Number.isSafeInteger(source.validItemCount) && source.validItemCount >= MINIMUM_VALID_ITEMS_PER_DOMAIN &&
      source.expectedItemCount >= source.validItemCount && !source.qualityFlags.includes('insufficient_responses')
    if (!eligible) {
      domain.limitations.push('Insufficient valid evidence for a competency gap diagnosis; missing evidence is not a zero score.')
      return domain
    }
    const evidence = itemEvidence.filter(item => item.domain === name)
    const available = allEvidence.filter(type => isScore(source.evidenceTypeScores[type]))
    if (available.length < allEvidence.length) domain.limitations.push('Some evidence types are unavailable; causes cannot be inferred from missing evidence.')
    if (source.nearCutScore) domain.limitations.push('The competency score is near a provisional band boundary; retain the scoring result and interpret the band cautiously.')
    if (source.confidenceLevel === 'Low') domain.limitations.push('Competency evidence has low confidence; any gap candidates require cautious interpretation.')
    const candidates = patterns(source, evidence, context).map(pattern => {
      const areas = developmentAreas(evidence, pattern.targets)
      const supportCount = evidence.filter(item => pattern.targets.includes(item.evidenceType) && isScore(item.score)).length
      const confidence: GapConfidence = source.confidenceLevel !== 'Low' &&
        source.validItemCount / source.expectedItemCount >= GAP_RULES.fullCoverage &&
        supportCount >= GAP_RULES.minimumSupportingItems && !CONTEXT_GAP_TYPES.includes(pattern.type) ? 'Medium' : 'Low'
      // Confidence concerns the diagnostic hypothesis, not Step 3's competency
      // confidence. Synthetic evidence caps it at Medium; no validated High claims.
      const severity = BAND_SEVERITY[source.classification]
      let priority: GapPriority = confidence === 'Low' ? 'low' : severity === 4 ? 'high' : severity === 3 ? 'medium' : 'low'
      if (confidence === 'Medium' && severity === 2 && pattern.difference >= GAP_RULES.strongDifference) priority = 'medium'
      if (reviewRequired && priority === 'low') priority = 'medium'
      const limitations: string[] = [...PROVISIONAL_LIMITATIONS]
      if (supportCount < GAP_RULES.minimumSupportingItems) limitations.push('Limited item-level support; this is an evidence-type hypothesis, not a firm subcompetency conclusion.')
      if (areas.some(area => area.count === 1)) limitations.push('Some development areas are supported by only one valid item.')
      if (CONTEXT_GAP_TYPES.includes(pattern.type)) limitations.push('Self-reported context is unverified and cannot establish the cause of an evidence pattern.')
      if (available.length < allEvidence.length) limitations.push('Incomplete evidence-type coverage limits this diagnostic hypothesis.')
      if (source.nearCutScore) limitations.push('Near-boundary competency classification remains provisional.')
      const gap: GapCandidate = {
        type: pattern.type, label: GAP_TAXONOMY[pattern.type], priority, confidence,
        subcompetency: areas[0]?.name ?? null, developmentAreas: areas.map(area => area.name),
        rationale: pattern.rationale,
        supportingEvidence: [`The persisted ${pattern.targets.map(type => EVIDENCE_LABELS[type]).join(' / ')} evidence pattern supports this provisional candidate.`],
        contextualFactors: pattern.context, limitations,
      }
      return { gap, domain: name, domainId: domain.domainId, severity, difference: pattern.difference }
    }).sort(compareGaps)
    ranked.push(...candidates)
    domain.gaps = candidates.map(candidate => candidate.gap)
    domain.gapStatus = candidates.length ? 'targeted_development' : 'no_specific_gap'
    domain.priority = candidates[0]?.gap.priority ?? null
    domain.primaryGapType = candidates[0]?.gap.type ?? null
    if (!candidates.length) domain.limitations.push('The available pattern does not identify a specific cause; this does not establish absence of a development need.')
    return domain
  })
  const priorityGaps: PriorityGap[] = ranked.sort(compareGaps).slice(0, GAP_RULES.maxPriorityGaps)
    .map(candidate => ({ ...candidate.gap, domain: candidate.domain, domainId: candidate.domainId }))
  return { version: GAP_DIAGNOSIS_VERSION,
    status: domains.some(domain => domain.gapStatus !== 'insufficient_evidence') ? 'available' : 'insufficient_evidence',
    domains, priorityGaps, reviewRequired: domains.some(domain => domain.reviewRequired), limitations: [...PROVISIONAL_LIMITATIONS] }
}

// Explicit projection also protects responses when a cached document contains
// old, incidental, or administrative properties. Never spread database records.
export function teacherSafeGapDiagnosis(result: GapDiagnosis): GapDiagnosis {
  const gap = (value: GapCandidate): GapCandidate => ({ type: value.type, label: GAP_TAXONOMY[value.type],
    priority: value.priority, confidence: value.confidence, subcompetency: value.subcompetency,
    developmentAreas: [...value.developmentAreas], rationale: value.rationale,
    supportingEvidence: [...value.supportingEvidence], contextualFactors: [...value.contextualFactors], limitations: [...value.limitations] })
  return { version: result.version, status: result.status,
    domains: result.domains.map(domain => ({ domain: domain.domain, domainId: domain.domainId, score: domain.score,
      classification: domain.classification, confidence: domain.confidence, nearCutScore: domain.nearCutScore,
      gapStatus: domain.gapStatus, priority: domain.priority, primaryGapType: domain.primaryGapType,
      gaps: domain.gaps.map(gap), reviewRequired: domain.reviewRequired, reviewReason: domain.reviewReason,
      limitations: [...domain.limitations] })),
    priorityGaps: result.priorityGaps.map(value => ({ ...gap(value), domain: value.domain, domainId: value.domainId })),
    reviewRequired: result.reviewRequired, limitations: [...result.limitations] }
}
