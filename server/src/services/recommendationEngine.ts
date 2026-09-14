import type { GapCandidate, GapDiagnosis, DomainGapDiagnosis } from '../models/GapDiagnosis'
import { GAP_TAXONOMY } from '../models/GapDiagnosis'
import { COURSE_LEVELS, type AccessibilityFeature, type CourseCatalog, type LearningOpportunity,
  type LearningSuggestion, type Modality, type RecommendationAudit, type RecommendationComponents,
  type RecommendationResult } from '../models/Recommendation'
import { validateCourseCatalog } from './courseCatalog'
import { DEVELOPMENT_LEVEL, GAP_EVIDENCE_FOCUS, RECOMMENDATION_LIMITATIONS,
  RECOMMENDATION_RULES as R, RECOMMENDATION_VERSION, RECOMMENDATION_WEIGHTS } from './recommendationRules'

export interface RecommendationContext {
  classSize?: number; gradeOrClass?: string; subject?: string; cpdExperience?: string
  digitalTeachingExperience?: string; adaptabilityOpenness?: string; selfEfficacyResilience?: string
  // Optional explicit inputs for future profile integration. The current API
  // does not populate these: its Teacher schema has no such stored fields.
  connectivity?: 'offline' | 'limited' | 'standard'
  preferredModalities?: Modality[]; accessibilityNeeds?: AccessibilityFeature[]
  language?: string; completedCourseIds?: string[]
}
interface Need { domain: DomainGapDiagnosis; gap: GapCandidate }
interface Ranked { course: LearningOpportunity; need: Need; audit: RecommendationAudit; suggestion: LearningSuggestion }
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const normalized = (value: string) => value.trim().toLowerCase()
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : R.neutral
const round = (value: number) => Math.round(value * 10000) / 10000
const digitalLevels = ['none', 'basic', 'intermediate', 'advanced']

export function recommendationContext(profile: RecommendationContext): RecommendationContext {
  // Explicit whitelist: protected demographic fields never enter any component,
  // explanation, or cache key. Sort set-valued preferences without mutating input.
  return {
    classSize: profile.classSize, gradeOrClass: profile.gradeOrClass, subject: profile.subject,
    cpdExperience: profile.cpdExperience, digitalTeachingExperience: profile.digitalTeachingExperience,
    adaptabilityOpenness: profile.adaptabilityOpenness, selfEfficacyResilience: profile.selfEfficacyResilience,
    connectivity: profile.connectivity, language: profile.language,
    preferredModalities: profile.preferredModalities ? [...new Set(profile.preferredModalities)].sort() : undefined,
    accessibilityNeeds: profile.accessibilityNeeds ? [...new Set(profile.accessibilityNeeds)].sort() : undefined,
    completedCourseIds: profile.completedCourseIds ? [...new Set(profile.completedCourseIds)].sort() : undefined,
  }
}

function compare(a: Ranked, b: Ranked): number {
  return b.audit.score! - a.audit.score! || b.audit.components!.needMatch - a.audit.components!.needMatch ||
    b.audit.subcompetencyMatch - a.audit.subcompetencyMatch || b.audit.gapTypeMatch - a.audit.gapTypeMatch ||
    b.audit.components!.contextFit - a.audit.components!.contextFit || lexical(a.course.courseId, b.course.courseId) ||
    lexical(a.need.domain.domainId, b.need.domain.domainId) || lexical(a.need.gap.type, b.need.gap.type)
}

