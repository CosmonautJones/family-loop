# FAMILY-LOOP-OPORD-006 — Database lifecycle, RLS, and indexes

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

1. Trace the target adapter queries to tables, foreign keys, uniqueness rules, order/filter columns, and current policies/indexes.
2. Write a lifecycle/policy matrix for create/read/update/delete, parent deletion, membership removal, cross-group access, and duplicate submission.
3. Capture query-plan evidence on representative safe data before proposing indexes.
4. Obtain explicit GREEN approval for exact additive SQL and test environment.
5. Add a new forward migration; never edit applied history. Add focused policy/integrity tests before remote use.
6. Apply only to the disposable approved environment; exercise two-user and transaction/error cases; record plans and results.
7. Prepare a forward-fix/rollback note without executing destructive rollback.

## Acceptance criteria

- Foreign keys and uniqueness enforce the approved lifecycle without orphaning or cross-group attachment.
- RLS denies unauthenticated and nonmember direct-ID access and permits only documented member actions.
- Two-user tests cover same-group and different-group cases for every changed policy.
- Each added index maps to a real filter/order/join and improves or protects an evidenced plan; redundant indexes are rejected.
- Migration applies cleanly from the supported baseline and does not modify historical migrations.

## Validation commands/evidence

### Always-local

- Standard repository checks and diff/status review.

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
