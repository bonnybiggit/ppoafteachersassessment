import express from 'express'
import cors from 'cors'
import routes from './routes'
import { notFoundHandler, errorHandler } from './middleware/errorHandler'

const app = express()

// CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
)

// Body Parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/api', routes)

// Fallback & Error Handlers
app.use(notFoundHandler)
app.use(errorHandler)

export default app
