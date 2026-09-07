import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

export const ASSESSMENT_STATUSES = ['in_progress', 'completed', 'abandoned'] as const

export interface IAssessmentAttempt {
  teacherId: Types.ObjectId
  status: typeof ASSESSMENT_STATUSES[number]
  startedAt: Date
  completedAt?: Date
  currentItemIndex: number
  totalItems: number
  assessmentVersion: string
  selectedItemIds: Types.ObjectId[]
  consentConfirmed: boolean
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
    assessmentVersion: { type: String, required: true, trim: true },
    // Ordered references preserve each attempt's own subset without assembling it.
    selectedItemIds: { type: [{ type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true }], default: [] },
    consentConfirmed: { type: Boolean, default: false, required: true },
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
