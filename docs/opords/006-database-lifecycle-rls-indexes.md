# OPORD 006 — Database lifecycle, RLS, and indexes

## Status

LOCAL COMPLETE / EXTERNAL CONDITIONAL — forward migrations, lifecycle constraints, loopback RLS/direct-ID matrices, and rollback-safe representative query plans pass. No speculative index was retained; hosted migration and production-cardinality evidence remain `NOT RUN`.

## Situation and evidence

- The configured adapter already references group-scoped events, RSVPs, event messages, media, and notifications (`docs/architecture.md:50-56`).
- Five forward migrations apply cleanly to loopback Supabase. Database lint and real Auth-session owner/member/outsider family/media matrices pass; hosted deployment remains absent.
- Event messages are exact-event scoped and deterministic in local contract tests (`docs/architecture.md:41-46`; `evals/review-log.md:3-12`).
- The product boundary requires private group context (`docs/architecture.md:57-61`).
- Inference: lifecycle cascades, uniqueness, query indexes, and policy coverage must be verified against actual repository SQL and query shapes before proposing additive changes.

## Mission/objective

For one explicitly approved data slice, prove lifecycle integrity, least-privilege RLS, and query-supporting indexes through versioned, additive, reversible repository changes and safe tests—without destructive production mutation.

## Dependencies

Depends on: OPORD-005

- OPORD-005 readiness matrix and named target data slice.
- Owner-approved migration/RLS manifest, rollback/forward-fix policy, and safe database environment.
- Two isolated test users in different groups; Docker/local Supabase or approved non-production remote.

## Non-goals

- Broad schema redesign, ORM adoption, production deployment, data backfill, destructive cleanup, service-contract expansion, or indexes without query evidence.
- Auth, billing, settings, teams UI, notifications UI, or runtime feature work.

## Authorized territory (files/systems)

- Before GREEN: read-only SQL/query/static inspection and documentation.
- After explicit approval: exactly named new additive migration(s), focused database tests, and docs/evals records.
- Approved disposable local/non-production database only.

## Forbidden territory

- Production database, destructive or rewriting migrations, credential discovery, service-role use in client tests, existing migration edits, deployment, new dependencies, and runtime application files unless separately authorized.

## Older-adult usability guardrail

Database failures must preserve truthful, recoverable UI: never substitute stale fixtures, duplicate an RSVP/invitation, or lose a user's typed message silently. Performance targets should protect predictable phone response times on ordinary family datasets.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O006-T1 | 1 | Database analyst | Private / gpt-5.3-instant | Adapter queries and migration SQL (read-only), lifecycle matrix | Trace tables, keys, uniqueness, filters/orders, policies, and indexes; specify CRUD, deletion, removal, cross-group, and duplicate cases. | Matrix is source-cited and separates repository intent from deployed proof. |
| O006-T2 | 1 | Database performance reviewer | Private / gpt-5.3-instant | Approved disposable database, query-plan evidence | Capture representative plans and propose only indexes tied to real filter/order/join paths. | Every proposed index has before evidence and no redundant/speculative index remains. |
| O006-T3 | 2 | Migration implementer | Private / gpt-5.3-instant | Exactly approved new migration and focused database tests | After GREEN approval, add forward-only migration/tests and run two-user integrity/RLS cases in the disposable environment. | Migration applies from baseline; policies deny cross-group access; no history or production state changes. |
| O006-T4 | 2 | Recovery reviewer | Private / gpt-5.3-instant | Migration documentation only | Prepare forward-fix and non-destructive recovery notes; do not execute destructive rollback. | Failure paths and escalation points are explicit and data loss is not authorized. |

## Acceptance criteria

- Foreign keys and uniqueness enforce the approved lifecycle without orphaning or cross-group attachment.
- RLS denies unauthenticated and nonmember direct-ID access and permits only documented member actions.
- Two-user tests cover same-group and different-group cases for every changed policy.
- Each added index maps to a real filter/order/join and improves or protects an evidenced plan; redundant indexes are rejected.
- Migration applies cleanly from the supported baseline and does not modify historical migrations.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| FK/uniqueness lifecycle integrity | COMPLETE LOCALLY | Family and media migrations plus lifecycle E2E; event deletion is restricted while media operations exist. |
| RLS denies unauthenticated/nonmember direct IDs | COMPLETE LOCALLY | `scripts/test-local-supabase-family.ps1` and media matrix; configured outsider browser route. |
| Same/different-group tests for changed policies | COMPLETE LOCALLY | Four real Auth sessions cover owner/member/invitee/outsider. |
| Every added index maps to measured query plan | COMPLETE LOCALLY — NO INDEX ADDED | Actual production event/message/media/RSVP/notification/reminder queries and membership helpers stayed below 1 ms at 20/100/100/50 representative volume. A candidate that benefited only an uncalled activity method was rejected, so no speculative migration remains. |
| Clean forward apply; history unchanged | COMPLETE LOCALLY | Local reset/apply and database lint pass; migrations are additive. |

`scripts/test-local-supabase-query-plans.ps1` asserts exact results, member/outsider helper outcomes, a 100 ms local bound, fixture-row rollback, dead-tuple cleanup, retained-statistics refresh, and baseline equality. Plan-by-plan evidence and legitimate small-table sequential scans are recorded in `docs/runbooks/local-service-readiness-and-query-plans.md`.

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local-supabase-query-plans.ps1
git diff --check
git status --short
```

- Report lint as placeholder unless changed.

### Conditional-staging/mobile-web/human

- Migration apply/reset and policy tests in approved disposable environment only.
- Query plans before/after with representative row counts.
- Two-user CRUD/direct-ID matrix.
- If Docker/safe remote remains unavailable: `NOT RUN` and do not claim acceptance completion.
- Lint remains placeholder; browser/human UI tests are not database proof.

## Stop conditions/authorization limits

Stop before any remote apply, production connection, destructive DDL/DML, historical migration edit, credential access, unbounded backfill, or policy relaxation not explicitly approved. Stop if rollback requires data loss or safe two-user isolation cannot be created.

## Risks/follow-ups

- Policy tests using elevated roles can create false confidence.
- Cascades can delete family history; default to restriction until lifecycle intent is explicit.
- Small fixtures cannot justify speculative indexes; re-evaluate with safe representative volume.

## Definition of done

Met for the local slice: the rollback-safe plan harness and existing migrations/RLS/two-user matrices pass, no speculative index or production change remains, and unresolved hosted deployment stays a separate conditional gate.
