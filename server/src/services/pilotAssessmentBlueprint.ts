import { ASSESSMENT_DOMAINS } from '../models/AssessmentItem'

export const PILOT_ASSESSMENT_MODE = 'pilot-synthetic' as const
export const PILOT_ASSESSMENT_VERSION = 'pilot-synthetic.v1' as const

export const PILOT_EVIDENCE_ORDER = [
  'situational judgement',
  'behaviour frequency',
  'knowledge/application',
  'reflective judgement',
  'performance evidence',
] as const

export const PILOT_EVIDENCE_TYPE_QUOTAS: Record<typeof PILOT_EVIDENCE_ORDER[number], number> = {
  'situational judgement': 4,
  'behaviour frequency': 3,
  'knowledge/application': 2,
  'reflective judgement': 2,
  'performance evidence': 1,
}

export const PILOT_ASSESSMENT_BLUEPRINT = {
  mode: PILOT_ASSESSMENT_MODE,
  totalItems: 108,
  requiredDomains: [...ASSESSMENT_DOMAINS],
  domains: {
    'Human-Centred Teaching & Empathy': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Communication & Influence': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Classroom Leadership & Behaviour Design': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Adaptive Teaching & Problem Solving': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Practical Pedagogy & Learning Design': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Resourcefulness & Entrepreneurial Thinking': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Digital & Future Skills': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Personal Effectiveness & Professional Identity': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
    'Community Engagement': { count: 12, evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS } },
  },
  evidenceTypeQuotas: { ...PILOT_EVIDENCE_TYPE_QUOTAS },
  perDomainTotal: 12,
} as const
