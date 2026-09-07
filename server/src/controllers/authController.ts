import type { Request, Response } from 'express'
import { AuthError, getAuthenticatedTeacher, loginTeacher, registerTeacher } from '../services/authService'

function respondWithError(res: Response, error: unknown): void {
  const status = error instanceof AuthError ? error.statusCode : 500
  const message = error instanceof AuthError ? error.message : 'Unable to complete authentication request.'
  res.status(status).json({ success: false, message })
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const teacher = await registerTeacher(req.body)
    res.status(201).json({ success: true, teacher })
  } catch (error) {
    respondWithError(res, error)
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = await loginTeacher(req.body)
    res.status(200).json({ success: true, ...result })
  } catch (error) {
    respondWithError(res, error)
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.teacherIdentity) {
      throw new AuthError(401, 'Authentication required.')
    }
    const teacher = await getAuthenticatedTeacher(req.teacherIdentity.id)
    res.status(200).json({ success: true, teacher })
  } catch (error) {
    respondWithError(res, error)
  }
}
