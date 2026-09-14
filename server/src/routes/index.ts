import { Router } from 'express'
import healthRoutes from './health.routes'
import authRoutes from './authRoutes'
import assessmentRoutes from './assessmentRoutes'
import adminRoutes from './adminRoutes'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/assessment', assessmentRoutes)
router.use('/admin', adminRoutes)

export default router
