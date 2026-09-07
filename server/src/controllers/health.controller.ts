import type { Request, Response } from 'express'
import mongoose from 'mongoose'

export function getHealth(_req: Request, res: Response): void {
  const isConnected = mongoose.connection.readyState === 1
  const dbStatus = isConnected
    ? 'connected'
    : mongoose.connection.readyState === 2
    ? 'connecting'
    : 'disconnected'

  res.status(200).json({
    success: true,
    message: 'PPOAF Teachers Assessment API is running',
    database: dbStatus,
  })
}
