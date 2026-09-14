import { Router, type RequestHandler } from 'express'
import { AuthError } from '../services/authService'
import { loginAdmin, logoutAdmin, verifyAdminSession, type AdminSession } from '../services/adminAuthService'
import { getAdminOverview } from '../services/adminOverviewService'

const router = Router()
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
const safe = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await handler(req, res, next) } catch (error) {
    res.status(error instanceof AuthError ? error.statusCode : 503).json({ message:
      error instanceof AuthError ? error.message : 'Administration is temporarily unavailable. Please try again.' })
  }
}

// Per-process protection. Production gateways should enforce distributed rate limits too.
const attempts = new Map<string, { count: number; until: number }>()
router.post('/login', safe(async (req, res) => {
  const now = Date.now()
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  const key = req.ip ?? 'unknown'
  const bucket = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 }
  if (bucket.count >= 10 || (!attempts.has(key) && attempts.size >= 10_000)) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.until - now) / 1000))))
    res.status(429).json({ message: 'Too many sign-in attempts. Please try again later.' }); return
  }
  bucket.count++; attempts.set(key, bucket)
  res.json(await loginAdmin(req.body))
}))

router.use(safe(async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !/^Bearer [^\s,]+$/.test(header)) throw new AuthError(401, 'Administrator sign-in is required.')
  res.locals.adminSession = await verifyAdminSession(header.slice(7))
  next()
}))
router.get('/me', (_req, res) => { res.json({ admin: (res.locals.adminSession as AdminSession).identity }) })
router.post('/logout', safe(async (_req, res) => {
  await logoutAdmin(res.locals.adminSession as AdminSession)
  res.status(204).end()
}))
router.get('/overview', safe(async (_req, res) => { res.json(await getAdminOverview()) }))
export default router
