import mongoose from 'mongoose'

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI

  if (!uri || uri.trim() === '') {
    console.log(
      '⚠️  [Database] MONGODB_URI is not configured in environment variables. Database connection skipped.'
    )
    return
  }

  try {
    await mongoose.connect(uri)
    console.log('✅ [Database] Successfully connected to MongoDB.')
  } catch (error) {
    console.error('❌ [Database] Failed to connect to MongoDB:', error)
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect()
    console.log('🔌 [Database] Disconnected from MongoDB.')
  } catch (error) {
    console.error('❌ [Database] Error disconnecting from MongoDB:', error)
  }
}
