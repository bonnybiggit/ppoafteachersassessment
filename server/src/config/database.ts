import mongoose from 'mongoose'
import dns from 'node:dns'

// Ensure reliable SRV DNS resolution across Node.js runtime environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch {
  // Fall back to default system DNS if custom servers cannot be set
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb$1://<credentials>@')
}

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI

  if (!uri || uri.trim() === '') {
    throw new Error('MONGODB_URI is not defined in environment variables.')
  }

  try {
    await mongoose.connect(uri)
    console.log('✅ [Database] Successfully connected to MongoDB Atlas.')
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error)
    const safeMessage = sanitizeErrorMessage(rawMessage)
    console.error('❌ [Database] Failed to connect to MongoDB Atlas:', safeMessage)
    throw new Error(`MongoDB connection failed: ${safeMessage}`)
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect()
    console.log('🔌 [Database] Disconnected from MongoDB Atlas.')
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error)
    const safeMessage = sanitizeErrorMessage(rawMessage)
    console.error('❌ [Database] Error disconnecting from MongoDB Atlas:', safeMessage)
  }
}
