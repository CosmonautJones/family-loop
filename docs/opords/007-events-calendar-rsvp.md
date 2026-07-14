# OPORD 007 — Events, calendar, and RSVP

## Status

LOCAL COMPLETE / CONDITIONAL — durable event create/edit/cancel, chronology, exact-ID routing, and RSVP behavior are proven locally; DST/locale and physical/mobile-human gates remain open.

## Situation and evidence

- Home and Calendar read active-group events through Query; Create, same-ID Event Detail, and RSVP use the service boundary (`docs/architecture.md:17-29`; `evals/review-log.md:35-48`).
- Home makes the next event dominant and exposes later events by exact ID (`app/src/screens/HomeScreen.tsx:24-65`).
- Calendar presents month markers and an upcoming agenda with exact-event actions (`app/src/screens/CalendarScreen.tsx:17-60`).
- Default local mutations survive reload/server restart, and configured loopback Supabase mutations persist across isolated browser sessions and reloads.
- The configured browser journey created three trips, edited one, cancelled a throwaway plan, and recorded multi-user Going/Maybe RSVPs. Remote deployment remains unverified.
- Recurrence and external calendar sync remain explicit non-goals; edit/cancel are now implemented.

## Mission/objective

Verify and surgically harden the existing phone event loop so chronological event discovery, creation, exact-event navigation, and one-thumb RSVP remain truthful across loading, empty, error, and refetch states.

## Dependencies

Depends on: OPORD-004, OPORD-006

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

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.

Show date, time, place, and current RSVP in plain language; keep primary RSVP options at least 48x48 CSS pixels, persistent, and mutually understandable; confirm state without relying on color. Avoid dense calendar-only discovery—every marked date must have a readable agenda/event route. Announce state to screen readers, respect reduced motion, and offer obvious error recovery.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O007-T1 | 1 | Event-loop tester | Private / gpt-5.3-instant | Local mock app and event/RSVP tests | Reproduce Home → exact detail → RSVP → Back and Create → exact detail → Home/Calendar at 390x844; cover ordering, ties, IDs, empty, and unknown states. | Reproduction evidence is exact-ID and distinguishes process-local behavior from persistence. |
| O007-T2 | 1 | Accessibility/product reviewer | Private / gpt-5.3-instant | Home, Calendar, Create, Event Detail (read-only), review record | Audit copy, targets, pending/error recovery, time-zone labels, and calendar/agenda correspondence. | Each defect is evidenced; passing behavior is not proposed for refactor. |
| O007-T3 | 2 | Implementer | Private / gpt-5.3-instant | Separately approved event/RSVP manifest and focused tests | Apply only approved corrections and rerun event, thread, auth, and configured-signed-out regressions. | All local criteria pass with a narrow manifest-bound diff. |
| O007-T4 | 3 | Staging verifier | Private / gpt-5.3-instant | Approved safe configured environment only | Under separate authorization, verify two-user persistence and group isolation; otherwise record `NOT RUN`. | No live claim without transcript evidence and no remote setup is inferred. |

## Acceptance criteria

- Home hero is the earliest upcoming valid event; all later upcoming events remain reachable in chronological order with unique stable IDs.
- Calendar markers/agenda derive from the same records and open the exact event.
- Create succeeds once, clears/retains draft according to existing contract, and opens the created ID; failures remain visible without phantom events.
- RSVP pending prevents duplicate submission; successful refetch shows the selected state/count; failure is recoverable and event-scoped.
- Empty, loading, error, not-found, configured signed-out, and group failure states never substitute fixtures.
- Existing Event Detail thread/logistics behavior remains available and unchanged except where a reproduced shared-boundary defect requires approval.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Earliest upcoming hero and chronological unique IDs | COMPLETE | Selector/tests and configured two-upcoming final state; active-family race fixed in `89d8720`. |
| Calendar and Home share exact records/IDs | COMPLETE | Browser create/edit/reload and route/Back proof. |
| Create once; draft failure honesty; exact created ID | COMPLETE | Mutation tests and browser-created trips. |
| RSVP duplicate prevention/refetch/recovery/event scope | COMPLETE | Query tests and multi-user browser RSVPs. |
| Explicit empty/loading/error/not-found/auth/group states | COMPLETE | Source contracts and configured/no-family/direct-route browser proof. |
| Thread/logistics regression | COMPLETE | Six isolated comments persisted; full automated/browser gate. |

DST-boundary/locale testing, physical iOS/Android, and moderated-human use are `NOT RUN`.

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Report lint as placeholder unless changed and review the exact manifest.
- Mock phone smoke at 390x844, including exact IDs, calendar discovery, RSVP mutation/refetch, zero/unknown states where safely injectable.
- Configured signed-out regression at 390x844 with non-secret placeholder configuration and no submitted credentials.

### Conditional-staging/mobile-web/human

- Live event/RSVP two-user persistence: `NOT RUN — safe environment unavailable` unless separately authorized.
- iOS Safari/Android Chrome and older-adult usability tests: record `NOT RUN` separately when unavailable. Verify browser-local timezone, locale, date-input, and DST-boundary rendering.

## Stop conditions/authorization limits

Stop before event editing/deletion, recurrence, invites, sync, schema/RLS, remote mutation, dependencies, auth expansion, or any file outside the approved manifest. A live-environment gap is a documented limitation, not permission to configure one.

## Risks/follow-ups

- Timezones and invalid timestamps can produce misleading order/date labels.
- Structural tests do not prove phone reachability or comprehension.
- Process-local mock behavior cannot support restart-durability claims.
- Live group isolation remains unproven until safe two-user RLS tests run.

## Definition of done

All authorized acceptance criteria pass with automated and phone-browser evidence; Safari/Chrome/human/live results are honestly marked; timezone and DST behavior is evidenced; no adjacent feature or remote action is absorbed; architecture, regression checklist, and review log are updated; risks/follow-ups remain explicit and the diff is narrow.
