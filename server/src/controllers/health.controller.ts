import type { Request, Response } from 'express'
import mongoose from 'mongoose'

export function getHealth(_req: Request, res: Response): void {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
      ? 'connecting'
      : 'not_connected'

  res.status(200).json({
    success: true,
    message: 'PPOAF Teachers Assessment API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  })
}