function evaluate(course: LearningOpportunity, need: Need, context: RecommendationContext, catalog: CourseCatalog): { audit: RecommendationAudit; ranked?: Ranked } {
  const { domain, gap } = need
  const audit: RecommendationAudit = { courseId: course.courseId, domainId: domain.domainId,
    gapType: gap.type, subcompetency: gap.subcompetency, components: null, score: null,
    subcompetencyMatch: 0, gapTypeMatch: 0, penalties: [], ruleIds: [], exclusionReasons: [] }
  const exclude = (id: string, reason: string) => { audit.ruleIds.push(id); audit.exclusionReasons.push(reason) }
  const penalize = (ruleId: string, amount: number, reason: string) => { audit.ruleIds.push(ruleId); audit.penalties.push({ ruleId, amount, reason }) }
  const primary = course.domains.includes(domain.domainId)
  const secondary = course.secondaryDomains.includes(domain.domainId)
  const gapMatch = course.gapTypes.includes(gap.type)
  const subcompetencies = course.subcompetencies[domain.domainId] ?? []
  const exactSub = gap.subcompetency !== null && subcompetencies.includes(gap.subcompetency)
  const targetLevel = DEVELOPMENT_LEVEL[domain.classification]
  const targetIndex = COURSE_LEVELS.indexOf(targetLevel)
  const courseIndex = COURSE_LEVELS.indexOf(course.level)
  const foundationNeed = ['Emerging', 'Basic'].includes(domain.classification)
  if (!course.active) exclude('inactive', 'The catalog opportunity is inactive.')
  if (!primary && !secondary) exclude('unrelated_domain', 'No explicitly listed domain alignment.')
  if (!gapMatch) exclude('unrelated_gap', 'The opportunity does not address the diagnosed gap type.')
  if (gap.subcompetency && subcompetencies.length && !exactSub) exclude('unrelated_subcompetency', 'The opportunity targets different specific subcompetencies.')
  if (targetIndex < 0 || courseIndex - targetIndex > R.maximumLevelJump) exclude('level_above_need', 'The development level is too advanced for this diagnosed need.')
  if (context.completedCourseIds?.includes(course.courseId)) exclude('already_completed', 'The supplied prior-learning record lists this opportunity as completed.')
  if (context.connectivity === 'offline' && course.bandwidth !== 'offline') exclude('requires_connectivity', 'This opportunity requires connectivity that the explicit context does not support.')
  if (context.language && !course.language.includes(context.language)) exclude('language_unavailable', 'The explicitly requested language is not offered.')
  for (const prerequisite of course.prerequisites) {
    let met: boolean | undefined
    if (prerequisite.kind === 'course') met = context.completedCourseIds?.includes(prerequisite.value)
    else {
      const actual = digitalLevels.indexOf(context.digitalTeachingExperience ?? '')
      if (actual >= 0) met = actual >= digitalLevels.indexOf(prerequisite.value)
    }
    const description = prerequisite.kind === 'course'
      ? `Prior completion of ${catalog.courses.find(item => item.courseId === prerequisite.value)?.title ?? 'the specified prerequisite opportunity'}`
      : `${prerequisite.value} digital teaching experience`
    if (met !== true && prerequisite.mandatory) exclude('mandatory_prerequisite', `${description}: ${met === false ? 'not met by the supplied record' : 'not verified'}.`)
    else if (met !== true) penalize('optional_prerequisite', met === false ? R.optionalPrerequisiteMissing : R.prerequisiteUnknown,
      `${description} is ${met === false ? 'not recorded as met' : 'not verified'}; this optional prerequisite needs consideration.`)
  }
  if (audit.exclusionReasons.length) return { audit }
  if (!foundationNeed && context.completedCourseIds?.some(id => course.priorLearningEquivalence.includes(id))) {
    penalize('prior_equivalence', R.priorEquivalentPenalty, 'Equivalent prior learning is recorded; a stronger matched option may be more useful. Prior learning does not establish mastery.')
  }
  if (!foundationNeed && course.level === 'foundation' && context.cpdExperience === 'frequent') {
    penalize('prior_cpd_foundation', R.frequentCpdFoundationPenalty, 'Regular CPD experience is recorded; introductory content may repeat previous exposure, without implying mastery.')
  }
  const factors = [primary ? `Exact ${domain.domainId} domain match.` : `Explicit secondary ${domain.domainId} domain match.`,
    `Matches the suggested ${GAP_TAXONOMY[gap.type].toLowerCase()}.`]
  if (exactSub) factors.push(`Exact subcompetency match: ${gap.subcompetency}.`)
  else factors.push('Broad development support; no exact subcompetency match is claimed.')
  const domainMatch = primary ? R.exact : R.secondaryDomain
  const subMatch = exactSub ? R.exact : R.genericSubcompetency
  const focus = GAP_EVIDENCE_FOCUS[gap.type]
  const evidenceMatch = R.exact * focus.filter(type => course.evidenceFocus.includes(type)).length / focus.length
  if (evidenceMatch > 0) factors.push('The learning activities address evidence relevant to the diagnosed gap type.')
  const needMatch = domainMatch * R.needWeights.domain + R.exact * R.needWeights.gap +
    subMatch * R.needWeights.subcompetency + evidenceMatch * R.needWeights.evidence
  const modalityScores: number[] = []
  if (context.preferredModalities?.length) modalityScores.push(context.preferredModalities.includes(course.modality) ? R.exact : R.contextMismatch)
  if (context.connectivity === 'limited' || context.connectivity === 'offline') {
    const fit = course.bandwidth === 'offline' ? R.exact : course.bandwidth === 'low_bandwidth'
      ? R.lowBandwidthFit : course.bandwidth === 'blended' ? R.blendedFit : R.contextMismatch
    modalityScores.push(fit)
    if (course.bandwidth === 'offline' || course.bandwidth === 'low_bandwidth') factors.push('This option fits the explicitly reported limited-connectivity context.')
  }
  const contextScores: number[] = []
  for (const [actual, relevance] of [[context.gradeOrClass, course.gradeRelevance], [context.subject, course.subjectRelevance]] as const) {
    if (actual) contextScores.push(relevance.some(value => normalized(value) === normalized(actual)) ? R.exact :
      relevance.includes('all') ? R.universalContext : R.contextMismatch)
  }
  if (typeof context.classSize === 'number' && Number.isFinite(context.classSize) && context.classSize >= R.largeClassSize) {
    contextScores.push(course.largeClassSupport ? R.exact : R.neutral)
    if (course.largeClassSupport) factors.push('The catalog includes large-class support relevant to the stored class-size context.')
  }
  const accessibility = context.accessibilityNeeds?.length
    ? R.exact * context.accessibilityNeeds.filter(feature => course.accessibility[feature]).length / context.accessibilityNeeds.length
    : R.exact * Object.values(course.accessibility).filter(Boolean).length / Object.keys(course.accessibility).length
  if (course.accessibility.downloadable_materials) factors.push('Downloadable materials are available in this synthetic opportunity design.')
  if (gap.type === 'resource_access' && course.lowResourceSupport) factors.push('Designed for low-resource implementation; resource ownership is not a competence judgement.')
  const exposureScores: number[] = []
  if (['exposure', 'readiness', 'confidence'].includes(gap.type)) exposureScores.push(course.readinessSupport === 'guided' ? R.exact :
    course.readinessSupport === 'introductory' ? R.lowBandwidthFit : R.genericSubcompetency)
  if (['none', 'basic'].includes(context.digitalTeachingExperience ?? '')) exposureScores.push(course.beginnerFriendly ? R.exact : R.genericSubcompetency)
  if (context.cpdExperience === 'none') exposureScores.push(course.readinessSupport === 'independent' ? R.genericSubcompetency : R.exact)
  if (context.adaptabilityOpenness === 'moderate' || context.selfEfficacyResilience === 'developing') {
    exposureScores.push(course.readinessSupport === 'guided' ? R.exact : R.neutral)
  }
  const developmentFit = R.levelFit[Math.abs(courseIndex - targetIndex)] ?? 0
  if (Math.abs(courseIndex - targetIndex) <= 1) factors.push('The opportunity level is compatible with the diagnosed development need.')
  const components: RecommendationComponents = { needMatch, modalityFit: average(modalityScores),
    practicalApplicability: course.practicalApplicability, contextFit: average(contextScores),
    accessibility, exposureReadiness: average(exposureScores), developmentFit }
  const weighted = (Object.keys(RECOMMENDATION_WEIGHTS) as (keyof RecommendationComponents)[])
    .reduce((sum, key) => sum + components[key] * RECOMMENDATION_WEIGHTS[key], 0)
  const score = round(Math.max(0, Math.min(100, weighted - audit.penalties.reduce((sum, penalty) => sum + penalty.amount, 0))))
  audit.components = components; audit.score = score; audit.subcompetencyMatch = subMatch; audit.gapTypeMatch = R.exact
  audit.ruleIds.push('framework_weighted_sum', 'explicit_domain_gap_alignment', exactSub ? 'exact_subcompetency' : 'broad_subcompetency')
  const confidence = gap.confidence !== 'Low' && domain.confidence !== 'Low' && needMatch >= R.minimumMediumNeed &&
    !audit.penalties.length ? 'Medium' : 'Low'
  const suggestion: LearningSuggestion = {
    courseId: course.courseId, title: course.title, description: course.description, score: Math.round(score * 100) / 100,
    confidence, reason: `Suggested learning opportunity for your provisional ${GAP_TAXONOMY[gap.type].toLowerCase()} in ${domain.domain}${exactSub ? `, focused on ${gap.subcompetency}` : ''}.`,
    matchFactors: factors, limitations: [...RECOMMENDATION_LIMITATIONS, ...audit.penalties.map(penalty => penalty.reason),
      ...(gap.confidence === 'Low' ? ['The underlying gap diagnosis has low confidence; this suggestion needs cautious interpretation.'] : [])],
    estimatedDuration: `${course.durationMinutes} minutes`, modality: course.modality, bandwidth: course.bandwidth, level: course.level,
    prerequisites: course.prerequisites.map(requirement => `${requirement.mandatory ? 'Required' : 'Suggested'}: ${requirement.kind === 'course'
      ? catalog.courses.find(item => item.courseId === requirement.value)!.title : `${requirement.value} digital teaching experience`}`),
    domainId: domain.domainId, gapType: gap.type, subcompetency: gap.subcompetency,
  }
  return { audit, ranked: { course, need, audit, suggestion } }
}

