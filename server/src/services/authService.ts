import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Teacher, type TeacherDocument } from '../models/Teacher'

export class AuthError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
  }
}

export interface AuthenticatedTeacherIdentity {
  id: string
  email: string
}

export function verifyTeacherToken(token: string): AuthenticatedTeacherIdentity {
  const { secret } = getJwtConfig()
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      typeof payload.email !== 'string' ||
      !payload.email.trim() ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp)
    ) {
      throw new Error('Invalid identity claims')
    }
    return { id: payload.sub, email: payload.email }
  } catch {
    throw new AuthError(401, 'Authentication required.')
  }
}

export async function getAuthenticatedTeacher(id: string) {
  const teacher = await Teacher.findById(id).select('-passwordHash')
  if (!teacher || !teacher.isActive) {
    throw new AuthError(401, 'Authentication required.')
  }
  return safeTeacher(teacher)
}

export function getJwtConfig(): { secret: string; expiresIn: number } {
  const secret = process.env.JWT_SECRET
  const duration = process.env.JWT_EXPIRES_IN?.trim()
  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.')
  }
  // Accept seconds or an explicit s/m/h/d suffix; avoid ambiguous unitless strings.
  const match = duration?.match(/^([1-9]\d*)(s|m|h|d)?$/)
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  const expiresIn = match ? Number(match[1]) * units[match[2] || 's'] : 0
  if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
    throw new Error('JWT_EXPIRES_IN must be positive seconds or a duration such as 1h or 7d.')
  }
  return { secret, expiresIn }
}

export async function initializeAuth(): Promise<void> {
  getJwtConfig()
  // Build the declared unique index before accepting writes; do not drop indexes.
  await Teacher.createIndexes()
}

function requiredText(input: Record<string, unknown>, field: string): string {
  const value = input[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthError(400, `${field} is required and must be a string.`)
  }
  return value
}

function credentials(body: unknown): { input: Record<string, unknown>; email: string; password: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AuthError(400, 'A request object is required.')
  }
  const input = body as Record<string, unknown>
  const email = requiredText(input, 'email').trim().toLowerCase()
  const password = requiredText(input, 'password')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError(400, 'A valid email is required.')
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new AuthError(400, 'Password must not exceed 72 UTF-8 bytes.')
  }
  return { input, email, password }
}

function safeTeacher(teacher: TeacherDocument) {
  return {
    id: teacher._id.toString(),
    email: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    isActive: teacher.isActive,
    profileCompleted: teacher.profileCompleted,
    assessmentCompleted: teacher.assessmentCompleted,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  }
}

export async function registerTeacher(body: unknown) {
  const { input, email, password } = credentials(body)
  const firstName = requiredText(input, 'firstName').trim()
  const lastName = requiredText(input, 'lastName').trim()
  if (password.length < 8) {
    throw new AuthError(400, 'Password must contain at least 8 characters.')
  }
  if (await Teacher.exists({ email })) {
    throw new AuthError(409, 'Email is already registered.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const teacher = await Teacher.create({ email, passwordHash, firstName, lastName })
    return safeTeacher(teacher)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new AuthError(409, 'Email is already registered.')
    }
    throw error
  }
}

export async function loginTeacher(body: unknown) {
  const { email, password } = credentials(body)
  const teacher = await Teacher.findOne({ email }).select('+passwordHash')
  if (!teacher || !(await bcrypt.compare(password, teacher.passwordHash)) || !teacher.isActive) {
    throw new AuthError(401, 'Invalid email or password.')
  }
  const { secret, expiresIn } = getJwtConfig()
  const token = jwt.sign({ email: teacher.email }, secret, {
    algorithm: 'HS256',
    subject: teacher._id.toString(),
    expiresIn,
  })
  return { token, teacher: safeTeacher(teacher) }
}
