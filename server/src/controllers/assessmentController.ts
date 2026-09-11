import type { Request, Response } from 'express'
import { AuthError, getAuthenticatedTeacher } from '../services/authService'
import { AssessmentError, getAttempt, getCurrentAttempt, getQuestions, getResponses, saveResponse, startAttempt, submitAttempt } from '../services/assessmentService'
import { ScoringError, getAttemptScoring, scoreAttemptForTeacher } from '../services/assessmentScoring'
import { getGapDiagnosisForTeacher } from '../services/gapDiagnosisService'

async function handle(
  req: Request,
  res: Response,
  operation: (teacherId: string) => Promise<object>,
  status = 200,
): Promise<void> {
  try {
    if (!req.teacherIdentity) throw new AuthError(401, 'Authentication required.')
    await getAuthenticatedTeacher(req.teacherIdentity.id)
    const result = await operation(req.teacherIdentity.id)
    res.status(status).json({ success: true, ...result })
  } catch (error) {
    const expected = error instanceof AuthError || error instanceof AssessmentError || error instanceof ScoringError
    res.status(expected ? error.statusCode : 500).json({
      success: false,
      message: expected ? error.message : 'Unable to complete assessment request.',
    })
  }
}

export async function createAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ attempt: await startAttempt(id, req.body) }), 201)
}

export async function currentAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ attempt: await getCurrentAttempt(id) }))
}

export async function attemptById(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ attempt: await getAttempt(id, req.params.attemptId) }))
}

export async function createResponse(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ response: await saveResponse(id, req.params.attemptId, req.body) }), 201)
}

export async function responsesForAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ responses: await getResponses(id, req.params.attemptId) }))
}

export async function questionsForAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, id => getQuestions(id, req.params.attemptId))
}

export async function submit(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ attempt: await submitAttempt(id, req.params.attemptId) }))
}

export async function scoreAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ scoring: await scoreAttemptForTeacher(id, req.params.attemptId) }), 200)
}

export async function scoringForAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ scoring: await getAttemptScoring(id, req.params.attemptId) }))
}

export async function gapsForAttempt(req: Request, res: Response): Promise<void> {
  await handle(req, res, async id => ({ diagnosis: await getGapDiagnosisForTeacher(id, req.params.attemptId) }))
}
