# OPORD 010 — Reminders and In-App Notifications

## Status
LOCAL COMPLETE / CONDITIONAL — recipient-scoped in-app updates and the per-user event reminder preference are implemented and proven against loopback Supabase. Push/email/SMS remain excluded; hosted and physical-device evidence is conditional.

## Situation and evidence
Dead transient reminder controls/state were removed because no reminder scheduling service exists. Commit `c612a75` adds privacy-safe database-generated per-recipient updates for event, RSVP, comment, and media activity. The current implementation reuses the existing `loopedin_reminder_drafts` table and self-user/event-member RLS for one fixed, truthful `Morning of event` preference; disabling deletes that user's row. Configured browser sessions proved separate unread counts, exact-event navigation, mark-all-read, preference reload persistence, and recoverable writes without claiming scheduled delivery.

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

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Reminder preference survives refetch and is user/event isolated | COMPLETE LOCALLY | Durable-local v7 reconstruction plus two authenticated loopback users on the same event; each saw only their row, relogin retained both, one user's idempotent disable left the other unchanged, and outsider direct-ID insert was denied. |
| Chronological notifications, persisted unread, exact-event links | COMPLETE LOCALLY | `c612a75`; recipient-count E2E and configured browser mark/read/navigation proof. |
| Errors preserve state and never substitute fixtures | COMPLETE LOCALLY | Query/error contracts plus a configured 390px outage/retry: failed disable kept confirmed On state and exact retry intent, then succeeded once local Kong returned. |
| No push implication | COMPLETE | Event Detail says this is an in-app preference and that push/email delivery are not active. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also run:

```powershell
.\scripts\test-local-supabase-reminders.ps1 -RunMarker family-browser-v1
.\scripts\test-local-supabase-reminder-browser.ps1 -RunMarker family-browser-v1 -WebUrl http://127.0.0.1:8090
.\scripts\verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

The browser harness expects an explicitly loopback-configured static export at the supplied URL. Substantive ESLint is required; no placeholder lint claim remains.

### Conditional-staging/mobile-web/human
Loopback RLS/two-user checks pass. Hosted RLS, iOS Safari/Android Chrome, assistive technology, and human tests are currently `NOT RUN`. Notifications API and service-worker delivery remain deferred.

## Stop conditions/authorization limits
Stop before Notifications API, service-worker, push/device-token work, background services, remote jobs, migrations/policies, credentials, new packages, or a notification-settings center.

## Risks/follow-ups
Misleading delivery language, stale unread counts, deleted-event links, timezone ambiguity, and notification overload. Push delivery remains a separately scoped mission.

## Definition of done
Met locally. The narrow persisted reminder and in-app read loop passes service, RLS, configured 390px failure/retry, reload/deep-link, focus, target-size, and no-overflow checks. Hosted/physical evidence and actual push/email delivery are not claimed.
