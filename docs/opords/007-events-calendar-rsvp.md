# FAMILY-LOOP-OPORD-007 — Events, calendar, and RSVP

## Status

PLANNED — M2 foundations exist; this order is limited to verified core-loop hardening and does not authorize adjacent features.

## Situation and evidence

- Home and Calendar read active-group events through Query; Create, same-ID Event Detail, and RSVP use the service boundary (`docs/architecture.md:17-29`; `evals/review-log.md:35-48`).
- Home makes the next event dominant and exposes later events by exact ID (`app/src/screens/HomeScreen.tsx:24-65`).
- Calendar presents month markers and an upcoming agenda with exact-event actions (`app/src/screens/CalendarScreen.tsx:17-60`).
- Mock mutation/refetch works only for the life of the process; a hard reload resets it (`docs/architecture.md:24-29`; `evals/review-log.md:42-46`).
- Live Supabase event/RSVP CRUD is `NOT RUN — ENV unavailable`; remote deployment remains unverified (`docs/architecture.md:57-61`).
- Recurrence, invitations, external sync, editing/deletion, and navigation migration are outside the existing M2 boundary (`tasks/backlog.md:7-15`; `docs/anti-goals.md:3-14`).

## Mission/objective

Verify and surgically harden the existing phone event loop so chronological event discovery, creation, exact-event navigation, and one-thumb RSVP remain truthful across loading, empty, error, and refetch states.

## Dependencies

- M1 configured session gate and M2 Query/service event boundary remain unchanged.
- OPORD-001 IA and OPORD-002 accessibility acceptance rules.
- For live persistence claims only: OPORD-005/006 safe environment and RLS readiness.

## Non-goals

- Event edit/delete, recurrence, invitations, external calendar sync, reminders, notifications, media, memories, location services, or new navigation/dependencies.
- Auth, schema/RLS, remote deployment, credentials, or destructive data work.

## Authorized territory (files/systems)

- Audit/testing first: existing event/RSVP service/query/selectors, Home, Calendar, Create, Event Detail, focused tests, and mission/eval docs.
- Runtime edits only under a separately approved exact manifest and only for reproduced acceptance failures.
- Local mock/test and phone preview; approved non-mutating configured checks if separately supplied.

## Forbidden territory

- Auth, billing, settings, teams, notifications, dependencies, deployment, environment files/secrets, schema/migrations/RLS, remote writes, and unrelated redesign.

## Older-adult usability guardrail

Show date, time, place, and current RSVP in plain language; keep primary RSVP options at least 48x48 points, persistent, and mutually understandable; confirm state without relying on color. Avoid dense calendar-only discovery—every marked date must have a readable agenda/event route. Announce state to screen readers, respect reduced motion, and offer obvious error recovery.

## Execution

1. Reproduce the complete mock route at 390x844: Home next event → exact detail → RSVP change → Back; Create → exact created detail → Home/Calendar discovery.
2. Add/confirm executable cases for parsed-instant chronological ordering, stable ties, unique IDs, zero events, unknown ID, create/refetch, and event-scoped RSVP.
3. Audit phone copy, touch targets, pending/error recovery, date/timezone labels, and calendar-to-agenda correspondence.
4. Log failures with evidence. Obtain exact implementation authorization; do not refactor passing behavior.
5. Apply the smallest corrections and rerun event/thread/auth regressions.
6. If a safe configured environment exists under separate authorization, test persistence and group isolation; otherwise retain `NOT RUN`.

## Acceptance criteria

- Home hero is the earliest upcoming valid event; all later upcoming events remain reachable in chronological order with unique stable IDs.
- Calendar markers/agenda derive from the same records and open the exact event.
- Create succeeds once, clears/retains draft according to existing contract, and opens the created ID; failures remain visible without phantom events.
- RSVP pending prevents duplicate submission; successful refetch shows the selected state/count; failure is recoverable and event-scoped.
- Empty, loading, error, not-found, configured signed-out, and group failure states never substitute fixtures.
- Existing Event Detail thread/logistics behavior remains available and unchanged except where a reproduced shared-boundary defect requires approval.

## Validation commands/evidence

### Always-local

- `npm test`; `cd app; npm test`; `cd app; npx tsc --noEmit`; harness; placeholder-qualified lint; `git diff --check` and manifest review.
- Mock phone smoke at 390x844, including exact IDs, calendar discovery, RSVP mutation/refetch, zero/unknown states where safely injectable.
- Configured signed-out regression at 390x844 with non-secret placeholder configuration and no submitted credentials.

### Conditional-staging/native/human

- Live event/RSVP two-user persistence: `NOT RUN — safe environment unavailable` unless separately authorized.
- iOS/Android native and older-adult usability tests: record `NOT RUN` separately when unavailable.

## Stop conditions/authorization limits

Stop before event editing/deletion, recurrence, invites, sync, schema/RLS, remote mutation, dependencies, auth expansion, or any file outside the approved manifest. A live-environment gap is a documented limitation, not permission to configure one.

## Risks/follow-ups

- Timezones and invalid timestamps can produce misleading order/date labels.
- Structural tests do not prove phone reachability or comprehension.
- Process-local mock behavior cannot support restart-durability claims.
- Live group isolation remains unproven until safe two-user RLS tests run.

## Definition of done

All authorized acceptance criteria pass with automated and phone evidence; native/human/live results are honestly marked; no adjacent feature or remote action is absorbed; architecture, regression checklist, and review log are updated; risks/follow-ups remain explicit and the diff is narrow.
