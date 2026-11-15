# Verification record — 15 November 2026

Executed locally with Python 3.13, Node.js 24, Google Chrome, and a real MongoDB Community 8.0.5 replica set. Database tests used generated isolated `brandshield_test_*` databases. Browser API tests used a separate local development workspace. No paid AI API was called.

| Command | Actual result |
| --- | --- |
| Backend: `python -m pytest -q` with `TEST_MONGODB_URI` | **32 passed**, 45.16 seconds; no skips |
| Backend: `python -m ruff check . --config pyproject.toml` | Passed |
| Backend: `python scripts/evaluate_checks.py` | Sample produced R1–R5; corrected text produced no findings; R6/R7 explicitly not checked without metadata |
| Frontend: `npm test` | **12 passed** |
| Frontend: `npm run lint` | Passed |
| Frontend: `npm run build` | Passed; production Vite bundle generated |
| Frontend: `npm run test:e2e` | **8 passed**, including mobile, roles, knowledge, corrections, review, persistence and API failure isolation |
| Frontend: `npm run test:integration` | **1 passed**, real API/MongoDB creator-to-reviewer browser scenario |
| `/health/ready` | 200, database connected |
| Docker Compose YAML / Vercel JSON parsing | Passed |
| Git diff whitespace and private credential checks | Passed; local environments, accounts, data, binaries and QA artifacts excluded |

The real browser scenario signed in as Admin and edited approved battery/prohibited/terminology sources; signed in as Creator and submitted the sample advertisement; checked all five findings and evidence links; applied corrections; compared changes; saved version two and reanalysed; requested review; refreshed and confirmed persistence; signed in as Reviewer; opened the queue; commented; approved; refreshed; checked two versions, audit events and server dashboard totals. It used the real API with Demo Mode disabled.

Backend tests additionally verified role injection rejection, authentication/logout, workspace and ownership isolation, historical knowledge/evidence, effective/archived sources, compatible units and unrelated numbers, genuine PDF/DOCX extraction, GridFS round-trip, unavailable/disabled AI, invalid citations, failed-rule isolation, correction reasons, reject/request-changes/resubmit, stale requests, concurrent decisions, transaction rollback when audit fails, exact source text and upload/body limits.

Not verified: live Atlas connectivity, live Gemini account/model availability, Docker image execution, Vercel/container-host publication. Docker was unavailable in this environment. No live deployment or production credentials are claimed. OCR, semantic retrieval, CSV import and broader production hardening remain planned as described in the README.
