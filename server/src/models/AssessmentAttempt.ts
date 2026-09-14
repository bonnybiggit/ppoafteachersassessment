import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { storedGapDiagnosisSchema, type StoredGapDiagnosis } from './GapDiagnosis'
import { storedRecommendationsSchema, type StoredRecommendations } from './Recommendation'

export const ASSESSMENT_STATUSES = ['in_progress', 'completed', 'abandoned'] as const

export type AssessmentMode = 'default' | 'pilot-synthetic'

export type AssessmentScoringConfidence = 'High' | 'Medium' | 'Low'
export type AssessmentScoringStatus = 'scored' | 'insufficient_data'

export interface IAssessmentDomainScoringResult {
  domain: string
  domainWeight: number
  score: number | null
  classification: string
  validItemCount: number
  expectedItemCount: number
  completionRate: number
  evidenceTypeScores: Record<string, number | null>
  confidenceLevel: AssessmentScoringConfidence
  qualityFlags: string[]
  nearCutScore: boolean
  criticalItemFlagged: boolean
  criticalItemIds: string[]
}

export interface IAssessmentScoringResult {
  status: AssessmentScoringStatus
  scoredAt: Date
  scoringVersion: string
  overallCompetencyScore: number | null
  overallClassification: string
  domains: IAssessmentDomainScoringResult[]
}

export interface IAssessmentAttempt {
  teacherId: Types.ObjectId
  status: typeof ASSESSMENT_STATUSES[number]
  startedAt: Date
  completedAt?: Date
  currentItemIndex: number
  totalItems: number
  mode: AssessmentMode
  assessmentVersion: string
  selectedItemIds: Types.ObjectId[]
  consentConfirmed: boolean
  scoring?: IAssessmentScoringResult
  gapDiagnosis?: StoredGapDiagnosis
  recommendations?: StoredRecommendations
  createdAt: Date
  updatedAt: Date
}

export type AssessmentAttemptDocument = HydratedDocument<IAssessmentAttempt>

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    status: { type: String, enum: ASSESSMENT_STATUSES, default: 'in_progress', required: true },
    startedAt: { type: Date, default: Date.now, required: true },
    completedAt: { type: Date },
    currentItemIndex: { type: Number, min: 0, validate: Number.isSafeInteger, default: 0, required: true },
    totalItems: { type: Number, min: 0, validate: Number.isSafeInteger, default: 0, required: true },
    mode: { type: String, enum: ['default', 'pilot-synthetic'], default: 'default', required: true },
    assessmentVersion: { type: String, required: true, trim: true },
    // Ordered references preserve each attempt's own subset without assembling it.
    selectedItemIds: { type: [{ type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true }], default: [] },
    consentConfirmed: { type: Boolean, default: false, required: true },
    gapDiagnosis: { type: storedGapDiagnosisSchema, default: undefined },
    recommendations: { type: storedRecommendationsSchema, default: undefined },
    scoring: {
      type: {
        status: { type: String, enum: ['scored', 'insufficient_data'], default: 'insufficient_data', required: true },
        scoredAt: { type: Date, default: Date.now },
        scoringVersion: { type: String, trim: true, required: true },
        overallCompetencyScore: { type: Number, min: 0, max: 100 },
        overallClassification: { type: String, trim: true },
        domains: [{
          domain: { type: String, required: true },
          domainWeight: { type: Number, min: 0, max: 1, required: true },
          score: { type: Number, min: 0, max: 100 },
          classification: { type: String, trim: true },
          validItemCount: { type: Number, min: 0, required: true },
          expectedItemCount: { type: Number, min: 0, required: true },
          completionRate: { type: Number, min: 0, max: 1, required: true },
          evidenceTypeScores: { type: Schema.Types.Mixed, default: {} },
          confidenceLevel: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
          qualityFlags: { type: [{ type: String, trim: true }], default: [] },
          nearCutScore: { type: Boolean, default: false },
          criticalItemFlagged: { type: Boolean, default: false },
          criticalItemIds: { type: [{ type: String, trim: true }], default: [] },
        }],
      },
      default: undefined,
    },
  },
  {
    timestamps: true,
    autoCreate: false,
    autoIndex: false,
  },
)

assessmentAttemptSchema.index(
  { teacherId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' } },
)

export const AssessmentAttempt = model<IAssessmentAttempt>('AssessmentAttempt', assessmentAttemptSchema)

export default AssessmentAttempt
