# OPORD 017 — Backup, Restore, and Data Lifecycle

## Status
HOSTED LOGICAL BACKUP/RESTORE PASS; LIFECYCLE PARTIAL — the dedicated project has client-encrypted database/private-object backup tooling, 24-hour RPO/4-hour RTO/30-day retention targets, protected environment secrets, and a GREEN workflow-dispatch isolated restore with count/hash/reference/RLS evidence. First cron observation, managed PITR, replacement cutover, deletion apply, and legal-hold operations remain open.

## Situation and evidence
The hosted drill encrypted the dedicated `public`, `loopedin_private`, `auth`, and `storage` schemas plus private object bytes, then restored them into an isolated disposable database and reconciled counts, hashes, references, and owner/outsider RLS. The free plan has no managed restore points/PITR, so daily logical backup is the active control. Export/deletion apply and legal-hold jobs still do not exist.

## Mission/objective
Implement and prove recoverability for database and private objects, then implement auditable user export/deletion, retention, and orphan reconciliation without weakening event/group privacy.

## Dependencies
Depends on: OPORD-006, OPORD-016

The authoritative data boundary and release controls must exist. Product/legal owners must approve data classes, RPO/RTO, retention periods, deletion grace, export scope, and backup-versus-erasure obligations.

## Non-goals
Production restore during initial drill, indefinite retention, analytics warehouse, public media archive, destructive schema migration, or claiming compliance certification.

## Authorized territory (files/systems)
After activation: backup/lifecycle scripts and runbooks, scheduled job definitions, disposable isolated restore environment, approved Supabase backup/PITR controls, private object inventory/backup strategy, export/delete endpoints or operator tooling, tests/evidence. Production mutation requires separately approved run windows.

## Forbidden territory
Credentials in source/output, restores over production, deletion without verified scope/approval, public buckets, disabling RLS, silent backup deletion, unencrypted exports, remote production work before staging proof, or legal decisions inferred by engineers.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Export and deletion requests must explain scope, timing, grace/recovery limits, and completion in plain language with deliberate confirmation; users must not lose family memories through ambiguous taps or silent partial failure.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O017-T1 | 1 | Data reliability engineer | Private / gpt-5.5 | database backup/PITR controls, object strategy, inventory manifest | Configure encrypted database backups/PITR to approved RPO and a private versioned/object-copy strategy; inventory database/object coupling. | Automated evidence proves schedule/retention/access; restore points and object manifests are attributable without exposing contents. |
| O017-T2 | 2 | Restore operator | Private / gpt-5.5 | isolated disposable restore environment, drill runbook/evidence | Restore database and private objects into an isolated environment; reconcile counts/references, enforce RLS, run configured smoke, then destroy environment under approval. | Drill meets RTO/RPO, has integrity/RLS evidence, never targets production, and records cleanup. |
| O017-T3 | 3 | Privacy/data builder | Private / gpt-5.5 | export/delete tooling, audit records, tests | Implement authenticated scoped export and deletion with grace/tombstone semantics approved by product/legal; include relational and object data. | Two-user tests prevent cross-user export/delete; output is encrypted; retry is idempotent; completion reports partial failures. |
| O017-T4 | 4 | Lifecycle operator | Private / gpt-5.5 | retention jobs, orphan reconciler, metrics/runbook | Implement dry-run-first retention and bidirectional orphan reconciliation for media rows/objects; require approval for destructive apply. | Dry run is reviewable; apply is bounded/idempotent; protected/grace/legal-hold data is excluded; discrepancies are auditable. |
| O017-T5 | 5 | Independent reviewer | Sergeant / gpt-5.3-instant | recovery/lifecycle evidence, review log | Review drill, sampled export/delete, retention/orphan reports and access logs; verify backup-erasure policy. | No unresolved critical discrepancy; owners sign RPO/RTO and lifecycle evidence; follow-ups are assigned. |

