import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import { attemptById, createAttempt, createResponse, currentAttempt, responsesForAttempt } from '../controllers/assessmentController'

const router = Router()

router.use(authMiddleware)
router.post('/attempts', createAttempt)
router.get('/attempts/current', currentAttempt)
router.get('/attempts/:attemptId', attemptById)
router.post('/attempts/:attemptId/responses', createResponse)
router.get('/attempts/:attemptId/responses', responsesForAttempt)

export default router
