import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

export interface IAssessmentResponse {
  teacherId: Types.ObjectId
  attemptId: Types.ObjectId
  itemId: Types.ObjectId
  // Raw answers may be text, choices, numbers, arrays, or structured evidence.
  // Consumers must narrow unknown values for the corresponding item format.
  selectedResponse: unknown
  responseValue?: unknown
  responseDurationMs?: number
  answeredAt: Date
  createdAt: Date
  updatedAt: Date
}

export type AssessmentResponseDocument = HydratedDocument<IAssessmentResponse>

const assessmentResponseSchema = new Schema<IAssessmentResponse>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true, index: true },
    selectedResponse: { type: Schema.Types.Mixed, required: true },
    // This is a raw response value, never a calculated competency score.
    responseValue: { type: Schema.Types.Mixed },
    responseDurationMs: { type: Number, min: 0, validate: Number.isFinite },
    answeredAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: true,
    // Provision the unique index before future response writes are enabled.
    autoCreate: false,
    autoIndex: false,
  },
)

assessmentResponseSchema.index({ attemptId: 1, itemId: 1 }, { unique: true })

export const AssessmentResponse = model<IAssessmentResponse>('AssessmentResponse', assessmentResponseSchema)

export default AssessmentResponse
