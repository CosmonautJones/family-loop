# OPORD 010 — Reminders and In-App Notifications

## Status
Planned as M5 after M2 and after any M3/M4 activity it surfaces; push delivery is excluded.

## Situation and evidence
Event Detail currently toggles transient reminder drafts and explicitly says push is not wired (`app/src/screens/EventDetailScreen.tsx:93-100`; `docs/architecture.md:20`). Notification list/read contracts and adapters exist (`app/src/services/api.ts:103-119`; `app/src/services/supabaseAdapter.ts:549-563`), but are not evidence of live behavior. M5 calls for persisted reminder preferences and useful in-app updates (`tasks/backlog.md:12`).

## Mission/objective
Persist a simple per-user event reminder preference and provide a truthful in-app notification list/read loop tied back to exact events, refreshed on visit and browser-tab resume.

## Dependencies
Depends on: OPORD-006, OPORD-007

Completed M1–M3; M4 only for media notifications; approved M5 mission; safe configured environment for live RLS evidence.

## Non-goals
Push/email/SMS delivery, the Web Notifications API, service workers, notification settings center, background jobs, digests, device tokens, quiet hours, or broad preference systems.

## Authorized territory (files/systems)
Reminder/notification service and Query seams, minimal Event Detail reminder UI, one in-app notification surface within existing navigation, tests, docs/evals. Existing migration definitions may be inspected only.

## Forbidden territory
Push infrastructure, OS permissions, new dependencies, remote scheduler/functions, schema/RLS deployment, auth/settings expansion, credentials, and unrelated navigation migration.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
State reminder timing in plain, concrete words (“Morning of event”), expose a 48x48-point on/off action with immediate confirmation, show unread status with text as well as color, and open the exact event with an obvious Back path. Use readable type and screen-reader state, respect reduced motion, and keep failure recovery visible.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O010-T1 | 1 | Data builder | Private / gpt-5.5 | reminder/notification service, queries, focused tests | Define the minimum persisted reminder preference; add exact-user/event Query ownership and scoped invalidation. | Refetch preserves preference; tests prove user/event isolation and configured errors never select fixtures. |
| O010-T2 | 2 | Mobile builder | Private / gpt-5.5 | Event Detail, notification surface, existing navigation | Replace transient reminder claims; render loading/empty/error/populated/read states and exact-event links. | Pending/error states retain intent; deleted event is honest; no copy implies push delivery. |
| O010-T3 | 3 | QA/reviewer | Sergeant / gpt-5.3-instant | tests, regression checklist, review log | Test visit/tab-resume refresh, read persistence, failure recovery and signed-out privacy; smoke at 320/390/430 CSS px. | Local suite and phone-browser smoke pass; live/Safari/Chrome/human evidence is reported honestly. |

## Acceptance criteria
- Reminder preference survives service refetch and is isolated by user/event.
- Notifications load chronologically, unread state persists after refetch, and event-linked items open the exact event.
- Errors do not clear state or substitute fixtures.
- No UI implies push delivery.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also record adapter/query isolation tests, a 390x844 reminder/list/read/deep-link smoke, and configured signed-out smoke; label lint as the repository placeholder.

### Conditional-staging/mobile-web/human
Run live RLS/two-user checks only with safe approval; iOS Safari/Android Chrome and human tests are currently NOT RUN. Notifications API and service-worker delivery remain deferred.

## Stop conditions/authorization limits
Stop before Notifications API, service-worker, push/device-token work, background services, remote jobs, migrations/policies, credentials, new packages, or a notification-settings center.

## Risks/follow-ups
Misleading delivery language, stale unread counts, deleted-event links, timezone ambiguity, and notification overload. Push delivery remains a separately scoped mission.

## Definition of done
The narrow persisted reminder and in-app read loop passes checks and phone smoke, docs/review log are updated, and live/push limitations are explicit.
