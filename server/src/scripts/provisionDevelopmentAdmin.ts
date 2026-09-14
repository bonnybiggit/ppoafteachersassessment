import 'dotenv/config'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import Administrator from '../models/Administrator'
import { adminSecret } from '../services/adminAuthService'

async function provision(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? ''
  const parsed = new URL(uri)
  if (process.env.NODE_ENV !== 'development' || parsed.protocol !== 'mongodb:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || parsed.pathname !== '/ppoaf_admin_dev') {
    throw new Error('Development provisioning requires a loopback MongoDB database named ppoaf_admin_dev and NODE_ENV=development.')
  }
  adminSecret()
  const email = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.DEV_ADMIN_PASSWORD
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Provide DEV_ADMIN_EMAIL and a DEV_ADMIN_PASSWORD of at least 12 characters and at most 72 UTF-8 bytes.')
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  await Administrator.createIndexes()
  // Insert only: never overwrite or reactivate an existing identity.
  await Administrator.create({ email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', isActive: true, sessionVersion: 0 })
  console.log('Development administrator created. Credentials have not been printed.')
}
provision().catch(() => {
  console.error('Development administrator provisioning failed. Check the documented local database, configuration and unique account requirements.')
  process.exitCode = 1
}).finally(async () => { await mongoose.disconnect() })
