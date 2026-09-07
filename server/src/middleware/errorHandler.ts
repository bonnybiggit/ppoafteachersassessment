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
  // Parser errors may include raw request bodies containing credentials.
  // Never log or serialize the original error or stack.
  const errorStatus = 'status' in err ? err.status : undefined
  const statusCode = typeof errorStatus === 'number' && errorStatus >= 400 && errorStatus < 500
    ? errorStatus
    : 500

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : 'Invalid request.',
  })
}
