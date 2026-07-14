# OPORD 008 — Event conversation realtime

## Status
PARTIAL — durable, event-isolated multi-user comments are implemented and locally proven; realtime subscriptions, reconnect convergence, and subscription cleanup are not implemented or tested.

## Situation and evidence
Event-keyed Query reads/sends and exact-key refetch are durable in local and Supabase modes. Six comments across three events/users remained isolated through reload in the configured scenario. The migration publication entry exists, but the client still has no realtime subscription/reconnect lifecycle; publication text is not proof of realtime behavior.

## Mission/objective
Make an open Event Detail thread receive authorized inserts/updates without manual navigation while preserving chronological, duplicate-free, event-scoped Query state and recoverable connection behavior.

## Dependencies
Depends on: OPORD-007

Completed M1–M3; an approved current mission; a safe configured two-user Supabase environment for live acceptance. Inference: realtime should update the existing event-message Query cache or invalidate its exact key.

## Non-goals
Presence, typing indicators, reactions, mentions, DMs, moderation, push notifications, message editing/deletion, or broad realtime for unrelated tables.

## Authorized territory (files/systems)
`app/src/app/queries.ts`; `app/src/services/api.ts`; `app/src/services/supabaseAdapter.ts`; `app/src/services/mockAdapter.ts` only if deterministic parity is needed; Event Detail/thread files; focused tests; architecture, mission, checklist, and review-log records. Safe read-only Supabase inspection only when separately approved.

## Forbidden territory
Auth expansion, schema/RLS edits, migration deployment, credentials, new dependencies, remote mutation, destructive Git, push/PR, notifications, media, and memories.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
New messages must appear without stealing focus, moving the composer unexpectedly, or requiring refresh controls smaller than 48x48 points; reconnect/error copy must be plain, persistent, and readable at large text sizes. Announce new/error state without overwhelming screen readers, respect reduced motion, and keep recovery obvious.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O008-T1 | 1 | Realtime contract designer | Private / gpt-5.3-instant | Service/query contracts and focused tests | Specify exact-event subscription lifecycle, duplicate policy, cleanup, reconnect, and parsed-instant ordering. | Contract proves isolation, deterministic reconciliation, and cleanup without runtime UI dependency. |
| O008-T2 | 2 | Realtime implementer | Private / gpt-5.3-instant | Approved query/adapter/thread files | Implement open-event-only subscription, stable-ID reconciliation, refetch fallback, and local-send deduplication. | Mock tests and signed-out/thread regressions pass without fixture fallback. |
| O008-T3 | 3 | Staging verifier | Private / gpt-5.3-instant | Approved safe two-user Supabase environment | Prove event isolation, reconnect convergence, and cleanup; otherwise record `NOT RUN`. | Timestamped two-user evidence exists and no publication/RLS/deploy mutation occurs. |

## Acceptance criteria
- Event A changes appear once on Event A and never Event B.
- Reconnect converges to server history; subscription cleanup prevents cross-event/session leaks.
- Sending, pending, draft retention, RSVP, and local thread failures retain M3 behavior.
- Configured failures never render fixtures.
- Live two-user claims are made only from safe recorded evidence; otherwise acceptance remains blocked, not inferred.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Event A changes appear once only on Event A | COMPLETE on refetch/reload | Six multi-user comments and query isolation tests; realtime arrival was not tested. |
| Reconnect convergence and cleanup | NOT IMPLEMENTED / NOT RUN | No client subscription lifecycle exists. |
| Send/pending/draft/RSVP failure behavior | COMPLETE LOCALLY | M3 fix loops and current root/app regressions. |
| Configured failures never render fixtures | COMPLETE | Adopted service/session boundary and configured error gates. |
| Live claims require recorded evidence | COMPLETE | Local loopback evidence is labeled local; hosted/realtime claims remain open. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Record lint as placeholder per `app/package.json:11`; run focused subscription tests named by the mission, 390x844 mock smoke, and configured signed-out smoke.

### Conditional-staging/mobile-web/human
Run an approved live two-user transcript only in a safe staging environment. Mobile-web browser/human tests: currently NOT RUN.

## Stop conditions/authorization limits
Stop before credentials, remote deploy, publication/RLS/migration changes, new packages, destructive operations, or any need to broaden beyond event messages. Stop if a safe two-user environment is unavailable; report live acceptance as NOT RUN.

## Risks/follow-ups
Duplicate delivery, stale subscriptions after navigation/session changes, reconnect gaps, out-of-order timestamps, and battery/network cost. Presence and richer chat remain separate follow-ups.

## Definition of done
All acceptance criteria and declared checks pass, live evidence is honest, diff is narrow, review log is updated, and risks/NOT RUN items are recorded.
