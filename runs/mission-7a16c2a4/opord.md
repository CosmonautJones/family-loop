# OPORD — Retryable Permanent Account Erasure

## Intent

Add the smallest reviewable local implementation that can safely erase an eligible account after its grace period while preserving shared family records, private-object cleanup evidence, legal-hold enforcement, retryability, and restore safety. This mission produces code and proof only; it does not apply a migration or execute a purge against any hosted environment.

## Desired end state

An operator can lease and prepare one eligible deletion, export an encrypted append-only journal checkpoint, delete and verify every planned private object, finalize relational cleanup, delete the Auth user last, and append completion evidence. Retries reconcile by stable operation/idempotency identifiers. A restored environment cannot serve traffic until all retained journal entries newer than its backup have been replayed or reconciled.

## Execution

### Wave 1 — Schema boundary

- Add one forward-only migration and checksum.
- Make shared family/group and event/trip creator foreign keys nullable with `ON DELETE SET NULL`; do not fabricate a replacement creator.
- Update the narrow application row/domain boundary so a missing creator is represented as a neutral former member and never grants creator permissions.
- Add service-role-only lease, prepare, relational-finalize, and completion RPC boundaries.
- At lease/prepare/finalize, lock and recheck grace expiry, ownership transfer, deletion state, and absence of an active legal hold.
- Emit bounded identifiers/counts and a stable plan digest; never return secrets or private content to the journal.

### Wave 2 — Operator and journal

- Add a narrow purge operator script that performs: lease → prepare → encrypted journal checkpoint → Storage object delete → object-absence verification → relational finalize → Auth delete → completion checkpoint.
- Stop before relational finalization when any object deletion or verification fails.
- Keep Auth deletion last. Treat completed stages as idempotent on retry.
- Add an encrypted append-only external journal helper with authenticated records, checkpoint validation, replay/reconciliation support, and retention longer than every database/private-media backup.
- Require journal replay/reconciliation before restored traffic is admitted.

### Wave 3 — Focused proof and documentation

- Test eligibility/hold/ownership races, service-role-only RPC access, stable plan digest, object-first failure behavior, nullable shared creators, retry behavior, Auth-last ordering, journal tamper detection, retention validation, and restore replay gating.
- Update only directly relevant ADR, lifecycle/backup-restore runbook, current mission, regression checklist, and review log.

## Exact Sergeant manifest

- `supabase/migrations/20260716213000_permanent_account_purge_boundary.sql`
- `supabase/migrations/checksums.sha256`
- `scripts/account-purge-journal.mjs`
- `scripts/invoke-account-purge.ps1`
- `scripts/test-local-supabase-account-purge.ps1`
- `tests/account-purge-contract.test.js`
- `tests/account-purge-journal.test.js`
- `tests/supabase-account-purge-e2e.mjs`
- `app/src/types/domain.ts`
- `app/src/services/supabaseAdapter.ts`
- `docs/adr/002-account-deletion-grace-and-purge-boundary.md`
- `docs/opords/017-backup-restore-data-lifecycle.md`
- `docs/runbooks/account-deletion-grace-state.md`
- `docs/runbooks/hosted-operations-backup-monitoring.md`
- `docs/architecture.md`
- `tasks/current-mission.md`
- `evals/code-rubric.md`
- `evals/regression-checklist.md`
- `evals/review-log.md`

No extra file, dependency, or provider change is authorized without General approval and registry amendment.

## Gates

- **G1 TEST:** focused contract/journal/local-Supabase tests plus the complete relevant root and app suites pass, including failure injection and restore-journal reconciliation.
- **G2 LINT:** substantive lint, TypeScript, migration checksum/apply/lint, secret scan, build/harness, diff, and territory checks pass.
- **G3 REVIEW:** a fresh-context independent reviewer reports zero unresolved findings on the exact head and attempts to falsify hold, object-first, Auth-last, journal, replay, and privacy claims.
- **G4 INTEGRATION:** the full operator runs only against disposable loopback Supabase identities/objects; interrupted retries converge, shared rows survive with null creators, and restored pre-purge state stays inaccessible until journal reconciliation.
- **G5 KNOWLEDGE:** the ADR, OPORD, runbooks, architecture, current mission, rubrics, regression checklist, and review log distinguish automated local proof, manual observation, and hosted/production items still unproven.

Scope is also a blocking invariant across every gate: the diff must stay inside the signed manifest, add one forward migration, and contain no unrelated feature, visual, dependency, deployment, or provider mutation.

## General decision record

The signed custody decision is nullable shared creator references with `ON DELETE SET NULL`. Reassignment to a surviving owner would falsify authorship; a sentinel Auth identity would retain a privileged identity-shaped object; cascading would destroy shared family history. The operator and external encrypted journal may retain the original account identifier only until every restorable backup has expired plus the documented reconciliation margin. Durable evidence must contain only an opaque operation ID, plan digest, phase, counts, timestamps, and bounded failure code; plaintext paths, names, emails, content, URLs, tokens, and credentials are prohibited.

## Rollback and abort criteria

Local migration validation may be rolled back only by resetting a disposable local database and rebuilding forward. Do not author or prove a destructive reverse migration. Abort before relational finalization on storage mismatch, missing/invalid journal checkpoint, changed eligibility, legal hold, ownership conflict, digest mismatch, or lost lease. Abort before Auth deletion unless relational finalization is verified and its journal checkpoint is durable. Hosted migration apply, hosted data deletion, deployment promotion, SMTP changes, recipient contact, and production mutation are outside this mission.
