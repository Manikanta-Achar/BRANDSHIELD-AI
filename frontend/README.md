# BrandShield AI frontend

A complete React/Vite demonstration for CodeNova India 2026. The existing frontend structure is retained. No backend files are required or modified.

## Run locally

Use Node.js 20.19+ or 22.12+ (verified here with Node 24) and npm.

```powershell
cd frontend
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173).

Demo Mode is enabled by default. Optional configuration:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEMO_MODE=true
```

Restart Vite after changing environment settings. Vite variables are public build configuration; never put secrets in them.

## Judge walkthrough

1. Open the landing page, choose **Try the interactive demo**, and enter as **Admin**.
2. Open **Knowledge base**. Add an entry, edit an approved fact, or archive a rule. Active entries effective today are used in later checks. The six categories include source, owner, version, date and status.
3. Choose **Content Creator** from **Demo role** in the top navigation. Each role has a consistent fictional identity. Admin/reviewer see workspace submissions; creators and agency partners see their own. Agency Partner belongs only to TechNova.
4. Open **Submit content**, choose **Use sample advertisement**, and run analysis. The requested sample yields R1–R5 against the initial TechNova rules.
5. Inspect a finding's saved evidence. Accept or edit suggestions; dismissals and challenges require a reason. Changes appear in **Revision editor** and **Compare changes**.
6. Choose **Save & recheck**. This saves a new version, preserves previous content and findings, then reruns rules against the current knowledge base.
7. With all findings addressed and the saved revision checked, choose **Submit for review** and confirm.
8. Switch to **Reviewer**, open **Review queue**, and open the content. Read the latest copy, original, changes, evidence and creator responses. Add a comment.
9. Approve, reject or request changes using the confirmation dialog. A decision requires a comment; high-severity findings also require explicit acknowledgement. Authors cannot approve their own work. AI never approves content.
10. Inspect **Version history**, **Audit logs**, and the updated dashboard. Refresh the page to verify persistence.

The workflow supports exactly: Draft, Submitted, Analysing, Needs Revision, In Review, Approved, Rejected. Rejected submissions and change requests can be revised, checked and resubmitted. Approved versions remain locked.

## What the demo really does

- One persistent demo store contains workspaces, approved knowledge, content, versions, findings, decisions, comments, notification preferences and audit events.
- Browser storage keys: `brandshield.demo.data.v2`, `brandshield.demo.identity.v2`, and `brandshield.workspace`.
- Demo identities and role guards are workflow demonstrations, **not secure authentication or authorization**. No demo password is saved. Never place sensitive content in the demo.
- R1: case-insensitive literal prohibited-phrase matching with word boundaries.
- R2: required disclaimer matching; an optional literal trigger limits applicability. A blank trigger makes the disclaimer mandatory for all workspace content.
- R3: deprecated terminology mapped to an approved replacement.
- R4: conservative recognized battery specifications, scoped to a product subject/aliases. Hours and minutes normalize to the same unit. Approved `up to` limits retain their qualifier. Other numbers are ignored. Ambiguous products and unsupported phrasings are left for a human; this is not a general factual reasoning engine.
- R5: configured absolute/superlative wording, including `best … in the world`, `world’s best`, `always`, `never fails`, and `number one`, linked to the approved absolute-claim guideline.
- Only active, effective, workspace-specific knowledge runs. Findings retain source snapshots when a knowledge item changes or is archived.
- Audit events are append-only through application operations. Local storage is editable/clearable and is **not tamper-proof**.
- Two isolated fictional workspaces and sample activity are seeded once. Dates are relative to the first seed. Workspace AI permission describes future external processing; local deterministic checks do not call an AI service and remain available.
- PDF/DOCX selection, drag/drop, size/type validation and removal work. In Demo Mode, files are **not uploaded or extracted**; only their name/size is saved with pasted text. Limit: one non-empty file up to 10 MB. Only pasted text is analysed.
- R6 (alt text) and R7 (contrast) require real document metadata. A1 (claim verification) and A2 (tone) require the backend LLM service. All four are labelled unavailable. Unsupported claims must remain **Unverified** unless approved evidence supports a stronger conclusion.
- In-app notification settings change the activity indicator. Email and push delivery are labelled unavailable.
- Data stays in this browser until site data is cleared; there is no server backup or cross-device sync. No automatic retention policy is simulated.

## API Mode

Set `VITE_DEMO_MODE=false` in `.env.local` and restart, or use the included API configuration:

```powershell
npm run dev -- --mode api
```

API Mode starts empty and calls FastAPI through Axios. It does not load demo identities or data, and never falls back to demo success. Tokens remain in memory; refreshing requires signing in again. Backend authentication, permissions, extraction, persistence and external processing must be implemented separately.

See [API-INTEGRATION.md](./API-INTEGRATION.md) for endpoint paths, request bodies, response objects and server responsibilities. This is a proposed contract, not a claim that the backend exists.

## Checks and production build

```powershell
npm test
npm run lint
npm run test:e2e
npm run build
npm run preview
```

Unit tests cover the rule engine, source scope, fact updates, units, versioning, permissions, acknowledgement and the complete creator/reviewer state transitions. Browser tests cover the full judge workflow, knowledge CRUD, file validation, decisions, persistence, settings, routing, mobile layouts and API errors.

Playwright uses an installed Google Chrome via `channel: 'chrome'` and starts test servers on 4173 and 4174. If Chrome is unavailable, install a Playwright Chromium browser and change/remove the `channel` setting. Browser screenshots are written to ignored `.qa/`; failure traces go to ignored `test-results/`.

Vite emits the deployable static frontend into `dist/`. Configure your static host to rewrite application routes to `index.html`. The React entry is `src/app/main.jsx`; Tailwind 4 uses `@tailwindcss/vite` and `@import "tailwindcss"`.

All UI uses React functional components/hooks, React Router, Axios, Lucide, Recharts and React Hot Toast. Charts derive from the same visible workspace records and respect the selected period. The dashboard chart bundle loads on demand.
