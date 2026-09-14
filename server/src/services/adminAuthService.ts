import bcrypt from 'bcrypt'
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import Administrator from '../models/Administrator'
import { AuthError } from './authService'

const audience = 'ppoaf-admin'
const issuer = 'ppoaf-admin-auth'
let dummyPasswordHash: Promise<string> | undefined

export function adminSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret || secret.length < 32 || secret === process.env.JWT_SECRET) {
    throw new AuthError(503, 'Administrator sign-in is not configured.')
  }
  return secret
}

export async function initializeAdminAuth(): Promise<void> {
  // An unconfigured admin area must not interrupt existing teacher operations.
  if (process.env.ADMIN_JWT_SECRET) {
    adminSecret()
    await Administrator.createIndexes()
  }
}

export type AdminIdentity = { id: string; email: string; role: 'admin' }
export type AdminSession = { identity: AdminIdentity; version: number }

export async function verifyAdminSession(token: string): Promise<AdminSession> {
  const secret = adminSecret()
  let payload: jwt.JwtPayload
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], audience, issuer })
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string' ||
      !/^[a-f\d]{24}$/i.test(decoded.sub) || decoded.role !== 'admin' ||
      !Number.isSafeInteger(decoded.version) || !Number.isFinite(decoded.exp)) throw new Error()
    payload = decoded
  } catch { throw new AuthError(401, 'Administrator session is invalid or expired.') }
  const admin = await Administrator.findById(payload.sub)
  if (!admin || !admin.isActive || admin.role !== 'admin' || admin.sessionVersion !== payload.version) {
    throw new AuthError(401, 'Administrator session is invalid or expired.')
  }
  return { identity: { id: String(admin._id), email: admin.email, role: 'admin' }, version: admin.sessionVersion }
}

export async function loginAdmin(input: unknown): Promise<{ token: string; admin: AdminIdentity }> {
  const secret = adminSecret()
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AuthError(400, 'Email and password are required.')
  const body = input as Record<string, unknown>
  if (Object.keys(body).some(key => !['email', 'password'].includes(key)) ||
    typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password) > 72) {
    throw new AuthError(400, 'Enter a valid email and password.')
  }
  const admin = await Administrator.findOne({ email: body.email.trim().toLowerCase() }).select('+passwordHash')
  // Perform a password comparison even for unknown identities; never reveal account existence.
  const passwordHash = admin?.passwordHash ?? await (dummyPasswordHash ??= bcrypt.hash(randomBytes(32).toString('hex'), 12))
  const matches = await bcrypt.compare(body.password, passwordHash)
  if (!admin || !matches || !admin.isActive || admin.role !== 'admin') throw new AuthError(401, 'Invalid administrator credentials.')
  const identity: AdminIdentity = { id: String(admin._id), email: admin.email, role: 'admin' }
  const token = jwt.sign({ role: 'admin', version: admin.sessionVersion }, secret,
    { algorithm: 'HS256', subject: identity.id, audience, issuer, expiresIn: '1h' })
  return { token, admin: identity }
}

export async function logoutAdmin(session: AdminSession): Promise<void> {
  await Administrator.updateOne({ _id: session.identity.id, sessionVersion: session.version }, { $inc: { sessionVersion: 1 } })
}
