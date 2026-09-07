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
   - `MONGODB_URI`: Required MongoDB connection string
   - `JWT_SECRET`: Required random secret of at least 32 characters
   - `JWT_EXPIRES_IN`: Required positive seconds or duration such as `1h`
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

## Assessment API foundation (Step 6E)

All endpoints require `Authorization: Bearer <token>` and an active teacher account.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/assessment/attempts` | Create an attempt (201) |
| GET | `/api/assessment/attempts/current` | Get the caller's in-progress attempt |
| GET | `/api/assessment/attempts/:attemptId` | Get an owned attempt |
| POST | `/api/assessment/attempts/:attemptId/responses` | Save a new answer (201) |
| GET | `/api/assessment/attempts/:attemptId/responses` | List answers for an owned attempt |

Starting an attempt requires `assessmentVersion`, `totalItems`, `selectedItemIds`,
and `consentConfirmed: true`. Item IDs must be unique references to active items,
and their count must equal `totalItems`. Empty subsets with zero total items are
accepted at this foundation stage. The server sets the starting status, time, and
index; an optional `currentItemIndex` must be exactly zero. Unknown fields,
including client-supplied `teacherId`, are rejected.

Saving an answer requires `itemId` and a non-null `selectedResponse` (text, boolean,
number, array, or object). Optional fields are `responseValue`, `responseDuration`
in milliseconds, and `answeredAt` as an ISO timestamp with a timezone. When omitted,
`answeredAt` uses server time. Response duration is stored as `responseDurationMs`.
Answers are create-only: a repeated item returns 409 and does not overwrite data.

An unavailable or unowned attempt returns 404. A second in-progress attempt or a
write to a closed attempt returns 409. Startup provisions the partial unique
in-progress attempt index and the unique attempt/item response index before
listening. No assembly, scoring, completion, or progress advancement is performed.

Run the explicit integration verification from `server/` after building:

```bash
npm run build
node tests/assessment.integration.cjs
```

This uses the configured database and removes its temporary teachers, attempts,
and responses. It never writes assessment items. If fewer than two active items
exist, positive response tests stub only item lookups; attempt/response persistence
and duplicate constraints still use MongoDB. The script reports which mode ran.

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
