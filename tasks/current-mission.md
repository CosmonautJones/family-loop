# Current Mission

## Mission

Complete the current mobile backlog slices.

## Business / product reason

The current backlog should resolve the obvious mobile MVP gaps before new product ideas are added.

## User story

As a family organizer, I want Calendar, Event Detail, Create, photos, and reminders to behave like a coherent mobile loop so the app feels useful beyond the first hero screen.

## Acceptance criteria

- [x] Calendar agenda rows open Event Detail and return to Calendar.
- [x] Add Photo becomes a scoped local staged-photo/gallery state.
- [x] Create Event is tightened into a short mobile draft flow with visible local feedback.
- [x] Reminder/notification copy states exist without implying push delivery is wired.

## Files or modules likely involved

- app/src/navigation/AppShell.tsx
- app/src/navigation/useAppShellState.ts
- app/src/screens/CalendarScreen.tsx
- app/src/screens/EventDetailScreen.tsx
- app/src/screens/CreateEventScreen.tsx
- app/src/store/useLoopedInStore.ts
- tasks/backlog.md

## Required checks

- [x] powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
- [x] npm test
- [x] cd app; npm test
- [x] cd app; npx tsc --noEmit
- [x] Expo web smoke: Calendar -> Event Detail, Add Photo, Stage Reminder, Create preview

## Do not touch

- Backend or auth scaffolding.
- External media picker or push notification plumbing.
- Full navigation library migration.

## Risks

- Local draft states can feel fake if labels imply backend delivery.
- The temporary shell bridge should not grow into a hidden custom router.

## Definition of done

- [x] Acceptance criteria met
- [x] Relevant checks run
- [x] Review log updated
- [x] Follow-up tasks listed
