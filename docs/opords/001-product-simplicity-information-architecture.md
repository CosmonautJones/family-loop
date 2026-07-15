# OPORD 001 — Product simplicity and information architecture

## Status

LOCAL COMPLETE / CONDITIONAL — the event-centered mobile-web IA is implemented and browser-proven; first-time and moderated-human comprehension remain untested.

## Situation and evidence

- LoopedIn's wedge is one mobile-web event page joining logistics, RSVP, discussion, and memories (`docs/vision.md:3-15`; `docs/core-loop.md:18-19`).
- The shell currently presents five tabs and a separate Event Detail surface (`app/src/navigation/useAppShellState.ts:3-27`; `app/src/navigation/AppShell.tsx:47-52`).
- Home correctly leads with the next event and offers exact-event entry (`app/src/screens/HomeScreen.tsx:24-39`), while Calendar repeats event discovery (`app/src/screens/CalendarScreen.tsx:17-60`).
- Product guidance rejects generic dashboards and features unrelated to plan, attend, discuss, or remember (`docs/taste-bar.md:23-29`; `docs/anti-goals.md:17-22`).
- The five labeled tabs now expose implemented Home, Calendar, Create, Memories, and Family surfaces. Exact event IDs survive Back, deep links, and reload in configured Chrome; the full first-time comprehension claim still requires a participant walkthrough.

## Mission/objective

Produce and implement the smallest mobile information architecture that lets a user identify the next event, open its single source of truth, create a plan, and reach the shared calendar without competing secondary destinations.

## Dependencies

Depends on: None

- M1-M3 session, event/RSVP, and thread foundations remain intact (`docs/architecture.md:31-41`).
- Approved wireflow or written IA decision based on current phone behavior.
- OPORD-002 accessibility rules inform labels, order, and touch targets.

## Non-goals

- A new navigation library, desktop IA, settings, notifications, billing, public social, or unrelated visual redesign.
- Implementing Memories, Groups, invitations, media, or reminders.
- Renaming the product or changing the event-centered wedge.

## Authorized territory (files/systems)

- Planning/evidence: `docs/vision.md`, `docs/core-loop.md`, `docs/taste-bar.md`, `docs/architecture.md`, relevant `evals/**`, and mission records.
- For a separately approved implementation mission only: `app/src/navigation/AppShell.tsx`, `app/src/navigation/useAppShellState.ts`, directly affected screen entry actions, and focused tests.
- Local mock/test and local Expo preview only.

## Forbidden territory

- Auth, billing, settings, teams, notifications, dependencies, deployment configuration, schema/RLS, credentials, and remote data.
- Broad component/style refactors or navigation-library migration.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.

Keep no more than four primary choices visible at once where practical; use concrete nouns and verbs, persistent labels (not icon-only controls), predictable Back behavior, readable type, and at least 48x48 CSS-pixel primary targets. Verify the core route without relying on gesture memory, hover, or color alone. Preserve screen-reader order, reduced-motion behavior, and a plain recovery route.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O001-T1 | 1 | Product analyst | Private / gpt-5.3-instant | `docs/vision.md`, `docs/core-loop.md`, current navigation (read-only), IA evidence | Record current Home, Calendar, Create, Event Detail, RSVP, and thread routes at 390x844; distinguish observed issues from inference. | Evidence includes exact routes, duplicate/premature destinations, and no runtime edits. |
| O001-T2 | 1 | Product designer | Private / gpt-5.3-instant | OPORD/mission IA documentation only | Produce one minimal hierarchy and before/after route table preserving exact-event identity and clear Back behavior. | Proposal keeps the event wedge dominant and justifies every primary destination. |
| O001-T3 | 2 | Implementer | Private / gpt-5.3-instant | Separately approved navigation/screen manifest and focused tests | After approval, implement only named label/order/visibility changes; add focused shell tests and evidence records. | Exact-ID routes and auth gates regress green; diff stays within the approved manifest. |

## Acceptance criteria

- A first-time user can state what is next and open it from Home within ten seconds on a phone.
- Home, Calendar, and Create all open the intended same-ID Event Detail; Back returns to the initiating primary surface.
- Unfinished secondary features do not compete with the event loop or claim unsupported behavior.
- Configured session gates remain ahead of protected navigation.
- No out-of-scope system is changed.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Identify/open next event within ten seconds | PARTIAL/CONDITIONAL | Home hero and exact-event action passed configured browser proof; timed first-time participant test is `NOT RUN`. |
| Same-ID detail and correct Back from Home/Calendar/Create | COMPLETE | Browser journey and route contracts; commits `1bc3421`, `89d8720`; root 70/70 and app 58/58 at `88d0ed9`. |
| Secondary features do not make unsupported claims | COMPLETE | All five destinations are implemented; reminder/push copy was removed or bounded honestly. |
| Session gates precede protected navigation | COMPLETE | Configured signed-out/direct-route isolation plus four isolated sessions. |
| No out-of-scope system changed | COMPLETE | Local-only campaign record and clean scoped commits; no hosted mutation. |

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Report lint as placeholder unless the script substantively changes.
- Phone smoke at 390x844: Home → exact event → Back; Calendar → exact event → Back; Create → exact created event.
- Review the explicit manifest after commands pass.

### Conditional-staging/mobile-web/human

- Older-adult moderated walkthrough or `NOT RUN — participant unavailable`; do not substitute author opinion.

## Stop conditions/authorization limits

Stop before navigation dependencies, auth changes, removing reachable data, remote actions, or edits outside the approved manifest. If user evidence favors materially different IA, return findings for authorization rather than expanding implementation.

## Risks/follow-ups

- Simplifying labels without user evidence can hide useful routes.
- Structural tests do not prove comprehension or thumb reach.
- Memories and Groups may later earn placement through separately scoped missions.

## Definition of done

Acceptance criteria pass; phone-browser and automated evidence are recorded honestly; architecture and `evals/review-log.md` are updated; lint/Safari/Chrome/human limitations and follow-ups are listed; the diff remains small and reviewable.
