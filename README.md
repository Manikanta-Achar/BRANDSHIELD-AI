# BrandShield AI

**Find issues before publication. Show the evidence. Keep humans in control.**

An evidence-linked brand governance platform for CodeNova India 2026. The existing React UI now uses a FastAPI backend, async PyMongo, MongoDB/GridFS, seven deterministic checks where metadata permits, and optional consent-gated Gemini assistance. Human authorisation is required for every approval.

Implemented: real JWT authentication and Argon2 passwords; workspace membership and RBAC; versioned approved knowledge; text/PDF/DOCX submissions; persisted analysis/evidence; corrections and content revisions; reviewer comments and decisions; append-only API audit history; real dashboard statistics. API mode is the default; browser Demo Mode requires an explicit switch.

## Run locally

Requirements: Python 3.11+ (tested with 3.13), Node.js 20.19+ or 22.12+, and MongoDB Atlas or a local **replica set**. Transactions are required. No in-memory fallback exists.

From the repository root in PowerShell:

```powershell
py -3.13 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -e './backend[test]'
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Edit `backend/.env` privately: set `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET` (random, at least 32 characters), and `CORS_ORIGINS` (JSON array of exact frontend origins). Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Keep backend secrets out of all `VITE_*` variables.

Backend terminal:

```powershell
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` and `VITE_DEMO_MODE=false`. Open the Vite URL. JWTs are restored from browser-tab session storage and checked with `/auth/me` after refresh. Sign-out invalidates existing account JWT sessions. Expiry requires signing in again; refresh tokens are not implemented.

`GET /health/live` checks process liveness. `/health/ready` checks database and authentication configuration. An unavailable database produces 503 rather than simulated success; restart the API after correcting startup configuration. API documentation: `http://localhost:8000/docs`.

For Atlas, create a private database user and restrict network access to your backend service. Supply its private `mongodb+srv://...` URI. Alternatively, `docker compose up --build` runs a local replica set and API after `.env` configuration. Compose is development-only: MongoDB is unauthenticated and exposed only on loopback. A host-run backend connecting to Compose MongoDB should use `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` because the replica set advertises its container hostname.

## Accounts and workspace access

Registration always creates a Content Creator with no assigned workspace. Bootstrap the first administrator from an operator terminal in `backend/`:

```powershell
.venv/Scripts/python.exe scripts/bootstrap_admin.py --email operator@example.com --name 'Workspace Operator'
```

The script prompts privately for a password or reads `INITIAL_ADMIN_PASSWORD`. It refuses a second initial administrator. Sign in, open **Workspaces**, create a workspace, and assign registered users by email and role through **View members**. Keep at least one workspace administrator. Only operator-created account administrators create organisations; workspace Admins manage their assigned organisation.

| Role | Assigned-workspace abilities |
| --- | --- |
| Admin | Manage knowledge/settings/membership, read workspace content/audit, review other people's content |
| Content Creator | Own submissions, uploads, analysis, corrections, revisions, review requests and own audit |
| Reviewer | Review queue, evidence, comments and decisions; no self-approval |
| Agency Partner | Creator abilities restricted to assigned workspaces and own content |

Membership checks, ownership and valid state transitions are enforced by FastAPI. Navigation guards do not grant access.

## Explicit TechNova seed

In development only, set `ENABLE_DEMO_SEED=true` and private `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_CREATOR_EMAIL`, `DEMO_CREATOR_PASSWORD`, `DEMO_REVIEWER_EMAIL`, `DEMO_REVIEWER_PASSWORD` process environment variables. Passwords require 12 characters. From `backend/`, run `.venv/Scripts/python.exe scripts/seed_demo.py`.

The idempotent script creates a fictional workspace, three accounts and approved knowledge, preserving existing seed passwords and edits. It refuses to repurpose a real account. Startup never seeds automatically; production seeding is disabled. No public default passwords exist.

