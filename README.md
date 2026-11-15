# 🛡️ BRANDSHIELD AI

### AI-Powered Brand Governance, Content Compliance & Approval Platform

**Find issues before publication. Show the evidence. Keep humans in control.**

BRANDSHIELD AI is an AI-assisted brand governance and content compliance platform developed for **CodeNova India 2026**.

It helps organizations analyze marketing content, identify potential brand guideline violations, maintain consistent messaging, and manage approval workflows before publication.

The platform combines deterministic compliance rules, optional Google Gemini assistance, approved brand knowledge, and human review to create an evidence-based content governance workflow.

---

## 🎯 Problem Statement

Organizations publish marketing content across websites, advertisements, social media, and digital campaigns.

Ensuring that every piece of content follows approved brand guidelines is challenging.

### Major challenges

- **Brand inconsistency:** Different teams use inconsistent terminology, tone, and messaging.
- **Unverified claims:** Marketing content may contain unsupported product promises.
- **Manual reviews:** Reviewing every advertisement or document takes time.
- **Outdated information:** Teams may accidentally use deprecated product terminology or specifications.
- **Limited traceability:** Organizations struggle to identify who reviewed, modified, or approved content.
- **Fragmented approvals:** Content creators and reviewers often work across disconnected systems.

These issues increase the risk of publishing misleading or noncompliant content.

## 💡 Our Solution

BRANDSHIELD AI provides a centralized platform where organizations can analyze content against approved knowledge, inspect supporting evidence, make corrections, and complete human-controlled approval workflows.

### Core workflow

**Upload Content → Analyze → Detect Issues → Review Evidence → Revise → Request Approval → Human Decision**

The system is designed to support reviewers rather than replace them.

AI recommendations never automatically approve or publish content.

---

## ✨ Key Features

### 1. Secure Authentication

- JWT-based authentication
- Argon2 password hashing
- User registration and login
- Authenticated sessions
- Role-based access control
- Workspace membership verification
- Protected frontend and backend routes

### 2. Workspace Management

Organizations can manage separate workspaces with assigned roles.

Features include:

- Workspace creation
- Workspace membership management
- User role assignment
- Workspace-level access control
- Organization-specific content management

### 3. AI-Assisted Content Analysis

Analyze marketing content against approved brand guidelines.

Supported input formats:

- Plain text
- PDF documents
- DOCX documents

The analysis engine provides:

- Deterministic rule evaluation
- Evidence-linked findings
- Compliance warnings
- Severity-based issue identification
- Optional Gemini-powered suggestions
- Source references and version tracking

### 4. Brand Knowledge Management

Administrators can maintain approved organizational knowledge.

Capabilities include:

- Add approved brand guidelines
- Update existing knowledge
- Manage effective dates
- Archive outdated information
- Preserve historical knowledge versions
- Connect findings to approved evidence

### 5. Content Correction and Revision

Content creators can:

- View detected issues
- Review AI suggestions
- Accept or edit suggested corrections
- Dismiss or challenge findings with reasons
- Save updated drafts
- Reanalyze modified content
- Compare content revisions

Previous versions and analysis reports are preserved.

### 6. Human Approval Workflow

The platform supports controlled review and approval.

Authorized reviewers can:

- View submitted content
- Inspect evidence and findings
- Add review comments
- Approve submissions
- Reject submissions
- Request corrections

Content creators cannot approve their own submissions.

Human authorization is required for approval.

### 7. Dashboard and Analytics

The dashboard displays persisted application statistics, including submission and review activity.

Users can track content through the workflow and access relevant workspace records.

### 8. Audit History

BRANDSHIELD AI maintains an append-only audit history through its application API.

The audit system records important workflow activities and helps teams understand the history of content changes and decisions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Vite |
| Backend | Python, FastAPI |
| Database | MongoDB |
| Database Driver | Async PyMongo |
| File Storage | MongoDB GridFS |
| Authentication | JWT, Argon2 |
| AI Integration | Google Gemini API |
| API Documentation | FastAPI OpenAPI / Swagger |
| Testing | Pytest, Ruff, Playwright |
| Deployment | Vercel frontend, Python container backend, MongoDB Atlas |

