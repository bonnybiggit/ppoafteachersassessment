import { BAND_BOUNDARIES } from './assessmentScoring'
import type { GapType } from '../models/GapDiagnosis'

export const GAP_DIAGNOSIS_VERSION = 'gap-diagnosis-v1'
// PROVISIONAL — requires pilot validation. Evidence scores use Step 3's 0–100
// scale. A 15-point contrast filters small differences, but is NOT a calibrated
// diagnostic cut-off. These are pattern rules, never new competency scores.
export const GAP_RULES = {
  meaningfulDifference: 15,
  strongDifference: 30,
  weaknessCeiling: BAND_BOUNDARIES[2],
  capabilityFloor: BAND_BOUNDARIES[2],
  minimumComparators: 2,
  minimumSupportingItems: 2,
  fullCoverage: 1,
  largeClassSize: 50, // Context only; provisional, not a competence threshold.
  maxPriorityGaps: 3,
  maxDevelopmentAreas: 3,
} as const
export const PROVISIONAL_LIMITATIONS = [
  'Provisional suggested development needs; requires pilot validation.',
  'The current item bank is synthetic, not official, and not psychometrically validated.',
  'Evidence patterns suggest possible development needs, not definitive causes or employment judgements.',
] as const
export const BAND_SEVERITY: Record<string, number> = {
  Emerging: 4, Basic: 3, Competent: 2, Advanced: 1, Transformational: 0,
}
export const CONTEXT_GAP_TYPES: readonly GapType[] = ['confidence', 'exposure', 'resource_access', 'context_complexity']
export const EVIDENCE_LABELS = {
  'situational judgement': 'Situational Judgement', 'behaviour frequency': 'Behaviour Frequency',
  'knowledge/application': 'Knowledge/Application', 'reflective judgement': 'Reflective Judgement',
  'performance evidence': 'Performance Evidence',
} as const
