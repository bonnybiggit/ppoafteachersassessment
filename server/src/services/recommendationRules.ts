import type { GapType } from '../models/GapDiagnosis'
import type { CourseLevel } from '../models/Recommendation'

export const RECOMMENDATION_VERSION = 'recommendation-v1'
// Framework formula supplied for Step 5. These weights rank opportunities;
// they NEVER rescore teachers or change the diagnosis.
export const RECOMMENDATION_WEIGHTS = {
  needMatch: .30, modalityFit: .20, practicalApplicability: .15, contextFit: .10,
  accessibility: .10, exposureReadiness: .10, developmentFit: .05,
} as const
// PROVISIONAL — REQUIRES PILOT VALIDATION. Operational definitions and every
// score/penalty below are documented in server/docs/recommendations.md.
export const RECOMMENDATION_RULES = {
  neutral: 50, exact: 100, secondaryDomain: 70, genericSubcompetency: 40, universalContext: 70,
  contextMismatch: 20, lowBandwidthFit: 90, blendedFit: 60,
  levelFit: [100, 70, 30, 0], maximumLevelJump: 1, largeClassSize: 50,
  optionalPrerequisiteMissing: 15, prerequisiteUnknown: 5,
  priorEquivalentPenalty: 20, frequentCpdFoundationPenalty: 10,
  needWeights: { domain: .35, gap: .25, subcompetency: .30, evidence: .10 },
  maxRecommendations: 3, maxAlternatives: 2, minimumMediumNeed: 70,
} as const
export const DEVELOPMENT_LEVEL: Record<string, CourseLevel> = {
  Emerging: 'foundation', Basic: 'developing', Competent: 'intermediate',
  Advanced: 'advanced', Transformational: 'advanced',
}
export const GAP_EVIDENCE_FOCUS: Record<GapType, readonly string[]> = {
  knowledge: ['knowledge/application'], judgement: ['situational judgement', 'reflective judgement'],
  practice: ['performance evidence'], reflection: ['reflective judgement'],
  confidence: ['behaviour frequency', 'performance evidence'],
  calibration: ['behaviour frequency', 'situational judgement', 'performance evidence'],
  exposure: ['performance evidence', 'behaviour frequency'], resource_access: ['performance evidence'],
  context_complexity: ['performance evidence', 'situational judgement'],
  readiness: ['behaviour frequency', 'performance evidence'],
}
export const RECOMMENDATION_LIMITATIONS = [
  'Suggested learning opportunities for development; recommendations are provisional and require pilot validation.',
  'This is a synthetic MVP catalog, not an official PPOAF or partner course catalog. These opportunities are not enrollable courses.',
  'The assessment evidence is synthetic, provisional, and not psychometrically validated.',
] as const