The production architecture requires persistent database storage. There is no automatic in-memory fallback when MongoDB is unavailable.

---

## 🏗️ System Architecture

```text
                  BRANDSHIELD AI
                        |
                React.js Frontend
                        |
                FastAPI REST API
                        |
            Authentication & RBAC
                        |
        +---------------+---------------+
        |               |               |
   Knowledge        Content         Review &
   Management       Analysis        Approval
        |               |               |
        |         Rule Engine            |
        |               |               |
        |        Optional Gemini         |
        |               |               |
        +---------------+---------------+
                        |
                 MongoDB Atlas
                        |
          +-------------+-------------+
          |             |             |
       Records        GridFS         Audit
                       Files         History
```

## 📁 Project Structure

```text
BRANDSHIELD-AI/
|
├── backend/
│   ├── app/
│   ├── scripts/
│   │   ├── bootstrap_admin.py
│   │   └── seed_demo.py
│   ├── tests/
│   ├── .env.example
│   ├── pyproject.toml
│   └── requirements.lock
|
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   └── package.json
|
├── docs/
│   ├── deployment.md
│   ├── api-reference.md
│   ├── architecture.md
│   ├── workflow.md
│   ├── security.md
│   ├── ai-disclosure.md
│   └── verification.md
|
├── docker-compose.yml
└── README.md
```

The diagram shows the main project directories and files rather than every implementation file.

---

## ⚙️ Installation and Setup

### Prerequisites

Install:

- Python 3.11 or higher
- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas or a local MongoDB replica set
- Git
- VS Code or another code editor

### Step 1: Clone the repository

```bash
git clone https://github.com/Manikanta-Achar/BRANDSHIELD-AI.git

cd BRANDSHIELD-AI
```

### Step 2: Create a Python virtual environment

Run in PowerShell from the project root:

```powershell
py -3.13 -m venv backend/.venv
```

### Step 3: Install backend dependencies

```powershell
backend/.venv/Scripts/python.exe -m pip install -e './backend[test]'
```

### Step 4: Create environment files

```powershell
Copy-Item backend/.env.example backend/.env

Copy-Item frontend/.env.example frontend/.env
```

### Step 5: Configure backend environment

Open:

`backend/.env`

Configure the required values using your actual `.env.example` as the reference.

Example:

```env
ENVIRONMENT=development

MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
MONGODB_DATABASE=brandshield

JWT_SECRET=YOUR_SECURE_RANDOM_SECRET

CORS_ORIGINS=["http://localhost:5173"]

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Additional optional settings are documented in `backend/.env.example`.

Generate a secure JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Never commit real database credentials, passwords, JWT secrets, or API keys.**

### Step 6: Configure frontend environment

Open:

`frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEMO_MODE=false
```

Keep `VITE_DEMO_MODE=false` for real backend integration.

### Step 7: Start the backend

Open a terminal:

```powershell
cd backend

.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend:

http://localhost:8000

API documentation:

http://localhost:8000/docs

### Step 8: Start the frontend

Open another terminal:

```powershell
cd frontend

npm ci

npm run dev
```

Open the local URL displayed by Vite, typically:

http://localhost:5173

---

## 🔐 User Roles and Permissions

BRANDSHIELD AI supports four workspace roles.

| Role | Permissions |
|---|---|
| Admin | Manage workspace settings, knowledge, members, and authorized reviews |
| Content Creator | Upload, analyze, edit, revise, and submit owned content |
| Reviewer | Examine reports, add comments, approve, reject, or request revisions |
| Agency Partner | Create and manage owned content within assigned workspaces |

Permissions are enforced on the backend.

### First Administrator Setup

By default, newly registered users are Content Creators without an assigned workspace.

To create the first account administrator, open a terminal inside `backend/` and run:

```powershell
.venv/Scripts/python.exe scripts/bootstrap_admin.py --email operator@example.com --name "Workspace Operator"
```

The script requests a password privately or reads `INITIAL_ADMIN_PASSWORD`.

After signing in, the administrator can:

1. Open Workspaces.
2. Create an organization workspace.
3. Select View Members.
4. Assign registered users by email.
5. Set the appropriate workspace roles.

