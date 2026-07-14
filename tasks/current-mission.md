# Current Mission

Mission ID: `FAMILY-LOOP-DATA-003`

Status: In progress — Wave 1.

## Objective

Make the Event Detail thread a truthful, event-scoped, Query-owned conversation: authenticated members can read chronologically ordered messages and send a nonblank message; a successful send appears after invalidation/refetch, while loading, empty, error, pending, and send-failure states remain explicit.

## Authorized manifest

- `app/src/services/api.ts`
- `app/src/services/mockAdapter.ts`
- `app/src/services/mockData.ts`
- `app/src/services/supabaseAdapter.ts`
- `app/src/app/queries.ts`
- `app/src/app/selectors.ts`
- `app/src/types/domain.ts`
- `app/src/features/events/**`
- `app/src/features/thread/**`
- `app/src/screens/EventDetailScreen.tsx`
- `tests/app-scaffold.test.js`
- `tasks/current-mission.md`
- `tasks/backlog.md`
- `tasks/completed.md`
- `docs/architecture.md`
- `evals/review-log.md`
- `evals/code-rubric.md`
- `evals/ux-rubric.md`
- `evals/regression-checklist.md`

No other file may be edited. Commits stage only explicit manifest paths; never `git add -A`.

## Non-goals

- Direct messages, group-wide chat, realtime subscriptions, reactions, mentions, attachments, moderation, or message-generated notifications.
- Schema, migration, RLS/policy, bucket, deployment, credential, or remote-data mutation work.
- New dependencies or auth expansion.
- Fixture fallback for the migrated Event Detail thread.
- Media, reminders, memories, event editing/deletion, or unrelated visual redesign.

## Ordered execution

### Wave 1 — Runnable thread contract

1. Add stable event-message Query keys, an event-scoped message query, and a send mutation that invalidates/refetches that event's message list.
2. Make the mock adapter reject whitespace-only sends, derive the sender from its session identity, persist sent messages, isolate messages by event ID, and return parsed-instant chronological results with a stable ID tie-break.
3. Inspect Supabase parity and make only non-breaking corrections needed for trimming/rejecting blank bodies, authenticated self identity, event scoping, and stable chronological ordering.
4. Add executable adapter tests proving event A is isolated from event B, whitespace is rejected, send persists across refetch, author/self identity is correct, and mixed-timezone ordering uses instants with a stable tie-break.
5. Include the minimum types/query integration required for `tsc` and tests to remain runnable.

Wave 1 acceptance: the service and Query boundary independently read and send event-scoped messages with deterministic ordering and identity, and all relevant checks pass. Commit Wave 1 before Wave 2.

### Wave 2 — Runnable Event Detail thread

1. Replace the fixture-derived thread on Event Detail with Query data; render explicit loading, error, empty, and populated states.
2. Add a thumb-friendly composer. Disable submit while pending or when the trimmed draft is empty.
3. On failure, show a visible error and retain the draft. On success, clear the draft and invalidate/refetch the selected event's messages.
4. Preserve RSVP and existing Event Detail behavior; do not add a fixture thread fallback.
5. Run the mock phone smoke at 390x844: event A send becomes visible, remains visible after navigation/refetch, and stays isolated from event B. Run the configured signed-out regression.
6. Update architecture, backlog/completed mission records, rubrics/checklist, and review log only after evidence exists, recording exact commit SHAs and honest `NOT RUN` items.

Wave 2 acceptance: Event Detail provides a truthful mobile thread read/send loop with pending and recoverable failure behavior, and the complete verification suite passes. Commit Wave 2 as a runnable boundary.

## Validation commands

- Root: `npm test`
- App: `npm test`
- TypeScript: `npx tsc --noEmit`
- Harness: `powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1`
- Lint: `npm run lint` (report honestly if still the repository placeholder)
- Diff/status: `git diff --check`, `git status --short`, and explicit manifest review before each commit
- Phone smoke: Expo web at 390x844 in mock mode; send on event A, navigate/refetch, verify event B isolation
- Configured signed-out regression: configured build remains behind its existing signed-out gate
- Live RLS/two-user: run only if a safe configured environment already exists; otherwise record `NOT RUN — safe environment unavailable`

## Stop conditions and authorization limits

Stop and escalate before any RED action: editing outside the manifest, changing schema/RLS/remote state, adding a dependency, expanding auth, breaking the public service contract, destructive Git, secrets, push/PR, or irreversible work. For AMBER ambiguity in send invalidation or error UX, choose the simplest implementation and log the rationale.

## Known risks

- Structural tests may not prove rendered phone behavior; smoke evidence must be reported separately.
- Supabase parity can be inspected locally, but live RLS/two-user behavior cannot be claimed without a safe configured environment.
- Message timestamps can represent identical instants with different offsets; ordering must use parsed instants and a stable ID tie-break.
- The existing lint command may remain a placeholder and must not be reported as substantive lint coverage.
