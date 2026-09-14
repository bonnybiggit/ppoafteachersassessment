import 'dotenv/config'
import app from './app'
import { connectDatabase, disconnectDatabase } from './config/database'
import { getJwtConfig, initializeAuth } from './services/authService'
import { initializeAssessment } from './services/assessmentService'
import { initializeAdminAuth } from './services/adminAuthService'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000

async function startServer(): Promise<void> {
  try {
    getJwtConfig()
    // 1. Load environment variables and connect to MongoDB Atlas
    await connectDatabase()
    await initializeAuth()
    await initializeAdminAuth()
    await initializeAssessment()

    // 2. Start HTTP Express Server only after successful database connection
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [Server] PPOAF Teachers Assessment API is listening on port ${PORT}`)
      console.log(`🌐 [Server] Health Check available at http://localhost:${PORT}/api/health`)
    })

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 [Server] Received ${signal}. Shutting down gracefully...`)
      server.close(async () => {
        await disconnectDatabase()
        console.log('✅ [Server] HTTP server closed.')
        process.exit(0)
      })
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err)
    const safeMessage = rawMessage.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb$1://<credentials>@')
    console.error('❌ [Server] Fatal error during startup:', safeMessage)
    process.exit(1)
  }
}

startServer()
