# FAMILY-LOOP-OPORD-001 — Product simplicity and information architecture

## Status

PLANNED — documentation order only; implementation requires separate mission authorization.

## Situation and evidence

- LoopedIn's wedge is one mobile event page joining logistics, RSVP, discussion, and memories (`docs/vision.md:3-15`; `docs/core-loop.md:18-19`).
- The shell currently presents five tabs and a separate Event Detail surface (`app/src/navigation/useAppShellState.ts:3-27`; `app/src/navigation/AppShell.tsx:47-52`).
- Home correctly leads with the next event and offers exact-event entry (`app/src/screens/HomeScreen.tsx:24-39`), while Calendar repeats event discovery (`app/src/screens/CalendarScreen.tsx:17-60`).
- Product guidance rejects generic dashboards and features unrelated to plan, attend, discuss, or remember (`docs/taste-bar.md:23-29`; `docs/anti-goals.md:17-22`).
- Inference: five peer tabs may overstate unfinished Memories/Groups surfaces and weaken the event-centered hierarchy; validate with a phone walkthrough before changing navigation.

## Mission/objective

Produce and implement the smallest mobile information architecture that lets a user identify the next event, open its single source of truth, create a plan, and reach the shared calendar without competing secondary destinations.

## Dependencies

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

Keep no more than four primary choices visible at once where practical; use concrete nouns and verbs, persistent labels (not icon-only controls), predictable Back behavior, readable type, and at least 48x48-point primary targets. Verify the core route without relying on gesture memory, hover, or color alone. Preserve screen-reader order, reduced-motion behavior, and a plain recovery route.

## Execution

1. Record the current Home → Event Detail → RSVP/thread, Calendar → Event Detail, and Create → same-ID Event Detail routes.
2. At 390x844, identify duplicate, misleading, or premature destinations; distinguish observed issues from inference.
3. Write one minimal proposed hierarchy and a before/after route table. Default to preserving Home, Calendar, Create, and Event Detail; secondary surfaces must justify primary placement.
4. Obtain mission approval for the exact file manifest before runtime edits.
5. Implement only the approved label/order/visibility changes, preserving exact event IDs and return-tab behavior.
6. Add focused shell tests and update architecture/review records only after evidence exists.

## Acceptance criteria

- A first-time user can state what is next and open it from Home within ten seconds on a phone.
- Home, Calendar, and Create all open the intended same-ID Event Detail; Back returns to the initiating primary surface.
- Unfinished secondary features do not compete with the event loop or claim unsupported behavior.
- Configured session gates remain ahead of protected navigation.
- No out-of-scope system is changed.

## Validation commands/evidence

### Always-local

- `npm test`
- `cd app; npm test`
- `cd app; npx tsc --noEmit`
- `powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1`
- `cd app; npm run lint` — report as placeholder unless the script substantively changes.
- Phone smoke at 390x844: Home → exact event → Back; Calendar → exact event → Back; Create → exact created event.
- `git diff --check` and explicit manifest review.

### Conditional-staging/native/human

- Older-adult moderated walkthrough or `NOT RUN — participant unavailable`; do not substitute author opinion.

## Stop conditions/authorization limits

Stop before navigation dependencies, auth changes, removing reachable data, remote actions, or edits outside the approved manifest. If user evidence favors materially different IA, return findings for authorization rather than expanding implementation.

## Risks/follow-ups

- Simplifying labels without user evidence can hide useful routes.
- Structural tests do not prove comprehension or thumb reach.
- Memories and Groups may later earn placement through separately scoped missions.

## Definition of done

Acceptance criteria pass; phone and automated evidence are recorded honestly; architecture and `evals/review-log.md` are updated; lint/native/human limitations and follow-ups are listed; the diff remains small and reviewable.
