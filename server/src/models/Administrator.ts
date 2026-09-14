import { Schema, model } from 'mongoose'

const schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin'], default: 'admin', required: true },
  isActive: { type: Boolean, default: true, required: true },
  sessionVersion: { type: Number, default: 0, required: true },
}, { timestamps: true, autoCreate: false, autoIndex: false })

export default model('Administrator', schema)
