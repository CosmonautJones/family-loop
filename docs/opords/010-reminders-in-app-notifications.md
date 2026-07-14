# OPORD 010 — Reminders and in-app notifications

## Status
Planned as M5 after M2 and after any M3/M4 activity it surfaces; push delivery is excluded.

## Situation and evidence
Event Detail currently toggles transient reminder drafts and explicitly says push is not wired (`app/src/screens/EventDetailScreen.tsx:93-100`; `docs/architecture.md:20`). Notification list/read contracts and adapters exist (`app/src/services/api.ts:103-119`; `app/src/services/supabaseAdapter.ts:549-563`), but are not evidence of live behavior. M5 calls for persisted reminder preferences and useful in-app updates (`tasks/backlog.md:12`).

## Mission/objective
Persist a simple per-user event reminder preference and provide a truthful in-app notification list/read loop tied back to exact events.

## Dependencies
Completed M1–M3; M4 only for media notifications; approved M5 mission; safe configured environment for live RLS evidence.

## Non-goals
Push/email/SMS delivery, notification settings center, background jobs, digests, device tokens, quiet hours, or broad preference systems.

## Authorized territory (files/systems)
Reminder/notification service and Query seams, minimal Event Detail reminder UI, one in-app notification surface within existing navigation, tests, docs/evals. Existing migration definitions may be inspected only.

## Forbidden territory
Push infrastructure, OS permissions, new dependencies, remote scheduler/functions, schema/RLS deployment, auth/settings expansion, credentials, and unrelated navigation migration.

## Older-adult usability guardrail
State reminder timing in plain, concrete words (“Morning of event”), expose a 48x48-point on/off action with immediate confirmation, show unread status with text as well as color, and open the exact event with an obvious Back path. Use readable type and screen-reader state, respect reduced motion, and keep failure recovery visible.

## Execution
1. Define the minimum persisted reminder preference and notification read model without a general settings framework.
2. Add exact-user/event Query ownership and scoped invalidation; remove durable reminder claims from Zustand.
3. Implement explicit loading/empty/error/populated notifications and mark-read behavior.
4. Link event notifications to exact Event Detail; unknown/deleted events show an honest state.
5. Test user isolation, read persistence/refetch, failure recovery, and no fixture fallback.
6. Phone-smoke reminder and notification flows; record push as out of scope.

## Acceptance criteria
- Reminder preference survives service refetch and is isolated by user/event.
- Notifications load chronologically, unread state persists after refetch, and event-linked items open the exact event.
- Errors do not clear state or substitute fixtures.
- No UI implies push delivery.

## Validation commands/evidence
### Always-local
Run root/app tests, TypeScript, placeholder lint labeled, harness, diff check, adapter/query isolation tests, 390x844 reminder/list/read/deep-link smoke, and configured signed-out smoke.

### Conditional-staging/native/human
Run live RLS/two-user checks only with safe approval; native/human tests are currently NOT RUN.

## Stop conditions/authorization limits
Stop before push/device-token work, background services, remote jobs, migrations/policies, credentials, new packages, or a notification-settings center.

## Risks/follow-ups
Misleading delivery language, stale unread counts, deleted-event links, timezone ambiguity, and notification overload. Push delivery remains a separately scoped mission.

## Definition of done
The narrow persisted reminder and in-app read loop passes checks and phone smoke, docs/review log are updated, and live/push limitations are explicit.