**If a user sees "No assigned workspaces," an administrator must assign that account to a workspace.**

---

## 🧪 Demo Environment

BRANDSHIELD AI includes an optional development-only demo environment.

It creates a fictional TechNova workspace with sample accounts and approved knowledge.

### Configure private demo credentials

Inside your private backend environment file, configure:

```env
ENABLE_DEMO_SEED=true

DEMO_ADMIN_EMAIL=admin@technova.example.com
DEMO_ADMIN_PASSWORD=EFTrEhh24E7wsNoWi2BYnWLqqpQQtq93

DEMO_CREATOR_EMAIL=creator@technova.example.com
DEMO_CREATOR_PASSWORD=Iq9L4UchnsUylyYD4nutG7zEA6LPYyhT

DEMO_REVIEWER_EMAIL=reviewer@technova.example.com
DEMO_REVIEWER_PASSWORD=F3cDkuwTwFr34lfLdCpiasLTigEB1saV
```

Each demo password must contain at least 12 characters.

### Run demo seed

From the backend directory:

```powershell
.venv/Scripts/python.exe scripts/seed_demo.py
```

The script creates fictional test accounts, workspace records, and approved knowledge.

Demo seeding is disabled in production and never runs automatically at startup.

The seed preserves existing demo-account passwords and records; changing environment passwords alone does not rotate existing accounts.

### Example content for testing

Paste this fictional advertisement into the application:

> Introducing the new Tech Nova smartphone! Enjoy 15 hours of battery life with 100% guaranteed performance. It is the best phone in the world.

The provided demo knowledge is designed to demonstrate findings involving:

- Prohibited wording
- Missing disclosure
- Deprecated terminology
- Battery specification conflict
- Unsupported superlative claims

Findings reference approved knowledge sources and versions.

---

## 🔄 Content Governance Workflow

### Step 1 — Manage Knowledge

An administrator creates and maintains approved brand guidelines, specifications, and terminology.

### Step 2 — Upload Content

A Content Creator pastes text or uploads a supported document.

Original files are saved in GridFS.

### Step 3 — Analyze Content

The system evaluates content against approved knowledge and applicable deterministic checks.

Optional Gemini assistance is available when enabled and authorized.

### Step 4 — Review Findings

The creator examines detected issues, supporting evidence, and suggested corrections.

### Step 5 — Revise Content

The creator accepts or edits corrections and saves a new version.

Previous versions and analysis reports remain preserved.

### Step 6 — Request Human Review

The creator submits the analyzed version for review.

The submitted version is locked during review.

### Step 7 — Review and Decision

An authorized reviewer can approve, reject, or request changes.

High-severity, uncertain, and challenged findings require acknowledgement.

All decisions are recorded with the relevant audit events.

---

## 📌 Content Status Management

The application supports seven workflow states:

| Status | Meaning |
|---|---|
| `draft` | Content is being prepared |
| `submitted` | Content has been submitted |
| `analysing` | Content analysis is in progress |
| `needs_revision` | Corrections are required |
| `in_review` | Awaiting human review |
| `approved` | Authorized reviewer approved the content |
| `rejected` | Content was rejected |

The system enforces valid state transitions.

An approved status does not automatically publish content.

---

## 🤖 AI Integration

BRANDSHIELD AI uses Google Gemini as an optional assistant for content review.

AI assistance may help identify potential claim and tone issues and propose revisions.

### AI safety and reliability

- AI features require workspace consent.
- Selected claims and relevant approved passages may be sent to Gemini.
- AI-generated citations are checked against retrieved evidence.
- Invalid or unsupported citations are not accepted as verified evidence.
- AI provider failures do not erase deterministic analysis results.
- Human reviewers retain final approval authority.

The application does not treat generated AI text as automatically verified truth.

See `docs/ai-disclosure.md` for additional details.

---

## 🧪 Testing and Quality Assurance

### Backend tests

From `backend/`:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'

.venv/Scripts/python.exe -m pytest -q

.venv/Scripts/python.exe -m ruff check . --config pyproject.toml
```

Database integration tests require a dedicated MongoDB replica set.

The test fixture uses generated test databases and does not require production data.

Without `TEST_MONGODB_URI`, database integration tests are skipped.

### Frontend tests

From `frontend/`:

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run test:e2e
```

