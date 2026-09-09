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

## Assessment assembly and delivery (Step 6F)

All endpoints require a valid Bearer JWT and an active teacher account.
Responses use `{ success: true, attempt: ... }`, `{ success: true, questions: ..., attemptId: ... }`,
or the existing `response`/`responses` envelopes. Errors use `{ success: false, message: ... }`.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/assessment/attempts` | Start or reuse the caller's in-progress attempt (201), including questions |
| GET | `/api/assessment/attempts/current` | Resume the in-progress attempt with its ordered questions |
| GET | `/api/assessment/attempts/current/questions` | Retrieve current ordered questions |
| GET | `/api/assessment/attempts/:attemptId` | Retrieve an owned attempt and questions |
| GET | `/api/assessment/attempts/:attemptId/questions` | Retrieve an owned attempt's ordered questions |
| POST | `/api/assessment/attempts/:attemptId/responses` | Save a new answer (201) |
| GET | `/api/assessment/attempts/:attemptId/responses` | List saved answers for an owned attempt |
| POST | `/api/assessment/attempts/:attemptId/submit` | Close an in-progress attempt without scoring |

Start with `{ "consentConfirmed": true }`. Assembly is server-controlled: client-supplied
item IDs, version, count, teacher ID or progress are rejected. This replaces the Step 6E
client-selected start payload. No frontend currently consumes that payload.

The default length is **30**, an MVP configuration, not a validated PPOAF assessment
length. Trusted service callers can pass a positive integer as the third argument to
`startAttempt`; the default lives in `assessmentAssembly.ts` alongside the assembly
version. Assembly selects active items, sorts by bank item ID with an ObjectId tie-break,
and cycles through the nine official domains in their declared order. Empty/exhausted
domains are skipped. This balances coverage where supply permits and redistributes
shortages. Duplicate references and duplicate bank IDs are excluded. Profile tags do
not affect selection or scores. Assembly is deterministic for the same active bank and
length, and is not adaptive or ML-based. Insufficient supply returns 409 without creating
an attempt; inactive synthetic JSON banks are never loaded or seeded by this service.

The persisted `selectedItemIds` preserve membership and order on resume. Later item
activation/deactivation does not replace assigned questions; an already-assigned inactive
item remains answerable. A deleted assigned item returns an explicit 409 on delivery.
Question text/options are read from the referenced item, not snapshotted, so administrators
must preserve referenced item content for historical reproducibility.

Question DTOs contain `itemId` (the MongoDB reference used when saving an answer),
`bankItemId` (the human-readable bank ID), `prompt`, `domain`, `subcompetency`,
`evidenceType`, public `options` (IDs and labels only), and one-based `questionOrder`.
They exclude keys, rationales, calibration/admin fields and MongoDB document internals.
Items without structured options use their prompt and return an empty options array.

No current in-progress record returns 404 (the not-started/no-current state). Starting
again reuses the existing record, including under concurrent requests. Submission maps
the existing stored `completed`/`completedAt` to API `submitted`/`submittedAt`;
`completedAt` remains an alias. No schema changes were needed. Repeated submission
returns 409 without changing the timestamp. Abandoned attempts remain closed. A teacher
may start a new attempt after closure. Submission currently permits partial completion.

Saving an answer requires an assigned `itemId` and a non-null `selectedResponse`
(text, boolean, number, array, or object). Optional fields remain `responseValue`
(raw input, not a calculated score), `responseDuration` in milliseconds, and
`answeredAt` as an ISO timestamp with a timezone. Responses remain create-only;
duplicates return 409. `currentItemIndex` advances as an answered-count cursor on each
successful insert; clients should use saved responses to find unanswered questions if
answering out of order. The server does not yet validate answer correctness or score it.

Missing/unowned attempts return 404; closed-attempt writes return 409. Response creation
uses an Atlas transaction and a conditional parent-attempt write, serializing it against
submission. Replica-set/transaction support is required, as supplied by Atlas. Startup
continues to provision the existing unique in-progress and attempt/item response indexes.
No scoring, gap diagnosis or recommendations are included in this step.

Run checks from `server/` after building:

```bash
npm run build
node tests/assessmentAssembly.test.cjs
node tests/assessmentItems.validate.cjs
node tests/assessment.integration.cjs
```

The assembly and item-bank checks are offline. The integration test uses the configured
Atlas database, verifies its ping, and removes its temporary test teachers, attempts and
responses in cleanup. Question fixtures stay in memory: no question documents or synthetic
banks are written. It covers JWT/active-account protection, ownership, concurrent start
reuse, deterministic assembly, delivery redaction, resume, response membership, submission,
and concurrent answer/submission. Test failures must not print secrets.

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
