# AI disclosure

Gemini is optional. Both workspace consent and configured `GEMINI_API_KEY`/`GEMINI_MODEL` are required. `ai_disclosures` records provider/model, content version, consent, attempted processing, timestamp and outcome. Automated tests mock the provider and consume no paid quota.

A1 selects up to five promotional candidate sentences, retrieves effective approved workspace passages, and requests Supported/Conflicts/Unverified JSON. A2 compares up to 10,000 content characters with approved brand guidelines and proposes minimal corrections. Pydantic validates responses. Citations must match retrieved source IDs, label versions, server revisions and exact quotations. Unknown/invalid citations are rejected and claims remain Unverified. Citation provenance does not prove model reasoning.

Only selected content/knowledge is sent to Google under workspace permission. Administrators must grant appropriate processing permission for sensitive material. Embedded instructions are untrusted data. Models cannot approve or publish.

Missing configuration, timeouts, quota failures or invalid output produce skipped/unavailable/partial AI status and frontend warnings. Deterministic results remain persisted. R1–R5 need no AI; R6/R7 report missing metadata explicitly. Human review is always required. Live account/model availability requires operator configuration and separate verification. Embeddings, OCR and whole-document rewriting are planned, not implemented.
