# Deployment preparation

No hosting, paid resources or public deployment was created. These steps require an authorised hosting environment.

## Atlas and container backend

1. Create an Atlas cluster/database user with access only to the application database. Restrict network access to the backend host and retain TLS. Store credentials in the host's secret settings.
2. Build from `backend/Dockerfile`, context `backend/`, or `docker build -t brandshield-api ./backend`. Configure `MONGODB_URI`, `MONGODB_DATABASE`, random `JWT_SECRET` (32+ characters), `ENVIRONMENT=production`, `ENABLE_DEMO_SEED=false`, and `CORS_ORIGINS=["https://your-frontend.vercel.app"]`. Optional Gemini secrets remain server-side.
3. The non-root container serves `0.0.0.0:${PORT:-8000}`. Configure readiness `/health/ready`, liveness `/health/live`, one worker for this MVP, proxy body limit 11 MB and request timeout at least 100 seconds. Terminate TLS at the host. Do not log request bodies/authorization headers.
4. Verify readiness returns 200. In the host's private operator terminal, run `python scripts/bootstrap_admin.py --email ... --name ...` and enter the password privately. Bootstrap is separate from public registration.
5. Configure backups and restricted database permissions. Docker/Atlas networking and the selected host must be verified in that environment.

## Vercel frontend

1. Import the existing GitHub repository when ready; this implementation does not push. Set Root Directory `frontend`, framework Vite, install `npm ci`, build `npm run build`, output `dist`.
2. Set `VITE_DEMO_MODE=false`, `VITE_API_BASE_URL=https://your-api-host/api/v1`. These public build variables require rebuilding after changes. Never add MongoDB/JWT/Gemini secrets here.
3. `frontend/vercel.json` rewrites React navigation paths to `index.html`. Verify refresh on `/app/submissions/<id>` and `/app/reviews/<id>`. Add the exact deployed origin to backend CORS and restart the backend. Use HTTPS for both services.
4. Sign in as the bootstrapped operator, create a workspace, register Creator/Reviewer accounts and assign memberships. For judges, use clearly labelled fictional data and privately supplied accounts. Keep production seed disabled.

## Release checks

Run backend tests against an isolated replica set, frontend unit tests/lint/build, and real API Playwright workflow. Verify approved knowledge, sample R1–R5 findings and source snapshots, correction/new version, human decision, refresh persistence, audit and updated statistics. Test actual PDF/DOCX extraction and an unreadable PDF. Verify API failures show errors and API mode has no demo role switch. Local success does not prove remote Atlas, Gemini or hosting availability.
