# Current Architecture

LoopedIn is currently an Expo and React Native mobile prototype. The event is the central product object; the code should continue to favor the path from a group to its events and then to RSVP, discussion, media, and memory state.

## Application entry and providers

- `app/index.ts` registers the root component with Expo.
- `app/App.tsx` composes `AppProviders` around `AppShell`.
- `app/src/app/AppProviders.tsx` owns the TanStack Query client. Query hooks exist, but current screens still render fixture-backed view models.

## Shell and navigation

`app/src/navigation/AppShell.tsx` is the current application shell. It renders one of five tab surfaces: Home, Calendar, Create, Memories, or Groups. `useAppShellState.ts` is a small local navigation bridge that also opens Event Detail and remembers the tab to return to. This is not a general router and should remain small until a navigation-library migration is explicitly required.

## Data flow and state

- `app/src/features/**/fixtures.ts` contains deterministic prototype data.
- `app/src/app/selectors.ts` converts those fixtures into screen-ready view models. Home, Calendar, Event Detail, Memories, and Groups currently read these selectors directly.
- `app/src/store/useLoopedInStore.ts` is a Zustand store for active-group selection and local interaction state: event drafts, RSVP overrides, staged-photo counts, and reminder drafts.
- Draft event and active-group values use the storage helpers in `app/src/lib/storage.ts`; the other interaction state is in-memory.

The current UI is therefore fixture-first. Service-backed query hooks in `app/src/app/queries.ts` are foundation code and are not yet the source of truth for rendered screen content.

## Service boundary

`app/src/services/api.ts` defines the service contract for auth, groups, events, RSVPs, activity, event messages, media, and notifications. `app/src/services/index.ts` selects an adapter at startup:

- The in-memory mock adapter is used when Expo Supabase environment variables are absent.
- The Supabase adapter is used when `EXPO_PUBLIC_SUPABASE_URL` and a publishable or anonymous key are present.

The Supabase client persists auth sessions through AsyncStorage. Adapter availability does not imply that auth or backend flows are complete in the current UI.

## Product and implementation constraints

- Treat iOS and Android phone use as the primary surface; web is a preview or later companion.
- Keep event detail as the center of logistics, RSVP, discussion, media, and recap behavior.
- Keep memories derived from completed events and keep group context as the event permission boundary.
- Do not expand auth, billing, settings, teams, notifications, deployment, or dependencies without an explicit mission.
- Prefer small feature-aligned changes, deterministic fixtures, and selectors that can later accept service data.

## Verification

From the repository root, run `npm test`. For app changes, also run `cd app`, then `npm test` and `npx tsc --noEmit`. Use `scripts/check-harness.ps1` when the current mission requires the full harness check.
