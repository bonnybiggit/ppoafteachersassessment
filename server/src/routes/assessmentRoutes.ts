import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import { attemptById, createAttempt, createResponse, currentAttempt, questionsForAttempt, responsesForAttempt, submit } from '../controllers/assessmentController'

const router = Router()

router.use(authMiddleware)
router.post('/attempts', createAttempt)
router.get('/attempts/current', currentAttempt)
router.get('/attempts/current/questions', questionsForAttempt)
router.get('/attempts/:attemptId/questions', questionsForAttempt)
router.post('/attempts/:attemptId/submit', submit)
router.get('/attempts/:attemptId', attemptById)
router.post('/attempts/:attemptId/responses', createResponse)
router.get('/attempts/:attemptId/responses', responsesForAttempt)

export default router
