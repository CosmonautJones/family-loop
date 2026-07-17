# Gates

Status: repository and hosted backend GREEN; mail/provider gates remain open.

- G1 TEST: GREEN — sender 12/12, app 87/87, local Supabase invitation-email E2E GREEN.
- G2 STATIC/SCHEMA: GREEN — database lint zero, TypeScript/ESLint/secret scan/diff GREEN, all 9 committed migration Git-blob hashes match.
- G3 REVIEW: GREEN — fresh independent review at `13a33dd` returned zero findings after a RED fix loop closed three Medium findings.
- G4 INTEGRATION: BACKEND GREEN / DELIVERY NOT RUN — remote history matches all 9 migrations; Edge Function version 1 is active with JWT verification, exact-origin preflight, and anonymous denial. Provider credentials/sender and real email remain absent.
- G5 KNOWLEDGE: GREEN — architecture, invitation/email runbook, current mission, review log, and regression checklist distinguish automated, manual, and unproven evidence.

Repository gate: PR #11 merged to `main` at `6e8616d9e6d8a8fa7ddbebfa958aa5b11df5964c`; main CI run `29516031310` is GREEN for application quality, migration integrity, security/dependencies, and release artifact. Immutable artifact `loopedin-web-6e8616d9e6d8a8fa7ddbebfa958aa5b11df5964c` has digest `sha256:fe2b977a8b3d97250700487e885a21c87252e3e8f8f268c322e4a6991bf2b341` and expires 2026-07-30.

Backup gate: post-rotation run `29516656250` revalidated the credential before migration; post-migration run `29517385245` restored all-nine hosted history, counts, object hashes, references, and owner/outsider RLS into an isolated database. Ciphertext artifact `8383282648` expires 2026-08-15.

Open gates: Resend domain/sender/tracking/API key, Supabase Auth SMTP, newer web deployment, and approved-recipient delivery/acceptance proof.
