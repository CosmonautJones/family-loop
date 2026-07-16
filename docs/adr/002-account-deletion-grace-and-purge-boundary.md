# ADR 002: Account Deletion Grace and Purge Boundary

## Status

Accepted as the LoopedIn lifecycle architecture. The recoverable grace state is verified locally and with disposable hosted-staging accounts. The permanent-purge boundary, encrypted external journal, recovery gate, and crash-safe operator are implemented and verified only against disposable loopback Supabase; hosted/production adoption and restore-time replay remain unproven.

## Context

LoopedIn stores private family records in Postgres, photo bytes in Supabase Storage, identities and sessions in Supabase Auth, and encrypted recovery copies outside the project. These systems cannot participate in one atomic delete. A backup restored from before a deletion request can also recreate both data and access unless a deletion tombstone survives outside the restored database.

## Problem

A direct Auth-user delete is unsafe: creator foreign keys intentionally restrict it, Storage objects are not removed by database cascades, and a partial failure could leave private bytes, rows, or a live identity behind. Conversely, delaying all authorization changes until final purge would leave a confirmed deletion request with full family access during the grace period.

## Decision

1. A confirmed request enters a database-backed `pending` grace state for exactly 30 days.
2. New server-authorized family access is denied throughout that state. Account-deletion status, cancellation before the deadline, and sign-out remain available.
3. Family owners must transfer ownership before requesting deletion. An inactive account cannot become an ownership-transfer target, and request/transfer operations serialize on the target account.
4. The product path requires current-password re-entry; the database additionally requires a sign-in within five minutes. Security notification email remains a production prerequisite once custom SMTP exists.
5. Legal holds are service-role-only records with bounded reason and operator references. A hold never restores access or extends the self-service recovery deadline.
6. Backup copies expire through the documented 30-day backup retention. A request records the conservative latest backup-expiry boundary as 30 days after its purge deadline.
7. Permanent deletion is a separate operator state machine across Postgres, Storage, and Auth. It must be leased, retryable, idempotent, hold-aware, and delete Auth last.
8. A deletion/legal-hold journal outside the database being restored must outlive every restorable copy. No restored environment may receive traffic until that journal is replayed and reconciled.
9. Shared families and events survive with a neutral `null` creator after the subject leaves. The frozen deletion plan includes both subject media rows and subject-owned Storage objects, including object orphans.

## Alternatives

- **Delete the Auth user and rely on cascades:** rejected because creator constraints block it and Storage bytes are outside the database transaction.
- **Cascade creator-owned families or trips:** rejected because one person leaving must not destroy shared family plans.
- **Reassign creator fields during the request:** rejected because it would misstate authorship before an approved custody/anonymization decision.
- **One operator script with best-effort cleanup:** rejected because failures across Postgres, Storage, and Auth must remain durably retryable.
- **Keep access until final purge:** rejected because it conflicts with immediate disablement after confirmation.

## Consequences

- The grace state can be implemented and tested without authorizing destructive purge.
- Pending accounts fail closed at RLS helpers, direct policy branches, authenticated RPC wrappers, Storage helpers, and the client query bootstrap.
- Signed private-media URLs retain the existing one-hour lifetime until the app has expiry-aware renewal. Already rendered data, an already issued URL during its remaining lifetime, and previously downloaded bytes cannot be revoked; this is a documented boundary rather than an immediate-erasure claim.
- The client polls deletion status every 15 seconds while authenticated and clears protected Query data and active-family state when pending status is observed.
- Production remains blocked until journal custody/replay and the destructive operator are adapted and independently proven in an authorized hosted environment. The current operator refuses every non-loopback target.

## Assumptions and inferences

- **Approved policy input:** immediate access disablement, a 30-day recoverable grace period, ownership transfer first, permanent deletion after grace, backup expiry under retention, and explicit legal-hold records were supplied as the default lifecycle policy.
- **Verified locally:** migration reset/lint, stale-session and owner rejection, concurrent request/transfer serialization, pending DB/RPC/Storage denial, pre-deadline cancellation, expired cancellation denial, legal-hold privilege, and restored access after cancellation.
- **Verified locally for permanent purge:** service-role-only leasing, deadline/owner/hold rechecks, deterministic frozen path union and digest, inbound invitation/token/delivery association cleanup, real object deletion and exact absence checks, transactional contribution cleanup, Auth deletion last, five injected crash/resume boundaries including database completion before its journal checkpoint, neutral shared creators, encrypted chained journal retention, authenticated-only restore reconciliation, outsider denial, and idempotent completion replay.
- **Verified in dedicated staging with synthetic users:** owner transfer, exact grace/backup boundaries, pending DB/RPC/Storage denial, legal holds, cancellation restoration, expired cancellation denial, outsider isolation, unchanged protected state, and zero residue.
- **Inference:** 15-second status polling plus fail-closed protected-cache eviction reduce cached-access exposure within the current browser architecture; expiry-aware media renewal and physical-device behavior remain unimplemented or unobserved.

## Non-decisions

This ADR does not choose the external journal provider, legal-hold retention period, hosted purge worker, production Supabase project, SMTP provider, or production promotion. It does not claim deletion compliance or hosted/production erasure.

## Validation

- `node --test tests/account-lifecycle-contract.test.js`
- `./scripts/test-local-supabase-account-lifecycle.ps1`
- `node --test tests/account-purge-contract.test.js tests/account-purge-journal.test.js`
- `./scripts/test-local-supabase-account-purge.ps1`
- `supabase db reset --local`
- `supabase db lint --local --level error`
- Root/app tests, TypeScript, lint, migration checksum validation, secret scan, and independent review remain required.

## Evidence links

- [`account lifecycle migration`](../../supabase/migrations/20260716033000_account_deletion_grace_state.sql)
- [`account lifecycle E2E`](../../tests/supabase-account-lifecycle-e2e.mjs)
- [`account lifecycle runbook`](../runbooks/account-deletion-grace-state.md)
- [`permanent purge migration`](../../supabase/migrations/20260716213000_permanent_account_purge_boundary.sql)
- [`permanent purge E2E`](../../tests/supabase-account-purge-e2e.mjs)
- [`OPORD 017`](../opords/017-backup-restore-data-lifecycle.md)
- [`current mission`](../../tasks/current-mission.md)
- [`regression checklist`](../../evals/regression-checklist.md)