export function generateRecommendations(diagnosis: GapDiagnosis, catalog: CourseCatalog, profile: RecommendationContext = {}): { result: RecommendationResult; audit: RecommendationAudit[] } {
  validateCourseCatalog(catalog)
  const context = recommendationContext(profile)
  const eligible = diagnosis.domains.filter(domain => domain.gapStatus === 'targeted_development' &&
    typeof domain.score === 'number' && Number.isFinite(domain.score) && Object.hasOwn(DEVELOPMENT_LEVEL, domain.classification))
  const allNeeds: Need[] = eligible.flatMap(domain => domain.gaps.map(gap => ({ domain, gap })))
  // Use Step 4's selected priority needs; never create a need from a low score.
  const needs = (diagnosis.priorityGaps.length ? allNeeds.filter(need => diagnosis.priorityGaps.some(gap =>
    gap.domainId === need.domain.domainId && gap.type === need.gap.type)) : allNeeds)
    .sort((a, b) => lexical(a.domain.domainId, b.domain.domainId) || lexical(a.gap.type, b.gap.type))
  const audit: RecommendationAudit[] = [], ranked: Ranked[] = []
  for (const need of needs) for (const course of [...catalog.courses].sort((a, b) => lexical(a.courseId, b.courseId))) {
    const evaluation = evaluate(course, need, context, catalog)
    audit.push(evaluation.audit)
    if (evaluation.ranked) ranked.push(evaluation.ranked)
  }
  ranked.sort(compare)
  const seen = new Set<string>()
  const unique = ranked.filter(entry => { if (seen.has(entry.course.courseId)) return false; seen.add(entry.course.courseId); return true })
  const immediate = unique.slice(0, R.maxRecommendations)
  const used = new Set(immediate.map(entry => entry.course.courseId))
  const recommendations = immediate.map(entry => {
    const alternatives: LearningSuggestion[] = []
    for (const other of ranked) {
      if (alternatives.length === R.maxAlternatives) break
      if (other.need.domain.domainId === entry.need.domain.domainId && other.need.gap.type === entry.need.gap.type && !used.has(other.course.courseId)) {
        used.add(other.course.courseId)
        alternatives.push(other.suggestion)
      }
    }
    return { ...entry.suggestion, alternatives }
  })
  const result: RecommendationResult = { version: RECOMMENDATION_VERSION, catalogVersion: catalog.version,
    status: recommendations.length ? 'available' : diagnosis.status === 'insufficient_evidence' ? 'insufficient_evidence' :
      !needs.length ? 'no_diagnosed_gaps' : 'no_matches', recommendations,
    reviewRequired: diagnosis.reviewRequired || diagnosis.domains.some(domain => domain.reviewRequired),
    reviewReason: diagnosis.reviewRequired || diagnosis.domains.some(domain => domain.reviewRequired)
      ? 'The assessment includes a human-review signal. Suggestions remain provisional and developmental.' : null,
    limitations: [...RECOMMENDATION_LIMITATIONS, ...(!recommendations.length && needs.length
      ? ['No suitable catalog matches remain after relevance, level, and prerequisite checks.'] : [])],
  }
  return { result, audit }
}

export function teacherSafeRecommendations(result: RecommendationResult): RecommendationResult {
  const suggestion = (entry: LearningSuggestion): LearningSuggestion => ({
    courseId: entry.courseId, title: entry.title, description: entry.description, score: entry.score,
    confidence: entry.confidence, reason: entry.reason, matchFactors: [...entry.matchFactors], limitations: [...entry.limitations],
    estimatedDuration: entry.estimatedDuration, modality: entry.modality, bandwidth: entry.bandwidth, level: entry.level,
    prerequisites: [...entry.prerequisites], domainId: entry.domainId, gapType: entry.gapType, subcompetency: entry.subcompetency,
  })
  return { version: result.version, catalogVersion: result.catalogVersion, status: result.status,
    recommendations: result.recommendations.map(entry => ({ ...suggestion(entry), alternatives: entry.alternatives.map(suggestion) })),
    reviewRequired: result.reviewRequired, reviewReason: result.reviewReason, limitations: [...result.limitations] }
}
