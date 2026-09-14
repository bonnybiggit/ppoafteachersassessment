# Step 8: administrator foundation

## Architecture and API

The existing Teacher model has no administrator role. Administrator is a separate collection so no teacher schemas, records, credentials, or assessment behavior need to change. There is no public admin registration endpoint or default account. Passwords are bcrypt hashes (cost 12).

The administrator API uses HS256 JWTs with a separate signing secret, an explicit admin role, issuer `ppoaf-admin-auth`, audience `ppoaf-admin`, subject, expiry, and session version. Every protected request also reads the administrator account and verifies active status, role and session version. Teacher tokens fail signature verification. Admin tokens also fail existing teacher verification.

| Endpoint | Access | Result |
| --- | --- | --- |
| POST /api/admin/login | Public credential exchange, rate limited | Token and safe administrator identity |
| GET /api/admin/me | Active administrator | ID, email, role only |
| POST /api/admin/logout | Active administrator | 204; increments administrator session version |
| GET /api/admin/overview | Active administrator | Aggregate counts only |

Login accepts only email and password. Unknown, inactive and unauthorized identities use the same invalid-credentials response. Protected requests without a valid admin session return 401. Unavailable infrastructure returns a safe 503 response. Admin responses use `Cache-Control: no-store`.

Logout revokes **all currently issued sessions for that administrator**, including other tabs/devices. No teacher session is touched. A failed server logout leaves the client session available for an explicit retry; the UI does not falsely report server revocation.

The frontend exposes `/admin/login` and guarded `/admin` with its own context, layout and localStorage key `ppoaf.admin.token`. It verifies stored sessions with `/api/admin/me` on mount, handles expiration and cross-tab storage changes, and clears rejected sessions. Teacher storage remains `ppoaf.auth.token`. No admin token or secret is included in dashboard data.

## Overview definitions

| Metric | Source and meaning |
| --- | --- |
| Registered teachers | Teacher collection count, including inactive accounts |
| Assessment attempts | AssessmentAttempt aggregate by status; all attempts including abandoned |
| Completed assessments | Attempts with status completed; not unique teachers |
| In-progress assessments | Attempts with status in_progress |
| Assessment completion | Completed / all attempts × 100, rounded to one decimal; unavailable when denominator is zero |
| Synthetic pilot bank items | AssessmentItem count with a synthetic version prefix, including inactive items; not an eligibility check or the assembled 108-item assessment |
| Active learning opportunities | Active entries in the validated local provisional synthetic catalog; not verified enrollment/availability |

No teacher answers, scores, demographic fields, answer keys, item metadata, recommendation internals or rankings are queried into the overview response. Database metrics are read-only. Counts are operational snapshots from separate reads, not a transactionally synchronized analytics report. Catalog read/validation failure is represented as unavailable, not zero. A database failure displays a retryable overview error.

## Configuration and development provisioning

No actual environment file, Render environment, Netlify configuration or production account was changed. The repository has no checked-in Render/Netlify deployment manifest. Hosting configuration and production credentials were not accessed.

New optional server variable: `ADMIN_JWT_SECRET`, at least 32 characters and different from `JWT_SECRET`; generate a cryptographically random value in the operator's secret manager. Never put it in a Vite variable. Sessions expire after one hour. When unset, the existing teacher server runs normally and admin authentication returns 503. When configured, startup validates the secret and creates administrator indexes. No teacher indexes/schema are changed by this addition.

The frontend reuses `VITE_API_BASE_URL`. No frontend configuration change is needed when it already points to the intended API.

Development provisioning is **local only**, insert-only, and refuses cloud databases and any database other than `ppoaf_admin_dev` on localhost/127.0.0.1/::1. It never resets an existing administrator.

1. Use an isolated local MongoDB instance. Set `NODE_ENV=development` and `MONGODB_URI=mongodb://127.0.0.1:27017/ppoaf_admin_dev` in a private development process environment.
2. Supply independent `JWT_SECRET` and `ADMIN_JWT_SECRET` values, `DEV_ADMIN_EMAIL`, and a private `DEV_ADMIN_PASSWORD` (12+ characters, at most 72 UTF-8 bytes). Use private environment injection; do not paste credentials into shared shell history or commit them.
3. From server, run `npm run provision:admin:dev`. Only the new Administrator collection/index and new admin record can be written. Remove provisioning credentials from the process environment afterward.
4. Run the local server and web application against that isolated database, then sign in at `/admin/login`.

This script is not a production provisioning tool. Production administrator onboarding must be explicitly authorized and handled through a controlled operator process before any future deployment; no default production identity is supplied here.

Login throttling is bounded, in-process, per Express request IP (10 attempts per 15 minutes). It does not trust arbitrary forwarded headers. On a reverse-proxy deployment, verify trusted proxy configuration and apply shared gateway rate limiting before production use; otherwise a proxy IP may share the limit and multiple server instances have independent limits. This step does not change existing proxy settings.

## Validation and limits

Backend tests use real Express/JWT/bcrypt code with in-memory model doubles and no database connection. They cover teacher login/session regression, missing/teacher/forged/expired/wrong-audience/wrong-issuer tokens, active-role checks, safe overview projection, empty completion denominator, logout revocation, absent/reused secrets and throttling.

Frontend component tests cover independent storage, login, provider remount (refresh simulation), session retries, invalidation, logout failure/retry, route denial/allowance, mobile navigation disclosure and truthful dashboard labels. The existing assessment resume checks also run.

The layout includes desktop sidebar and mobile disclosure, responsive metric grids, wrapping identity text, semantic navigation, labels, status/error announcements, visible focus and a skip link. Actual desktop/tablet/mobile browser rendering, screen-reader use, real browser refresh and live MongoDB provisioning have not been verified. React test renderer reports its existing deprecation warning.

No deployment, push, production writes, teacher management, question/catalog editing, analytics exports, or Step 9 work is included.