## Acceptance criteria
- Encrypted database backup/PITR and private-object strategy meet approved RPO/retention with least-privilege access.
- An isolated restore drill reconstructs database/object consistency, RLS, and the configured core loop within RTO.
- Authenticated exports are complete, scoped, encrypted, and auditable.
- Deletion is deliberate, idempotent, cross-user safe, and reconciles rows/objects while honoring approved backup/legal retention.
- Retention and orphan cleanup run in dry-run mode first, exclude protected data, and emit bounded reviewable plans before apply.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Encrypted DB backup/PITR and private-object strategy | HOSTED LOGICAL PASS / PITR UNAVAILABLE | Dedicated schemas and three private object bytes are hashed and AES-256-GCM encrypted. Repository secrets, daily 05:23 UTC workflow, and 30-day artifact retention are configured; schedule activation awaits default-branch merge. Free-plan PITR is unavailable. |
| Isolated restore within RTO with DB/object/RLS/core-loop integrity | HOSTED SNAPSHOT PASS / CUTOVER OPEN | Digest-pinned offline restore matched 1/1/1/4/4/4/3/0/1/3 counts, hosted migration/Storage inventories, three object hashes, zero reference drift, exact owner 4/4/3 visibility, and outsider 0/0/0 in 10.392 seconds from a 28.2-second-old snapshot. Storage API rehydration and replacement cutover are untested. |
| Complete scoped encrypted auditable export | LOCAL PASS / HOSTED OPEN | Existing Auth/RLS reads produce a versioned AES-256-GCM browser download for the current account profile/memberships and only its created/authored/uploaded/selected contributions. Owner, member, and outsider actual downloads decrypted with exact scope; pairwise foreign IDs and signed URLs were absent; wrong passphrase/tamper failed. The encrypted manifest provides counts/integrity. Shared-family scope, server audit job, hosted delivery, and policy approval remain open. |
| Deliberate idempotent cross-user-safe deletion | DRY RUN ONLY | Deterministic bounded plans deny cross-user scope and expose no apply mode. All 21 owner candidates remain protected/blocked pending product/legal policy and destructive authorization. |
| Dry-run retention/orphan plan before apply | LOCAL DRY-RUN PASS | Bidirectional row/object comparison found zero discrepancies in the retained scenario; fixture tests cover both orphan directions, bounding, and review-only exclusions. No retention or apply job exists. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm run lint; npm test; npx tsc --noEmit; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
Get-ChildItem supabase/migrations -File | Sort-Object Name | ForEach-Object Name
rg -n "loopedin_event_media|storage_path|storage.buckets|storage.objects" supabase app/src tests
```

Run fixture-backed export/delete idempotency, cross-user isolation, retention dry-run, and row/object reconciliation tests without remote credentials.

Run the local encrypted backup/restore and lifecycle dry run using `docs/runbooks/local-backup-restore-data-lifecycle.md`. The passphrase must be runtime-only; the default drill removes its artifact.

### Conditional-staging/mobile-web/human
With explicit authorization, verify backup/PITR metadata, restore into a disposable isolated environment, restore private objects, run RLS/integrity/core-loop checks, exercise encrypted export/deletion on synthetic users, and run retention/orphan dry-run before any apply. Production restore/deletion and human testing remain NOT RUN unless separately approved.

## Stop conditions/authorization limits
Stop for missing product/legal decisions, credentials, inadequate isolation, unverifiable encryption, restore target ambiguity, RPO/RTO miss, RLS failure, cross-user exposure, destructive plan without dry-run approval, or production targeting. Preserve evidence and escalate; do not “fix forward” remotely without authority.

## Risks/follow-ups
Database/object point-in-time mismatch, backups conflicting with erasure duties, stale signed URLs, orphan cleanup false positives, export leakage, and drills that omit browser download/reload behavior. Schedule periodic restore drills and lifecycle reviews after initial acceptance.

## Definition of done
Backup/PITR and private-object protection are configured, an isolated restore drill passes RPO/RTO/integrity/RLS checks, export/deletion and retention/orphan flows have scoped executable evidence, and every production/destructive action has explicit authorization and audit history.

Hosted logical recoverability, conservative authenticated current-user export, and non-destructive planning pass. The OPORD remains partial because the first cron trigger is unobserved, managed PITR is unavailable, and replacement cutover, deliberate deletion, legal hold, and retention/orphan apply remain open.

## Superseding hosted backup disposition — 2026-07-16

Workflow-dispatch run `29465195044` was GREEN against dedicated staging; it is not evidence that the cron trigger has fired. The encrypted artifact is `8362712936`, with recorded encrypted SHA-256 prefix `9c75…`, uploaded zip SHA-256 prefix `3d266…`, and expiry 2026-08-15. The snapshot contained one profile, one family, one membership, four events, four RSVPs, four messages, three media rows, one Auth user, and three private objects. It recorded all seven migrations, measured RPO 16.719 seconds and isolated RTO 6.107 seconds, matched all three object hashes/references, and proved owner access plus outsider 0/0/0 denial.

Restore recovered the telemetry schema/configuration while intentionally restoring zero short-lived telemetry event and limiter rows. The 24-hour RPO, four-hour RTO, and 30-day encrypted artifact retention remain the documented initial targets; one fast drill is not a production-cutover guarantee. Managed PITR, first observed cron trigger, replacement-project cutover, destructive lifecycle apply/legal hold, and production restore remain open.
