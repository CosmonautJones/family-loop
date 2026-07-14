# Current Architecture

LoopedIn is currently an Expo and React Native mobile prototype. The event is the central product object; the code should continue to favor the path from a group to its events and then to RSVP, discussion, media, and memory state.

## Application entry and providers

- `app/index.ts` registers the root component with Expo.
- `app/App.tsx` composes `AppProviders` around `AppShell`.
- `app/src/app/AppProviders.tsx` owns the TanStack Query client. The authenticated group and the Home, Calendar, Create Event, Event Detail, and RSVP event slice now use that Query boundary.

## Shell and navigation

`app/src/navigation/AppShell.tsx` is the current application shell. It renders one of five tab surfaces: Home, Calendar, Create, Memories, or Groups. `useAppShellState.ts` is a small local navigation bridge that also opens Event Detail, carries the selected event ID, and remembers the tab to return to. This is not a general router and should remain small until a navigation-library migration is explicitly required.

## Data flow and state

- `app/src/features/**/fixtures.ts` still supplies deterministic prototype content for non-migrated surfaces such as memories and groups.
- `app/src/app/selectors.ts` converts supplied domain records into screen-ready view models. Home sorts Query-owned events chronologically, keeps the next event as its hero, and projects every later upcoming event into an exact-ID list; Calendar receives the same event records. Event Detail receives the event and RSVPs loaded for its stable ID. Honest empty and not-found states do not substitute fixture events.
- `app/src/app/queries.ts` defines stable group, event-list, event-detail, RSVP, and event-message keys plus event-create, RSVP-upsert, and message-send mutations. Successful message sends invalidate only the selected event's message list, so refetch remains authoritative without optimistic duplicates.
- `app/src/store/useLoopedInStore.ts` owns active-group selection and transient interaction state such as staged-photo counts and reminder drafts. It no longer mirrors RSVP state or durable event drafts.

The event coordination loop is Query-owned in both configured and unconfigured modes. The unconfigured adapter remains deterministic and mutable for the life of its process; that is not evidence of device- or process-restart durability.

Mock seed events use unique stable IDs, and the mock adapter explicitly sorts group event reads by start time rather than relying on insertion order. This keeps Home, Calendar, and Event Detail identity-consistent as new events are created during a running process.

## Adopted data and session boundary

ADR 001 governs upcoming migrations: configured and authenticated service data accessed through TanStack Query is authoritative; deterministic mocks are limited to unconfigured/test use; configured backend failures remain visible; Query owns server state; Zustand owns transient UI state only; and migrated screens explicitly render loading, error, empty, and populated states. This is an adopted boundary, not a claim that current screens already comply.

`AuthSessionProvider` now implements the session side of that boundary. Unconfigured builds enter the deterministic prototype without credentials. Configured builds restore a persisted Supabase session and gate the shell behind explicit restoring, signed-out, authentication-error, group-loading, group-error, and no-group states. The authenticated group list is Query-owned and resolves the active group; configured failures never select fixtures. The M2 event screens and M3 Event Detail thread comply with this boundary; other product slices remain fixture-backed until their separately authorized missions.

Event messages are scoped by stable event ID. The mock and Supabase adapters trim and reject blank sends and return parsed-instant chronological results with stable ID ties. Event Detail keeps thread loading and failures local, retains a failed draft, clears it only after successful send, and never substitutes fixture messages for service failures.

## Service boundary

`app/src/services/api.ts` defines the service contract for auth, groups, events, RSVPs, activity, event messages, media, and notifications. `app/src/services/index.ts` selects an adapter at startup:

- The in-memory mock adapter is used when Expo Supabase environment variables are absent.
- The Supabase adapter is used when `EXPO_PUBLIC_SUPABASE_URL` and a publishable or anonymous key are present.

The Supabase client persists auth sessions through AsyncStorage. Adapter availability does not imply that remote backend flows are deployed or verified. Docker is unavailable in the current environment and no remote deployment has been verified, so repository migration, RLS, realtime, and bucket definitions are intended infrastructure rather than live proof. Live Supabase event/RSVP CRUD for M2 is `NOT RUN — ENV unavailable`.

## Product and implementation constraints

- Treat iOS and Android phone use as the primary surface; web is a preview or later companion.
- Keep event detail as the center of logistics, RSVP, discussion, media, and recap behavior.
- Keep memories derived from completed events and keep group context as the event permission boundary.
- Do not expand auth, billing, settings, teams, notifications, deployment, or dependencies without an explicit mission.
- Prefer small feature-aligned changes, deterministic fixtures, and selectors that can later accept service data.

## Verification

From the repository root, run `npm test`. For app changes, also run `cd app`, then `npm test` and `npx tsc --noEmit`. Use `scripts/check-harness.ps1` when the current mission requires the full harness check.
