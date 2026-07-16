# OPORD 017 — Backup, Restore, and Data Lifecycle

## Status
HOSTED BACKUP/RESTORE + RECOVERABLE GRACE/EXPORT PASS; LIFECYCLE PARTIAL — scheduled encrypted backup/isolated restore run `29480318427` proves initial cron execution with eight migrations before migration nine. Earlier manual run `29517385245` proved all nine; fresh manual run `29527751546` at main head `90250b6d46482b3fa2b8d1a19b8eaeffc6a5148e` is the newest current-schema/direct-database-credential proof. Hosted lifecycle and export runs prove the recoverable access-disabled grace state, ownership race guard, service-role legal holds, cancellation recovery, and current-user encrypted export. Sustained RPO, a post-migration-nine scheduled restore, the external restore journal, permanent distributed purge, retention/orphan apply, managed PITR, and replacement cutover remain open.

## Situation and evidence
The hosted drill encrypted the dedicated `public`, `loopedin_private`, `auth`, and `storage` schemas plus private object bytes, restored the schemas and Storage metadata into an isolated disposable database, reconstructed the object bytes in a temporary directory, and reconciled counts, hashes, references, and owner/outsider RLS. The free plan has no managed restore points/PITR, so the daily logical backup is the active control; scheduled run `29480318427` proves initial cron execution with eight migrations before migration nine, not sustained RPO or current-schema scheduled recovery. Fresh manual run `29527751546` supplies the newest all-nine/current-schema proof. Hosted migration-eight lifecycle runs prove request/cancel/status and legal-hold behavior, but no permanent purge, external restore-journal replay, or retention/orphan apply exists.

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
| Encrypted DB backup/PITR and private-object strategy | HOSTED SCHEDULED LOGICAL PASS / PITR UNAVAILABLE | Dedicated schemas and three private object bytes are hashed and AES-256-GCM encrypted. Scheduled run `29480318427` proves the daily 05:23 UTC workflow executed backup, isolated restore, verification, and ciphertext upload with eight migrations before migration nine. Earlier manual `29517385245` proved all nine; fresh manual `29527751546` is the newest current-schema/direct-credential proof. Artifacts retain 30 days. Free-plan PITR is unavailable. |
| Isolated restore within RTO with DB/object/RLS/core-loop integrity | HOSTED SNAPSHOT PASS / CUTOVER OPEN | Fresh manual run `29527751546` at main head `90250b6d46482b3fa2b8d1a19b8eaeffc6a5148e` restored all nine migrations, three private objects, expected 1/1/1/4/4/4/3/0/1/3 counts, zero reference drift, exact owner 4/4/3 visibility, and outsider 0/0/0. Storage API rehydration and replacement cutover are untested. |
| Complete scoped encrypted auditable export | HOSTED CURRENT-USER PASS / POLICY OPEN | Hosted owner, member, and outsider browser downloads decrypt with exact current-account contribution scope; pairwise foreign IDs and signed URLs are absent, one owned private-media byte/hash is included, wrong passphrase/tamper fail, and the encrypted manifest supplies counts/integrity. Shared-family scope, server audit, production delivery, and policy approval remain open. |
| Deliberate idempotent cross-user-safe deletion | HOSTED GRACE-STATE PASS / LOCAL PURGE PASS / HOSTED PURGE OPEN | Hosted owner transfer, recent-auth enforcement, exact 30-day grace and backup boundary, pending DB/RPC/Storage denial, recovery, outsider isolation, and service-role-only holds pass. Disposable loopback proof adds an encrypted external journal, leased frozen plan, real object-first deletion, transactional contribution cleanup, Auth-last deletion, four crash resumes, neutral shared creators, and idempotent replay. Hosted/production purge and restore-time journal reconciliation remain unproven. |
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

Hosted logical recoverability, initial pre-migration-nine scheduled backup/isolated restore, fresh all-nine manual restore, conservative authenticated current-user export, access-disabled grace/cancel, and service-role legal-hold records pass. Local permanent-purge execution and encrypted journal recovery also pass. The OPORD remains partial because sustained RPO, a post-migration-nine scheduled restore, managed PITR, replacement cutover, hosted restore-journal replay/purge, and retention/orphan apply remain open.

## Superseding hosted backup disposition — 2026-07-16

Workflow-dispatch run `29465195044` was GREEN against dedicated staging. Scheduled run `29480318427` later proved initial cron execution of the encrypted backup, isolated restore, verification, and ciphertext upload with eight migrations before migration nine; one scheduled success does not establish long-term RPO history or current-schema scheduled recovery. The earlier encrypted artifact is `8362712936`, with recorded encrypted SHA-256 prefix `9c75…`, uploaded zip SHA-256 prefix `3d266…`, and expiry 2026-08-15. That snapshot contained one profile, one family, one membership, four events, four RSVPs, four messages, three media rows, one Auth user, and three private objects. It recorded all seven migrations, a 16.719-second observed snapshot age and 6.107-second isolated drill duration, matched all three reconstructed object-byte hashes/references, and proved owner access plus outsider 0/0/0 denial. Manual dispatch `29517385245` later proved all nine migrations; fresh manual `29527751546` at main head `90250b6d46482b3fa2b8d1a19b8eaeffc6a5148e` supersedes it as the newest current-schema/direct-credential proof with all nine migrations, three objects, expected counts/references, owner RLS, and outsider denial.

Restore recovered the telemetry schema/configuration while intentionally restoring zero short-lived telemetry event and limiter rows. The 24-hour RPO, four-hour RTO, and 30-day encrypted artifact retention remain the documented initial targets; one pre-migration-nine scheduled success and fast manual isolated drills are not a production-cutover guarantee. A post-migration-nine scheduled restore, sustained RPO, managed PITR, replacement-project cutover, destructive lifecycle apply, and production restore remain open.

## Hosted grace/export checkpoint — 2026-07-16

- At the lifecycle/export runs, dedicated staging and repository migration history both ended at immutable version `20260716033000`; no schema rollback or replay was used. Earlier manual run `29517385245` proved all nine, and fresh manual `29527751546` is the newest current-schema restore boundary.
- Hosted lifecycle run `lqa-mrni99q8-d25f64ff` proves the recoverable access-disabled state, 30-day grace plus backup boundary, service-only holds, cancellation recovery with a fresh signed private-object read/hash, expired-cancel denial, outsider isolation, protected-state equality, and zero residue.
- Hosted family/export run `qa-mrniaqp3-c0cb2cea` produced three actual encrypted browser downloads. Exact current-user contribution counts, all-four-identity isolation, ciphertext/data digests, one private-media hash, wrong-passphrase/tamper denial, outsider emptiness, and cleanup are GREEN.
- Permanent Postgres/Storage/Auth purge and external restore-safe journal behavior are locally automated and GREEN with synthetic loopback users only. Hosted restore replay, hosted/production deletion, journal custody, and operational authorization remain `NOT RUN`; this order stays **PARTIAL/CONDITIONAL**.
