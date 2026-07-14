# OPORD 008 — Event conversation realtime

## Status
Planned; separately authorize after the completed M3 thread foundation. Remote Supabase and native behavior remain unverified.

## Situation and evidence
M3 already provides event-keyed Query reads/sends and exact-key refetch (`docs/architecture.md:19,32`; `evals/review-log.md:3-13`). The migration declares messages in the realtime publication (`supabase/migrations/20260705214111_loopedin_initial_infra.sql:523`), but repository definitions are not live proof (`docs/architecture.md:41`). Realtime subscriptions and presence were explicit M3 non-goals (`tasks/current-mission.md`).

## Mission/objective
Make an open Event Detail thread receive authorized inserts/updates without manual navigation while preserving chronological, duplicate-free, event-scoped Query state and recoverable connection behavior.

## Dependencies
Completed M1–M3; an approved current mission; a safe configured two-user Supabase environment for live acceptance. Inference: realtime should update the existing event-message Query cache or invalidate its exact key.

## Non-goals
Presence, typing indicators, reactions, mentions, DMs, moderation, push notifications, message editing/deletion, or broad realtime for unrelated tables.

## Authorized territory (files/systems)
`app/src/app/queries.ts`; `app/src/services/api.ts`; `app/src/services/supabaseAdapter.ts`; `app/src/services/mockAdapter.ts` only if deterministic parity is needed; Event Detail/thread files; focused tests; architecture, mission, checklist, and review-log records. Safe read-only Supabase inspection only when separately approved.

## Forbidden territory
Auth expansion, schema/RLS edits, migration deployment, credentials, new dependencies, remote mutation, destructive Git, push/PR, notifications, media, and memories.

## Older-adult usability guardrail
New messages must appear without stealing focus, moving the composer unexpectedly, or requiring refresh controls smaller than 48x48 points; reconnect/error copy must be plain, persistent, and readable at large text sizes. Announce new/error state without overwhelming screen readers, respect reduced motion, and keep recovery obvious.

## Execution
1. Specify one event-scoped subscription lifecycle and duplicate policy against the existing query key.
2. Add a service/query seam that subscribes only while an exact event is open and cleans up on event/session change.
3. Reconcile incoming rows by stable ID, then sort by parsed instant plus ID tie-break; refetch on ambiguous payloads or reconnect.
4. Keep send behavior authoritative and prevent local-send/realtime double insertion.
5. Add contract tests, mock phone smoke, configured signed-out regression, then safe two-user live proof if available.
6. Update architecture and review evidence only after checks pass.

## Acceptance criteria
- Event A changes appear once on Event A and never Event B.
- Reconnect converges to server history; subscription cleanup prevents cross-event/session leaks.
- Sending, pending, draft retention, RSVP, and local thread failures retain M3 behavior.
- Configured failures never render fixtures.
- Live two-user claims are made only from safe recorded evidence; otherwise acceptance remains blocked, not inferred.

## Validation commands/evidence
### Always-local
Run root `npm test`; in `app`, run `npm test`, `npx tsc --noEmit`, and `npm run lint` (record as placeholder per `app/package.json:11`); run `scripts/check-harness.ps1`, `git diff --check`, focused subscription tests, 390x844 mock smoke, and configured signed-out smoke.

### Conditional-staging/native/human
Run an approved live two-user transcript only in a safe staging environment. Native/human tests: currently NOT RUN.

## Stop conditions/authorization limits
Stop before credentials, remote deploy, publication/RLS/migration changes, new packages, destructive operations, or any need to broaden beyond event messages. Stop if a safe two-user environment is unavailable; report live acceptance as NOT RUN.

## Risks/follow-ups
Duplicate delivery, stale subscriptions after navigation/session changes, reconnect gaps, out-of-order timestamps, and battery/network cost. Presence and richer chat remain separate follow-ups.

## Definition of done
All acceptance criteria and declared checks pass, live evidence is honest, diff is narrow, review log is updated, and risks/NOT RUN items are recorded.
