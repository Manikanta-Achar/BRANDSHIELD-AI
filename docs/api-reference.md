# Implemented API inventory

Prefix `/api/v1`. Protected routes require `Authorization: Bearer <JWT>`. Lists return arrays, IDs are strings, timestamps are UTC ISO 8601. Running `/docs` and `/openapi.json` provide exact schemas.

| Methods | Path | Behavior |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | `{access_token,token_type,user}`; registration assigns Content Creator |
| GET / POST | `/auth/me` / `/auth/logout` | Profile / revoke account's existing JWT sessions |
| PATCH | `/users/me` | Name/email; no role changes |
| GET, PATCH | `/users/me/preferences` | Notification indicator preferences |
| GET, POST | `/workspaces` | Assigned list / operator Admin creates organisation |
| GET, PATCH | `/workspaces/{id}` | Membership-protected details / Admin settings |
| PUT | `/workspaces/{id}/members` | Admin assigns registered `{email,role}` |
| DELETE | `/workspaces/{id}/members/{userId}` | Remove membership, preserving last Admin |
| GET, POST | `/knowledge` | List (`workspace_id`, optional `category`, `q`) / Admin creates |
| GET, PATCH | `/knowledge/{id}` | Read / Admin updates with `expectedRevision` |
| GET | `/knowledge/{id}/versions` | Historical source revisions |
| POST | `/knowledge/{id}/archive` | Archive, preserving history |
| POST | `/uploads` | Multipart `file`, `workspace_id`; real extraction/GridFS |
| GET, POST | `/submissions` | Scoped list (`workspace_id`) / creator-owned draft |
| GET | `/submissions/{id}` | Full record with findings, versions, comments, decisions |
| GET, POST | `/submissions/{id}/versions` | History / `{content,expectedVersionId}` revision |
| GET | `/submissions/{id}/file` | Authorised original document download |
| GET, POST | `/submissions/{id}/analysis` | Persisted report / synchronous server analysis |
| PATCH | `/submissions/{id}/findings/{findingId}` | `{resolution,correction?,reason?,expectedVersionId}` |
| GET | `/reviews?workspace_id=...` | Assigned Reviewer/Admin pending queue excluding own content |
| POST | `/submissions/{id}/review` | `{expectedVersionId}` locks analysed version |
| POST | `/reviews/{id}/comments` | Reviewer `{comment}` |
| POST | `/reviews/{id}/decision` | `{decision,comment,acknowledged,expectedVersionId,reviewRequestId}` |
| GET | `/audit?workspace_id=...&limit=1000` | Visible append-only history |
| GET | `/dashboard?workspace_id=...&days=30` | Persisted statistics and recent activity |

Unprefixed health: `/health/live`, `/health/ready`. Creation returns 201; logout/member removal returns 204; other successes return 200. Errors: 401 session/credentials; 403 role/tenant/owner violation; 404 missing record; 409 duplicate/stale version/invalid transition; 413 size limit; 422 input/extraction/reason/acknowledgement; 429 auth throttling; 503 database/configuration unavailable.

Knowledge categories: `Brand Guidelines`, `Approved Facts`, `Terminology` (deprecated → replacement), `Approved Terminology`, `Prohibited Words`, `Required Disclaimers`, `Approved Claims`, `Approved Assets`. Only effective `Active` sources enter analysis. Optional `channels` scopes disclaimers. Operator `version` and server `revision` both appear in evidence. Mutations reject unknown fields.

Stored states use lowercase/underscores; UI `status` is title-cased. Decisions: `Approved`, `Rejected`, `Needs Revision`. Finding resolutions: `Open`, `Accepted`, `Edited`, `Dismissed`, `Challenged`. Audit has no mutation endpoint.
