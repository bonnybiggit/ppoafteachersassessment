import 'dotenv/config'
import app from './app'
import { connectDatabase, disconnectDatabase } from './config/database'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000

async function startServer(): Promise<void> {
  // Attempt Database Connection
  await connectDatabase()

  // Start HTTP Server
  const server = app.listen(PORT, () => {
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
}

startServer().catch((err) => {
  console.error('❌ [Server] Fatal error during startup:', err)
  process.exit(1)
})
