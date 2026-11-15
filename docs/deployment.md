# Deployment

Frontend and backend are separate Vercel projects. Local changes do not change deployed settings. No push or deployment is performed by these instructions.

## Verified production diagnosis (16 November 2026)

Read-only checks against `https://brandshield-ai-nu.vercel.app` found:

| Check | Observed result |
| --- | --- |
| `/` | 404, `{"detail":"Not Found"}`; the deployed app has no root route |
| `/health/live` | 200, `{"status":"alive"}` |
| `/health/ready` | 200, `{"status":"ready","database":"connected"}` |
| `/docs` | 200 |
| `/openapi.json` | 200, title `BrandShield AI`, 29 paths including the four `/api/v1/auth/...` routes |
| Login OPTIONS preflight from `https://brandshield-ai-y11i.vercel.app` | 400, no `Access-Control-Allow-Origin` header |

The deployed frontend JavaScript configures Axios with `baseURL: "https://brandshield-ai-nu.vercel.app"`, omitting `/api/v1`. Its login service therefore targets `/auth/login` instead of `/api/v1/auth/login`. The intended backend app is running and can reach MongoDB. The confirmed blockers are the incorrect frontend base URL and the backend CORS origin configuration. A root 404 alone does not establish deployment failure.

The local changes add a root service response, declare the existing entrypoint, normalize the API prefix, and reject invalid production frontend settings. Production remains unverified after these changes until both projects are redeployed and checked again.

## Vercel backend

1. In **Settings → Build and Deployment**, select Root Directory `backend` and Framework Preset **FastAPI**. Clear custom frontend Build Command, Install Command and Output Directory overrides. The Python preset installs runtime dependencies from `pyproject.toml`; do not use an npm/Vite build or a persistent Uvicorn command.
2. `[tool.vercel]` declares `app.main:app`; `.python-version` selects Python 3.13. `vercel.json` configures the same `app/main.py` function with a 120-second duration and excludes local/test files. An `index.py` adapter and legacy catch-all routing are unnecessary. See [Vercel FastAPI support](https://vercel.com/docs/frameworks/backend/fastapi) and [Python version configuration](https://vercel.com/docs/functions/runtimes/python/python-version).
3. Configure the following **backend-only Production environment variables** in the Dashboard. Preserve the existing database name and JWT secret so records and sessions remain available:

   ```env
   ENVIRONMENT=production
   MONGODB_URI=<private Atlas replica-set connection string>
   MONGODB_DATABASE=<existing production database name>
   JWT_SECRET=<existing private secret of at least 32 characters>
   CORS_ORIGINS=["https://brandshield-ai-y11i.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]
   ENABLE_DEMO_SEED=false
   ```

   CORS must be a JSON array of exact origins without paths or trailing slashes. Explicitly add a preview origin only if it needs API access. Existing middleware permits JSON, bearer authorization and OPTIONS preflight without requiring a JWT for preflight.
4. Optional AI assistance requires private `GEMINI_API_KEY`, a valid `GEMINI_MODEL`, and workspace consent. Keep secrets in the backend Dashboard. Do not enable production seeding or bootstrap another administrator in the existing database.
5. Retain restricted Atlas database/network permissions. The existing async client is initialized during FastAPI lifespan, reused across requests and closed on shutdown. Database startup failures leave liveness available; readiness and database-dependent API routes return 503. Inspect sanitized logs and restart/redeploy after correcting configuration.
6. Redeploy to apply code and environment changes. Check `/`, `/health/live`, `/health/ready`, `/docs` and `/openapi.json` separately. Root and liveness responses do not establish database readiness.

Vercel's [request payload limit is 4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size), including multipart overhead. The app's existing 10 MB upload support remains available on a container host; files near or above the Vercel limit cannot reach FastAPI/GridFS through this deployment. The upload code is preserved. Supporting the full 10 MB range on Vercel requires a separate upload transport.

## Atlas and container backend

1. Create an Atlas cluster/database user with access only to the application database. Restrict network access to the backend host and retain TLS. Store credentials in the host's secret settings.
2. Build from `backend/Dockerfile`, context `backend/`, or `docker build -t brandshield-api ./backend`. Configure `MONGODB_URI`, `MONGODB_DATABASE`, random `JWT_SECRET` (32+ characters), `ENVIRONMENT=production`, `ENABLE_DEMO_SEED=false`, and `CORS_ORIGINS=["https://your-frontend.vercel.app"]`. Optional Gemini secrets remain server-side.
3. The non-root container serves `0.0.0.0:${PORT:-8000}`. Configure readiness `/health/ready`, liveness `/health/live`, one worker for this MVP, proxy body limit 11 MB and request timeout at least 100 seconds. Terminate TLS at the host. Do not log request bodies/authorization headers.
4. Verify readiness returns 200. In the host's private operator terminal, run `python scripts/bootstrap_admin.py --email ... --name ...` and enter the password privately. Bootstrap is separate from public registration.
5. Configure backups and restricted database permissions. Docker/Atlas networking and the selected host must be verified in that environment.

## Vercel frontend

1. Set Root Directory `frontend`, framework Vite, install `npm ci`, build `npm run build`, output `dist`.
2. Set the following public **frontend Production environment variables**, then rebuild/redeploy:

   ```env
   VITE_DEMO_MODE=false
   VITE_API_BASE_URL=https://brandshield-ai-nu.vercel.app/api/v1
   ```

   Vite embeds these at build time; changing Dashboard values without rebuilding leaves the old URL in the bundle. Production builds now reject missing API URLs, HTTP/localhost backends, and enabled Demo Mode. Axios accepts an origin or its `/api/v1` URL and resolves the prefix exactly once; unrelated paths and duplicate prefixes are rejected. Never store backend secrets here. Local production builds also need these variables in the terminal or a private `.env.production.local` file.
3. The existing `frontend/vercel.json` correctly rewrites React navigation paths to `index.html`; it is unchanged. Verify refresh on `/app/submissions/<id>` and `/app/reviews/<id>`. Backend requests use the separate API origin, so no frontend API rewrite is required.
4. Sign in as the bootstrapped operator, create a workspace, register Creator/Reviewer accounts and assign memberships. For judges, use clearly labelled fictional data and privately supplied accounts. Keep production seed disabled.

## Release checks

Run backend tests against an isolated replica set, frontend unit tests/lint/build, and real API Playwright workflow. Verify approved knowledge, sample R1–R5 findings and source snapshots, correction/new version, human decision, refresh persistence, audit and updated statistics. Test actual PDF/DOCX extraction and an unreadable PDF. Verify API failures show errors and API mode has no demo role switch. Local success does not prove remote Atlas, Gemini or hosting availability.

After redeployment, check publicly with PowerShell's `curl.exe`:

```powershell
curl.exe -i https://brandshield-ai-nu.vercel.app/health/live
curl.exe -i https://brandshield-ai-nu.vercel.app/health/ready
curl.exe -i https://brandshield-ai-nu.vercel.app/openapi.json
curl.exe -i -X OPTIONS https://brandshield-ai-nu.vercel.app/api/v1/auth/login -H 'Origin: https://brandshield-ai-y11i.vercel.app' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type'
```

Preflight must return 200 with `Access-Control-Allow-Origin: https://brandshield-ai-y11i.vercel.app`, allowing POST, Authorization and Content-Type. In the browser Network panel, sign-in must target `https://brandshield-ai-nu.vercel.app/api/v1/auth/login`. Enter credentials privately; do not copy tokens or passwords into logs or commits.
