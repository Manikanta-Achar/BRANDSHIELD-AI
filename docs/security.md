# Security model

Passwords use Argon2 via pwdlib; emails are unique and normalized. Registration rejects role injection. JWTs validate signature, algorithm, issuer, audience, required claims, expiry and account token generation. Logout revokes existing account tokens. MongoDB counters provide basic login/register throttling.

Each resource requires explicit workspace membership plus owner/reviewer rules. Knowledge/settings/membership require workspace Admin. Self-approval is forbidden. Pydantic rejects unknown mutation fields, MongoDB IDs are validated, search regex input is escaped, and stale versions/requests fail.

Uploads check extension/signature, ZIP expansion, size, safe filenames and successful readable extraction. Originals are stored in GridFS. Scanned, encrypted or corrupt documents return errors with paste-text guidance. Configure reverse-proxy size limits too. No active document rendering, OCR or malware scanning is provided.

External AI requires explicit workspace consent and server credentials. Model input is untrusted data; returned citations must match approved evidence. AI has no approval/publication path. Production rejects weak/missing JWT configuration, wildcard CORS and demo seed. Errors never print database URIs, provider secrets or content. Private environment files, local QA data and credentials are Git-ignored.

Audit is append-only via the API; database operators retain physical control. Browser-tab session storage is JavaScript-accessible; production XSS controls/HTTPS matter. Refresh cookies, SSO/MFA, password reset, email verification, automated retention and enterprise audit immutability remain future work. Local compose is unauthenticated development infrastructure, not a production deployment.