### Real API integration tests

To run the real API browser workflow:

1. Start the backend.
2. Configure an isolated MongoDB replica set.
3. Seed the fictional TechNova workspace.
4. Configure the required private test credentials.
5. Include the test browser origin in backend CORS settings.

Then run:

```bash
npm run test:integration
```

The existing test suite also covers explicit Demo Mode and API-unavailable scenarios.

See `docs/verification.md` for the project's verification records.

---

## 🌐 Deployment

The repository includes configuration for:

- Vercel frontend hosting
- Python container-based backend hosting
- MongoDB Atlas database storage

Deployment configuration is provided in:

`docs/deployment.md`

**Deployment readiness does not mean the application is currently live.** Public deployment and production integrations require separate verification.

Before deploying, configure backend environment variables, CORS origins, secure authentication settings, and MongoDB network access.

---

## 🔒 Security Features

The platform implements:

- Argon2 password hashing
- JWT authentication
- Workspace role-based access control
- Backend membership verification
- Submission ownership checks
- Review authorization
- Human-controlled approvals
- Controlled workflow transitions
- Input and file validation
- Version preservation
- API audit history
- Environment-based secret management

Sensitive credentials must remain outside version-controlled files.

Never store actual credentials inside `README.md` or `.env.example`.

---

## ⚠️ Current Limitations

BRANDSHIELD AI is a working prototype with clearly defined boundaries.

Current limitations include:

- Scanned PDFs require an OCR implementation for reliable text extraction.
- Complex DOCX formatting may not be fully interpreted.
- Rule-based fact checks cannot verify arbitrary real-world claims.
- Some accessibility checks depend on document metadata.
- Color checks are limited to explicitly represented color pairs.
- No password-reset workflow
- No SSO or multi-factor authentication
- No refresh-token implementation
- No automatic retention cleanup
- No large-workspace pagination

These limitations should be considered when evaluating results.

---

## 🚀 Future Improvements

Planned enhancements include:

1. OCR-based scanned document analysis.
2. Expanded document accessibility checks.
3. Advanced semantic claim verification.
4. AI-powered retrieval from approved brand knowledge.
5. Improved large-workspace search and pagination.
6. Password reset and stronger account recovery.
7. Multi-factor authentication and SSO.
8. Additional content formats and import tools.
9. Configurable retention policies.
10. Production monitoring and operational dashboards.

These are proposed improvements, not claims of currently implemented functionality.

---

## 📚 Documentation

Additional technical information is available in the repository:

- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api-reference.md)
- [System Architecture](docs/architecture.md)
- [Content Workflow](docs/workflow.md)
- [Security Documentation](docs/security.md)
- [AI Disclosure](docs/ai-disclosure.md)
- [Verification Record](docs/verification.md)

---

## 🏆 Hackathon Information

**Project:** BRANDSHIELD AI

**Event:** CodeNova India 2026

**Domain:** AI-Assisted Brand Governance and Content Compliance

**Project Type:** Full-Stack Web Application

**Core Technologies:** React.js, FastAPI, Python, MongoDB, Google Gemini

### Project Differentiation

BRANDSHIELD AI goes beyond simple AI-generated compliance suggestions by combining:

- Approved and versioned brand knowledge
- Evidence-linked findings
- Deterministic checks
- Content revision history
- Workspace-based authorization
- Human approval workflows
- Auditable decisions

The objective is to make content governance more transparent, consistent, and accountable.

---

## 👨‍💻 Developer

**Manikanta Achar**

Information Science & Engineering

Full-Stack Development | AI/ML | Open Source

**GitHub:** [Manikanta-Achar](https://github.com/Manikanta-Achar)

**Repository:** [BRANDSHIELD-AI](https://github.com/Manikanta-Achar/BRANDSHIELD-AI)

---

## ⭐ Project Vision

To make brand compliance and content governance more accessible, transparent, and evidence-driven while keeping humans responsible for final decisions.

**BRANDSHIELD AI — Find issues before publication. Show the evidence. Keep humans in control.**
