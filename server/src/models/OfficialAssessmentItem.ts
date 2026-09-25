import { Schema, model } from 'mongoose'
import { ASSESSMENT_DOMAINS, AssessmentItem } from './AssessmentItem'
import type { OfficialItem } from '../services/officialAssessmentImport'

// Import-only view of the existing bank. No defaults invent pilot metadata.
// Inactive official records cannot enter either current assembly path.
const schema = new Schema<OfficialItem>({
  itemId: { type: String, required: true },
  version: { type: String, required: true, enum: ['ppoaf-original-450.v1'] },
  assessmentVersion: { type: String, required: true, enum: ['ppoaf-original-450.v1'] },
  mode: { type: String, required: true, enum: ['official'] },
  isActive: { type: Boolean, required: true, validate: (value: boolean) => value === false },
  primaryDomain: { type: String, required: true, enum: ASSESSMENT_DOMAINS },
  domainNumber: { type: Number, required: true, min: 1, max: 9 },
  section: { type: String, required: true, enum: ['A', 'B'] },
  sourceQuestionNumber: { type: Number, required: true, min: 1, max: 50 },
  documentOrder: { type: Number, required: true, min: 1, max: 450 },
  prompt: { type: String, required: true },
  reverseKeyed: { type: Boolean, required: true },
  provenance: {
    sourcePath: { type: String, required: true },
    sourceSha256: { type: String, required: true },
    domainHeading: { type: String, required: true },
    sectionHeading: { type: String, required: true },
    numberParagraph: { type: Number, required: true },
    textParagraphs: { type: [Number], required: true },
  },
}, { strict: 'throw', timestamps: true, autoCreate: false, autoIndex: false })

export const OfficialAssessmentItem = model<OfficialItem>('OfficialAssessmentItem', schema, AssessmentItem.collection.name)
