import { Router } from 'express'
import healthRoutes from './health.routes'
import authRoutes from './authRoutes'
import assessmentRoutes from './assessmentRoutes'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/assessment', assessmentRoutes)

export default router
