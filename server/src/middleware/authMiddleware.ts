import type { NextFunction, Request, Response } from 'express'
import { AuthError, verifyTeacherToken, type AuthenticatedTeacherIdentity } from '../services/authService'

declare module 'express-serve-static-core' {
  interface Request {
    teacherIdentity?: AuthenticatedTeacherIdentity
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  delete req.teacherIdentity
  const authorization = req.headers.authorization
  const headerCount = req.rawHeaders.filter((value, index) =>
    index % 2 === 0 && value.toLowerCase() === 'authorization'
  ).length
  const match = typeof authorization === 'string'
    ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization)
    : null

  if (!match || headerCount !== 1) {
    res.status(401).json({ success: false, message: 'Authentication required.' })
    return
  }

  try {
    req.teacherIdentity = verifyTeacherToken(match[1])
  } catch (error) {
    const status = error instanceof AuthError ? error.statusCode : 500
    res.status(status).json({
      success: false,
      message: status === 401 ? 'Authentication required.' : 'Unable to complete authentication request.',
    })
    return
  }
  next()
}
