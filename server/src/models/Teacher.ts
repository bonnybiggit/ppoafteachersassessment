import { Schema, model, type HydratedDocument } from 'mongoose'

export interface ITeacher {
  email: string
  passwordHash: string
  firstName?: string
  lastName?: string
  age?: number
  gender?: string
  maritalStatus?: string
  highestEducation?: string
  yearsOfTeachingExperience?: number
  currentRole?: string
  subject?: string
  gradeOrClass?: string
  schoolType?: string
  schoolLocation?: string
  classSize?: number
  incomeRange?: string
  cpdExperience?: string
  digitalTeachingExperience?: string
  adaptabilityOpenness?: string
  selfEfficacyResilience?: string
  isActive: boolean
  profileCompleted: boolean
  assessmentCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export type TeacherDocument = HydratedDocument<ITeacher>

const teacherSchema = new Schema<ITeacher>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // The authentication service supplies a bcrypt hash, never a plain-text password.
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    // Profile/context supports routing and personalisation, never competency scoring.
    age: { type: Number, min: 0 },
    gender: { type: String, trim: true },
    maritalStatus: { type: String, trim: true },
    highestEducation: { type: String, trim: true },
    yearsOfTeachingExperience: { type: Number, min: 0 },
    currentRole: { type: String, trim: true },
    subject: { type: String, trim: true },
    gradeOrClass: { type: String, trim: true },
    schoolType: { type: String, trim: true },
    schoolLocation: { type: String, trim: true },
    classSize: { type: Number, min: 0 },
    incomeRange: { type: String, trim: true },
    cpdExperience: { type: String, trim: true },
    digitalTeachingExperience: { type: String, trim: true },
    adaptabilityOpenness: { type: String, trim: true },
    selfEfficacyResilience: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    profileCompleted: { type: Boolean, default: false },
    assessmentCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // Importing the model must not create collections or indexes.
    // Authentication startup provisions the unique email index before accepting writes.
    autoCreate: false,
    autoIndex: false,
    toJSON: {
      transform(_document, result) {
        Reflect.deleteProperty(result, 'passwordHash')
        return result
      },
    },
    toObject: {
      transform(_document, result) {
        Reflect.deleteProperty(result, 'passwordHash')
        return result
      },
    },
  },
)

export const Teacher = model<ITeacher>('Teacher', teacherSchema)

export default Teacher
