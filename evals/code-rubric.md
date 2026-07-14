# Code Rubric

## OPORD campaign planning gate

- [x] Exactly 15 sequential orders have unique filenames and an indexed dependency chain.
- [x] Every order identifies narrow file/system territory and RED authorization boundaries.
- [x] Required headings and engineering-domain coverage have portable executable checks.
- [x] Mock/schema/adapter presence is separated from live server or database proof.
- [ ] Runtime implementation — deferred to separately authorized OPORD executions.
- [ ] Substantive lint — repository command remains a placeholder.
- [ ] Live database, native, release, backup, and restore gates — not run here.

## M3 event-thread evidence

- Event message server state is Query-owned and keyed by event ID.
- Adapter contract tests cover isolation, validation, persistence/refetch, identity, and deterministic instant ordering.
- Send invalidation targets only the affected event; no fixture or Zustand message mirror exists.

## Scope control

- Did the implementation stay inside the mission?
- Were unrelated changes avoided?

## Maintainability

- Is the code easy to read?
- Are names clear?
- Are modules focused?

## Testability

- Can the core behavior be tested?
- Were tests added or updated where practical?

## Risk

- Any fragile assumptions?
- Any risky dependencies?
- Any hidden state?

## Agent accountability

- Did the agent explain what changed?
- Did it update the review log?
- Did it list follow-ups?

## Code verdict

PASS (M2) — The event slice uses the existing service and Query boundary with stable keys, scoped invalidation, same-ID retrieval, explicit failure states, and no durable event/RSVP mirror in Zustand. Root tests pass 12/12, app tests pass 6/6, TypeScript and harness pass, and phone smoke passed after fixing and regression-testing a hidden mounted Create screen. No dependency, schema, policy, environment, deployment, or Auth expansion was added. Advisory: Wave 1 was not independently runnable until the selector/caller boundary was repaired after Wave 2; per-wave runnable verification must be enforced in later missions.
