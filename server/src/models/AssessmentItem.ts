import { Schema, model, type HydratedDocument } from 'mongoose'

export const ASSESSMENT_DOMAINS = [
  'Human-Centred Teaching & Empathy',
  'Communication & Influence',
  'Classroom Leadership & Behaviour Design',
  'Adaptive Teaching & Problem Solving',
  'Practical Pedagogy & Learning Design',
  'Resourcefulness & Entrepreneurial Thinking',
  'Digital & Future Skills',
  'Personal Effectiveness & Professional Identity',
  'Community Engagement',
] as const

export const EVIDENCE_TYPES = [
  'situational judgement',
  'behaviour frequency',
  'knowledge/application',
  'reflective judgement',
  'performance evidence',
] as const

export interface IAssessmentItem {
  itemId: string
  prompt: string
  primaryDomain: typeof ASSESSMENT_DOMAINS[number]
  subcompetency: string
  evidenceType: typeof EVIDENCE_TYPES[number]
  difficulty?: number
  discrimination?: number
  profileTags: string[]
  reverseKeyed: boolean
  // The key format depends on the item format; consumers must narrow this value.
  responseKey?: unknown
  socialDesirabilityRisk?: string
  criticalFlag: boolean
  courseTags: string[]
  version: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type AssessmentItemDocument = HydratedDocument<IAssessmentItem>

const assessmentItemSchema = new Schema<IAssessmentItem>(
  {
    itemId: { type: String, required: true, trim: true, unique: true },
    prompt: { type: String, required: true, trim: true },
    primaryDomain: { type: String, required: true, enum: ASSESSMENT_DOMAINS },
    subcompetency: { type: String, required: true, trim: true },
    evidenceType: { type: String, required: true, enum: EVIDENCE_TYPES },
    // Calibration scales are not finalized; store finite metadata without scoring.
    difficulty: { type: Number, validate: Number.isFinite },
    discrimination: { type: Number, validate: Number.isFinite },
    // Cross-cutting context/disposition tags are separate from scored domains.
    profileTags: { type: [{ type: String, trim: true }], default: [] },
    reverseKeyed: { type: Boolean, default: false },
    responseKey: { type: Schema.Types.Mixed },
    socialDesirabilityRisk: { type: String, trim: true },
    criticalFlag: { type: Boolean, default: false },
    courseTags: { type: [{ type: String, trim: true }], default: [] },
    version: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Provision declared indexes before future item-bank writes are enabled.
    autoCreate: false,
    autoIndex: false,
  },
)

export const AssessmentItem = model<IAssessmentItem>('AssessmentItem', assessmentItemSchema)

export default AssessmentItem
