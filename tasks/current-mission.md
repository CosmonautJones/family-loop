# Current Mission

## Mission

Polish the Event Detail RSVP loop so the app's core event-centered value is clear and TypeScript clean.

## Business / product reason

Event Detail is the canonical LoopedIn surface. If attendance state, logistics, and thread context feel unfinished, the product collapses back into a prettier calendar mock.

## User story

As a family organizer, I want to open an event and instantly see my RSVP state, plan context, and latest thread so that I trust the event page more than scattered chat messages.

## Acceptance criteria

- [x] Event Detail exposes a stable event id through the selector so RSVP overrides target the right event.
- [x] Home receives the hero event cover image through its selector.
- [x] Home's primary event CTA opens the Event Detail surface.
- [x] RSVP controls use clear labels and show human-readable feedback for the current response.
- [x] Harness docs describe the LoopedIn vision, core loop, taste bar, and anti-goals.

## Files or modules likely involved

- docs/vision.md
- docs/core-loop.md
- docs/taste-bar.md
- docs/anti-goals.md
- app/src/app/selectors.ts
- app/src/navigation/AppShell.tsx
- app/src/navigation/useAppShellState.ts
- app/src/screens/EventDetailScreen.tsx
- app/src/screens/HomeScreen.tsx

## Required checks

- [x] powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
- [x] npm test
- [x] cd app; npm test
- [x] cd app; npx tsc --noEmit

## Do not touch

- Backend or auth scaffolding.
- Broad navigation structure.
- Existing concept docs beyond the harness additions.

## Risks

- Making the RSVP UI look functional beyond the current local override behavior.
- Expanding into create-event or notification work before the detail loop is clean.

## Definition of done

- [x] Acceptance criteria met
- [x] Relevant checks run
- [x] Review log updated
- [x] Follow-up tasks listed
