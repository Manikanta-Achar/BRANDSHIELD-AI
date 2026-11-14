# Proposed FastAPI integration contract

This frontend is ready for a separately implemented service, not a completed backend integration. Default base URL: `http://localhost:8000/api/v1`. Axios is configured in `src/api/axios.js`; all paths and service functions live in `src/api/endpoints.js`. Demo commands and API commands are selected centrally by `DataContext`.

JSON bodies and returned objects use **camelCase** as below. The workspace filter query parameter is `workspace_id`. Return arrays directly for list operations. IDs are strings; dates/timestamps are ISO 8601. API tokens use `Authorization: Bearer <access_token>`. Enable CORS only for your actual frontend origins, including http://127.0.0.1:5173 in development.

## Authentication and profile

| Method | Path                    | Body / response                                  |
| ------ | ----------------------- | ------------------------------------------------ |
| POST   | `/auth/login`           | `{email,password}` → `{access_token,user}`       |
| POST   | `/auth/register`        | `{name,email,password}` → `{access_token,user}`  |
| GET    | `/auth/me`              | → `User`                                         |
| PATCH  | `/users/me`             | `{name,email}` → updated `User`                  |
| GET    | `/users/me/preferences` | → `{showActivity:true,reviewsOnly:false}`        |
| PATCH  | `/users/me/preferences` | `{showActivity,reviewsOnly}` → saved preferences |

```json
{
  "id": "user-123",
  "name": "Maya Sharma",
  "email": "maya@example.com",
  "role": "Content Creator",
  "initials": "MS"
}
```

The server assigns roles: `Admin`, `Content Creator`, `Reviewer`, `Agency Partner`. Registration must not trust a client-specified privileged role. Demo role selection is absent in API Mode. Tokens are memory-only and cleared on sign-out or page refresh. The current contract does not implement refresh tokens or an authenticated browser session.

## Workspaces and knowledge

| Method | Path                           | Body / response                                                 |
| ------ | ------------------------------ | --------------------------------------------------------------- |
| GET    | `/workspaces`                  | → assigned `Workspace[]`                                        |
| GET    | `/workspaces/{id}`             | → `Workspace`                                                   |
| PATCH  | `/workspaces/{id}`             | `{name?,description?,consent?}` → updated workspace; Admin only |
| GET    | `/knowledge?workspace_id={id}` | → `KnowledgeItem[]`                                             |
| POST   | `/knowledge`                   | knowledge item with `workspaceId`, without `id` → saved item    |
| PATCH  | `/knowledge/{id}`              | updated knowledge item → saved item; Admin only                 |
| POST   | `/knowledge/{id}/archive`      | no body → archived item; Admin only                             |

```json
{
  "id": "technova",
  "name": "TechNova",
  "description": "One brand. Every touchpoint.",
  "initials": "TN",
  "color": "#0d9488",
  "consent": false,
  "kbVersion": "3.2",
  "members": [
    {
      "id": "user-123",
      "name": "Maya Sharma",
      "email": "maya@example.com",
      "role": "Content Creator",
      "initials": "MS"
    }
  ],
  "retention": "Provide your actual server retention policy."
}
```

```json
{
  "id": "fact-1",
  "workspaceId": "technova",
  "type": "Approved Facts",
  "title": "TechNova Smartphone battery life",
  "content": "Up to 10 hours",
  "source": "TechNova Smartphone Specifications · battery",
  "owner": "Product team",
  "version": "2.1",
  "effective": "2026-01-01",
  "status": "Active",
  "rule": "battery",
  "subject": "TechNova Smartphone",
  "aliases": "TechNova, Tech Nova, smartphone"
}
```

Categories: `Brand Guidelines`, `Approved Facts`, `Terminology`, `Prohibited Words`, `Required Disclaimers`, `Approved Claims`. Status: `Active` (approved) or `Archived`. Optional `replacement` supplies approved wording; `trigger` defines a disclaimer keyword. `rule` is `battery`, `absolute` or `reference`. Both demo and server must respect effective dates and workspace boundaries. Snapshots must preserve the evidence used before knowledge updates.

## Submissions and extraction

| Method | Path                             | Body / response                                                                                 |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/submissions?workspace_id={id}` | → full visible `Submission[]`, with findings, comments, decisions and versions                  |
| GET    | `/submissions/{id}`              | → full `Submission`                                                                             |
| POST   | `/submissions`                   | `{workspaceId,title,channel,contentType,content,uploadId?,file?}` → `{id}` or `{id,submission}` |
| POST   | `/uploads`                       | multipart `file` → `{id,text}` after real extraction; errors if unsupported/unavailable         |
| POST   | `/submissions/{id}/versions`     | `{id,content}` → updated submission or version                                                  |
| GET    | `/submissions/{id}/versions`     | → `Version[]`                                                                                   |

The UI accepts one PDF or DOCX up to 10 MB. Server-side type, size and content validation are still required. API Mode sends the actual file via FormData. If extraction returns no text and no text was pasted, the frontend reports an error. Do not label extraction complete until it actually is. Persist file IDs/metadata on the server, not browser file buffers.

```json
{
  "id": "BS-1049",
  "workspaceId": "technova",
  "ownerId": "user-123",
  "ownerName": "Maya Sharma",
  "title": "Smartphone launch campaign",
  "channel": "Advertisement",
  "contentType": "Campaign copy",
  "format": "Text",
  "file": null,
  "content": "Original text",
  "revisedContent": "Current text",
  "analysedContent": "Last checked text",
  "status": "Needs Revision",
  "createdAt": "2026-11-14T08:00:00Z",
  "updatedAt": "2026-11-14T08:05:00Z",
  "kbVersion": "TechNova product specification v2.1",
  "findings": [],
  "versions": [],
  "comments": [],
  "decisions": []
}
```

Every submission must have at least one version. States are exactly `Draft`, `Submitted`, `Analysing`, `Needs Revision`, `In Review`, `Approved`, `Rejected`. Channels: `Social Media`, `Advertisement`, `Email`, `Website`, `Document`.

```json
{
  "number": 1,
  "content": "Original text",
  "author": "Maya Sharma",
  "date": "2026-11-14T08:00:00Z",
  "status": "Needs Revision",
  "kbVersion": "Product specs v2.1",
  "findings": []
}
```

## Analysis and finding resolution

| Method | Path                                     | Body / response                                                                               |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/submissions/{id}/analysis`             | no body; start or complete analysis → `{id,status}`                                           |
| GET    | `/submissions/{id}/analysis`             | → `{status,findings,kbVersion,analysedContent}`                                               |
| PATCH  | `/submissions/{id}/findings/{findingId}` | `{resolution,correction?,reason?}` (routing IDs may also appear) → updated finding/submission |

