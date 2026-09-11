import { Schema } from 'mongoose'

export const GAP_TAXONOMY = {
  knowledge: 'Knowledge Gap', judgement: 'Judgement Gap', practice: 'Practice Gap',
  reflection: 'Reflection Gap', confidence: 'Confidence Gap', calibration: 'Calibration Gap',
  exposure: 'Exposure Gap', resource_access: 'Resource / Access Gap',
  context_complexity: 'Context Complexity Gap', readiness: 'Readiness Gap',
} as const
export type GapType = keyof typeof GAP_TAXONOMY
export type GapConfidence = 'High' | 'Medium' | 'Low'
export type GapPriority = 'high' | 'medium' | 'low'

export interface GapCandidate {
  type: GapType
  label: string
  priority: GapPriority
  confidence: GapConfidence
  subcompetency: string | null
  developmentAreas: string[]
  rationale: string
  supportingEvidence: string[]
  contextualFactors: string[]
  limitations: string[]
}
export interface DomainGapDiagnosis {
  domain: string
  domainId: string
  score: number | null
  classification: string
  confidence: GapConfidence
  nearCutScore: boolean
  gapStatus: 'insufficient_evidence' | 'targeted_development' | 'no_specific_gap'
  priority: GapPriority | null
  primaryGapType: GapType | null
  gaps: GapCandidate[]
  reviewRequired: boolean
  reviewReason: string | null
  limitations: string[]
}
export interface PriorityGap extends GapCandidate { domain: string; domainId: string }
export interface GapDiagnosis {
  version: string
  status: 'available' | 'insufficient_evidence'
  domains: DomainGapDiagnosis[]
  priorityGaps: PriorityGap[]
  reviewRequired: boolean
  limitations: string[]
}
export interface StoredGapDiagnosis { sourceFingerprint: string; result: GapDiagnosis }

const candidateFields = {
  type: { type: String, enum: Object.keys(GAP_TAXONOMY), required: true },
  label: { type: String, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  subcompetency: { type: String, default: null },
  developmentAreas: { type: [String], default: [] },
  rationale: { type: String, required: true },
  supportingEvidence: { type: [String], default: [] },
  contextualFactors: { type: [String], default: [] },
  limitations: { type: [String], default: [] },
}
const candidateSchema = new Schema(candidateFields, { _id: false })
const domainSchema = new Schema({
  domain: { type: String, required: true }, domainId: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: null },
  classification: { type: String, required: true },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  nearCutScore: { type: Boolean, required: true },
  gapStatus: { type: String, enum: ['insufficient_evidence', 'targeted_development', 'no_specific_gap'], required: true },
  priority: { type: String, enum: ['high', 'medium', 'low', null], default: null },
  primaryGapType: { type: String, enum: [...Object.keys(GAP_TAXONOMY), null], default: null },
  gaps: { type: [candidateSchema], default: [] },
  reviewRequired: { type: Boolean, required: true }, reviewReason: { type: String, default: null },
  limitations: { type: [String], default: [] },
}, { _id: false })
const prioritySchema = new Schema({ ...candidateFields,
  domain: { type: String, required: true }, domainId: { type: String, required: true },
}, { _id: false })
const diagnosisSchema = new Schema({
  version: { type: String, required: true },
  status: { type: String, enum: ['available', 'insufficient_evidence'], required: true },
  domains: { type: [domainSchema], default: [] }, priorityGaps: { type: [prioritySchema], default: [] },
  reviewRequired: { type: Boolean, required: true }, limitations: { type: [String], default: [] },
}, { _id: false })
export const storedGapDiagnosisSchema = new Schema({
  sourceFingerprint: { type: String, required: true }, result: { type: diagnosisSchema, required: true },
}, { _id: false })
