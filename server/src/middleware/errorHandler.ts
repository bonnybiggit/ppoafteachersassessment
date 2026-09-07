import type { Request, Response, NextFunction } from 'express'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  })
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('❌ [API Error]:', err)

  const isProduction = process.env.NODE_ENV === 'production'
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  })
}