Sample creator advertisement:

> Introducing the new Tech Nova smartphone! Enjoy 15 hours of battery life with 100% guaranteed performance. It is the best phone in the world.

The persisted seed produces R1 prohibited wording, R2 missing disclosure, R3 deprecated terminology, R4 battery conflict and R5 superlative wording risk. Each points to an actual approved source and version.

## Product workflow

1. Admin maintains approved knowledge and effective dates. Source updates/archive operations retain history.
2. Creator pastes text or uploads a valid PDF/DOCX up to 10 MB. Originals go to GridFS; unreadable extraction returns a paste-text fallback, including scanned PDFs without OCR.
3. Analysis saves findings, check coverage, source snapshots and AI warnings for the content version.
4. Accept/edit suggestions or dismiss/challenge with a substantive reason. Corrections affect a working draft. **Save & recheck** creates a new version and preserves prior reports and original files.
5. Address findings, then request review. The analysed version is locked. A different authorised reviewer comments and approves, rejects or requests changes. High-severity, challenged and uncertain findings require acknowledgement.
6. Decisions and audit events commit together. Stale content/review requests return 409. Refresh to reload persisted versions, audit and dashboard counts.

The seven stored states are `draft`, `submitted`, `analysing`, `needs_revision`, `in_review`, `approved`, `rejected`. The API also supplies the title-cased `status` labels expected by the existing UI. Approval never publishes content.

## Configuration

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). Backend variables: `ENVIRONMENT`, `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET`, `JWT_ISSUER`, `ACCESS_TOKEN_MINUTES`, `CORS_ORIGINS`, `MAX_UPLOAD_BYTES`, optional `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_SECONDS`, and development-only `ENABLE_DEMO_SEED` / `DEMO_*` inputs. `INITIAL_ADMIN_PASSWORD` is an optional bootstrap input. Frontend variables: `VITE_API_BASE_URL`, `VITE_DEMO_MODE`.

AI requires both workspace consent and provider configuration. Selected claims/relevant approved passages are sent to Gemini; tone analysis uses up to 10,000 content characters. Citations must match retrieved IDs, versions, revisions and quotations. Errors preserve deterministic results and show warnings. No paid model calls are used by tests. See [AI disclosure](docs/ai-disclosure.md).

## Tests

From `backend/`:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m ruff check . --config pyproject.toml
```

The fixture creates/drops only generated `brandshield_test_<random>` databases. Without `TEST_MONGODB_URI`, database integration tests are explicitly skipped. Use a dedicated replica set with test database create/drop permissions; provider calls are mocked. `requirements.lock` records the verified Python 3.13 dependency environment, including test tools. See the [actual verification record](docs/verification.md).

From `frontend/`: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`. The existing browser suite explicitly launches Demo Mode and an API-unavailable test. To run the real API browser workflow, start the backend and seeded TechNova workspace, supply private `DEMO_*` credentials to the test process, add `http://127.0.0.1:4175` to CORS, then run `npm run test:integration`. Optional `E2E_API_URL` overrides the test API URL. Playwright uses Google Chrome; the real API suite disables browser traces to avoid capturing credentials.

## Deployment and limits

See [deployment](docs/deployment.md), [API inventory](docs/api-reference.md), [architecture](docs/architecture.md), [workflow](docs/workflow.md) and [security](docs/security.md). Vercel, a Python container host and Atlas configuration are prepared; no live deployment is claimed.

R4 is conservative entity/attribute and unit matching, not general fact verification. R6 reads available DOCX alt descriptions; R7 checks explicit colour pairs only. Missing metadata is not a pass. OCR, full PDF accessibility, complex DOCX layouts/inherited formatting, embeddings, CSV import, password reset, SSO/MFA, refresh tokens, large-workspace pagination and automatic retention cleanup are planned. Live Gemini and external hosting require operator credentials and verification. Audit is append-only through the API; database operators still control physical records.
