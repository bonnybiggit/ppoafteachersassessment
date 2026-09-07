# PPOAF Teachers Assessment — Backend API

Backend foundation and API service for the PPOAF Teachers Assessment platform.

## Technology Stack

- **Runtime**: Node.js (>= 18.0.0)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Utilities**: cors, dotenv, tsx

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration modules (e.g. database connection)
│   ├── controllers/     # Request handlers & controller logic
│   ├── middleware/      # Global & route-specific middleware
│   ├── models/          # Data schemas & Mongoose models (future step)
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic services (future step)
│   ├── utils/           # Helper functions & shared utilities
│   ├── app.ts           # Express application configuration
│   └── server.ts        # Server entry point & database initialization
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript compiler options
└── README.md            # Backend documentation
```

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set the required variables:
   - `PORT`: Port number for the API server (default: `5000`)
   - `MONGODB_URI`: MongoDB connection string (optional for development health check)
   - `CLIENT_URL`: Allowed frontend origin for CORS (default: `http://localhost:5173`)
   - `NODE_ENV`: Environment mode (`development` or `production`)

## Running the Server

- **Development Mode (with hot-reload via tsx):**
  ```bash
  npm run dev
  ```

- **Build for Production (compiles TypeScript to `dist/`):**
  ```bash
  npm run build
  ```

- **Production Mode (runs compiled JavaScript):**
  ```bash
  npm run start
  ```

## Health Endpoint

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/health`
- **Sample Response**:
  ```json
  {
    "success": true,
    "message": "PPOAF Teachers Assessment API is running",
    "status": "healthy",
    "timestamp": "2026-09-07T14:40:00.000Z",
    "database": "not_connected"
  }
  ```