`DataContext.runAnalysis` polls the analysis GET endpoint every 750 ms, at most 20 times. Return `status: "Analysing"` while pending. On completion, return the resulting workflow status, e.g. `Needs Revision` or `Submitted`, and persist the full updated submission so subsequent list reads include it. A timeout is shown as still running, never as a successful analysis. Reopen the report to load its latest server state.

```json
{
  "id": "finding-1",
  "check": "R4",
  "title": "Battery claim conflicts with approved fact",
  "category": "Numeric conflict",
  "severity": "High",
  "text": "15 hours of battery life",
  "explanation": "Approved specification allows up to 10 hours.",
  "correction": "up to 10 hours of battery life",
  "confidence": "Deterministic rule match",
  "resolution": "Open",
  "reason": "",
  "evidence": {
    "id": "fact-1",
    "title": "Battery life",
    "content": "Up to 10 hours",
    "source": "Product specifications · battery",
    "owner": "Product team",
    "version": "2.1",
    "effective": "2026-01-01"
  }
}
```

Severities: `High`, `Medium`, `Low`. Resolutions: `Open`, `Accepted`, `Edited`, `Dismissed`, `Challenged`. Accept/edit update the working revision; the server must support saving/rechecking a new version. Dismiss/challenge require a substantive reason. Use `Unverified` for unsupported claims without contradictory evidence. Do not fabricate R6/R7 findings without metadata or A1/A2 model results. Enforce workspace AI permission before external processing.

## Human review

| Method | Path                               | Body / response                                                           |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/reviews?workspace_id={id}`       | → full pending `Submission[]`                                             |
| POST   | `/submissions/{id}/review`         | no body → updated submission; lock its version for human review           |
| POST   | `/reviews/{submissionId}/comments` | `{comment}` → saved comment                                               |
| POST   | `/reviews/{submissionId}/decision` | `{decision,comment,acknowledged}` (may include `id`) → updated submission |

`decision`: `Approved`, `Rejected` or `Needs Revision`. Reviewer/Admin only. The author cannot decide on their own content. Require an explanation of at least 10 characters and explicit high-severity acknowledgement. Reject stale decisions on already-decided versions. Never automatically approve content. A decision writes both a decision record and audit event atomically.

```json
{
  "decision": "Approved",
  "actor": "Priya Nair",
  "date": "2026-11-14T09:00:00Z",
  "version": 2,
  "comment": "Checked the evidence and creator corrections.",
  "acknowledged": true
}
```

```json
{
  "id": "comment-1",
  "text": "Please retain the battery qualifier.",
  "author": "Priya Nair",
  "role": "Reviewer",
  "date": "2026-11-14T09:00:00Z"
}
```

## Audit and dashboard

| Method | Path                           | Response                                                                                                                 |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/audit?workspace_id={id}`     | → visible `AuditEvent[]`, newest first                                                                                   |
| GET    | `/dashboard?workspace_id={id}` | → `{totalSubmissions,pendingReviews,approvedSubmissions,rejectedSubmissions,highSeverityViolations,byCategory,byStatus}` |

```json
{
  "id": "event-1",
  "workspaceId": "technova",
  "submissionId": "BS-1049",
  "action": "Content approved",
  "detail": "Checked the evidence and creator corrections.",
  "actor": "Priya Nair",
  "role": "Reviewer",
  "date": "2026-11-14T09:00:00Z",
  "version": 2,
  "kbVersion": "Product specs v2.1"
}
```

The dashboard currently derives its statistics from the visible submissions snapshot for consistency and period filtering. Its standalone stats service is prepared for later server aggregation. The review queue similarly derives pending records from that same snapshot; standalone review/version services are provided for future pagination.

## Snapshot loading and failures

After API login the frontend reads `/workspaces` and `/users/me/preferences`, then knowledge, full submissions and audit for each assigned workspace. Mutations reload this snapshot. All supplied endpoints needed by that path must exist; an unavailable endpoint is shown as an error, with no partial simulated state.

Return standard FastAPI errors such as `{"detail":"Permission denied"}`, validation detail arrays, or `{"message":"Service unavailable"}` with appropriate HTTP status. Axios displays these messages. Network errors are explicitly labelled as unreachable API services. Never silently return a demo object on failure.

The server must enforce authentication, membership, owner/reviewer boundaries, input validation, version concurrency, effective knowledge, AI consent, immutable audit storage and data retention. The frontend's local guards cannot replace these controls.
