# Code Rubric

## Wave 0 durable local service

- [x] Default/unconfigured mode uses the durable AsyncStorage adapter; `memory` is an explicit isolated-test mode.
- [x] Only `EXPO_PUBLIC_DATA_MODE=supabase` selects Supabase, and missing configuration fails visibly without local fallback.
- [x] A version-1 envelope persists service data and rejects malformed or unsupported payloads without silent reseeding.
- [x] Reset/reseed is an explicit test/development service method, not a production UI behavior.
- [x] Automated contracts cover reconstruction durability, event/RSVP/message/media mutations, event isolation, seed shape, explicit reseed, storage failures, and configured-backend honesty.
- [x] Jones Family seed has five stable members, three future trips, one completed trip, and consistent related records relative to 2026-07-13.
- [x] Independent Wave 0 gate — AMBER / PROCEED-WARN with zero blockers: root 27/27, app 16/16, TypeScript, harness, web export, and diff check pass.
- [ ] Substantive lint — command exits 0 but remains a placeholder; WARN.
- [ ] Actual browser hard-reload — NOT RUN; adapter reconstruction is automated evidence and web export proves bundling only.
- [ ] Remote database durability, multi-user synchronization, RLS, private object storage, and Unsplash attribution/domain treatment — not proven by Wave 0.

## OPORD campaign planning gate

- [x] Exactly 17 orders have unique filenames and a machine-checked acyclic dependency graph.
- [x] Every order has at least three concrete, globally unique task rows with ownership and acceptance.
- [x] Every order identifies narrow file/system territory and RED authorization boundaries.
- [x] Required headings and engineering-domain coverage have portable executable checks.
- [x] Mock/schema/adapter presence is separated from live server or database proof.
- [ ] Runtime implementation — deferred to separately authorized OPORD executions.
- [ ] Substantive lint — repository command remains a placeholder.
- [ ] Live database, phone-browser/human, release, backup, and restore gates — not run here.

## Responsive-web campaign correction

- [x] Exactly 17 OPORD documents and 60 task rows remain.
- [x] OPORD 014 and 016 use their mobile-web testing and web-release filenames.
- [x] Source documents define phone browsers as primary and desktop web as secondary.
- [x] Native apps, EAS, and app stores are future non-goals rather than campaign gates.

## M3 event-thread evidence

- Event message server state is Query-owned and keyed by event ID.
- Adapter contract tests cover isolation, validation, persistence/refetch, identity, and deterministic instant ordering.
- Send invalidation targets only the affected event; no fixture or Zustand message mirror exists.

## Scope control

## Wave 2 trip creation and RSVP

- [x] Editable title, date, time, location, and optional notes replace preset cards.
- [x] Validation rejects blank, malformed, and impossible required values before mutation.
- [x] Pending/error/retry behavior prevents duplicate writes and retains fields after failure.
- [x] Success uses the returned exact ID and invalidates the active family event list.
- [x] Durable reconstruction covers the trip and RSVP plus derived Home, Calendar, and Family visibility.
- [x] Untouched RSVP is `No response`, not a fabricated Maybe.
- [x] Root tests 37/37 and app-local tests 26/26, TypeScript, harness, web export, diff, and scoped browser checks pass.
- [x] Independent Wave 2 gate — AMBER / PROCEED-WARN with zero blockers.
- [ ] Substantive lint and remote Supabase/RLS — unproven.

## Wave 3 event comments and browser photos

- [x] Comments and photo lists are exact-event service reads with honest loading, empty, error, and retry states.
- [x] Comment send trims/rejects blank input, prevents duplicate submission, retains the draft on failure, and clears only after success/refetch.
- [x] URL photos require a valid HTTP(S) image URL, caption, alt text, source URL, and photographer credit.
- [x] Browser file selection persists a validated local image record; unsupported and oversized files fail before durable storage, and failed photo input remains retryable.
- [x] Photo deletion is pending-safe, event-isolated, durable across reload, and does not imply remote object deletion.
- [x] Root tests 39/39 and app-local tests 28/28, TypeScript, harness, web export, diff, and exact 320/390/430/1280 browser checks pass.
- [x] Independent Wave 3 Run 2 — AMBER / PROCEED-WARN with zero blockers after Run 1 fixes `630ad85` and `e242761`.
- [x] Records correction captures each command's own TAP summary; root and app counts must never be mirrored across suites.
- [ ] Substantive lint, live Supabase/RLS/private storage/signed access, real-device Safari/Chrome, and multi-user behavior — unverified.

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
