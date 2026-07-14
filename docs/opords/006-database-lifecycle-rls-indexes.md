# OPORD 006 — Database lifecycle, RLS, and indexes

## Status

RED PENDING APPROVAL — static review may proceed; migration, RLS, index, and remote operations require a separate authorized database mission.

## Situation and evidence

- The configured adapter already references group-scoped events, RSVPs, event messages, media, and notifications (`docs/architecture.md:50-56`).
- Repository migration/RLS/bucket definitions are intended infrastructure, not live proof; Docker and verified remote deployment are absent (`docs/architecture.md:57-61`).
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

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Report lint as placeholder unless changed.

### Conditional-staging/native/human

- Migration apply/reset and policy tests in approved disposable environment only.
- Query plans before/after with representative row counts.
- Two-user CRUD/direct-ID matrix.
- If Docker/safe remote remains unavailable: `NOT RUN` and do not claim acceptance completion.
- Lint remains placeholder; native/human UI tests are not database proof.

## Stop conditions/authorization limits

Stop before any remote apply, production connection, destructive DDL/DML, historical migration edit, credential access, unbounded backfill, or policy relaxation not explicitly approved. Stop if rollback requires data loss or safe two-user isolation cannot be created.

## Risks/follow-ups

- Policy tests using elevated roles can create false confidence.
- Cascades can delete family history; default to restriction until lifecycle intent is explicit.
- Small fixtures cannot justify speculative indexes; re-evaluate with safe representative volume.

## Definition of done

Only after GREEN execution: additive migration and tests pass in a disposable environment, RLS/two-user and query-plan evidence is recorded, no production/destructive action occurred, architecture/review log are updated, and unresolved live deployment remains a separate order.
