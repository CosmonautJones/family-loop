# Current Architecture

The planned evolution of this architecture is governed by the 17 separately authorized operations orders in `docs/opords/README.md`. Their machine-readable dependency graph and bounded task tables describe future work and evidence gates; they do not assert that planned server, database, native, security, release, or operations capabilities are live.

LoopedIn is currently a responsive web app built with Expo and React Native Web. The event is the central product object; the code should continue to favor the path from a group to its events and then to RSVP, discussion, media, and memory state.

## Application entry and providers

- `app/index.ts` registers the root component with Expo.
- `app/App.tsx` composes `AppProviders` around `AppShell`.
- `app/src/app/AppProviders.tsx` owns the TanStack Query client. The authenticated group and the Home, Calendar, Create Event, Event Detail, and RSVP event slice now use that Query boundary.

## Shell and navigation

`app/src/navigation/AppShell.tsx` is the current application shell. It renders one of five tab surfaces: Home, Calendar, Create, Memories, or Family. `useAppShellState.ts` remains a small navigation bridge, now backed by browser hash/history routes for tabs and exact event IDs. Pure parser/formatter tests cover route round trips and unknown-route fallback; exact completed-event routing, Back, and hard reload were also exercised in Chrome during the Wave 4 gate.

## Data flow and state

- `app/src/features/**/fixtures.ts` still supplies deterministic prototype content for non-migrated presentation paths. The service seed is the canonical Jones Family data for service-backed paths.
- `app/src/app/selectors.ts` converts supplied domain records into screen-ready view models. Home sorts Query-owned events chronologically, keeps the next event as its hero, and projects every later upcoming event into an exact-ID list; Calendar receives the same event records. Event Detail receives the event and RSVPs loaded for its stable ID. Honest empty and not-found states do not substitute fixture events.
- `app/src/app/queries.ts` defines stable group, event-list, event-detail, RSVP, event-message, and event-media keys plus their scoped mutations. Successful message and media mutations invalidate only the selected event's records, so refetch remains authoritative without optimistic duplicates.
- `app/src/store/useLoopedInStore.ts` owns active-group selection only. Dead staged-photo and reminder draft state was removed; durable RSVP, event, message, media, and history records are not mirrored there.

The event coordination loop is Query-owned in every data mode. By default, and whenever `EXPO_PUBLIC_DATA_MODE` is unset, the app uses a durable local adapter backed by AsyncStorage (browser storage on web). Its current version-4 envelope stores the local database and a monotonic revision under the unchanged `loopedin:local-database:v1` key, so event, RSVP, message, and media-metadata mutations survive adapter reconstruction and browser reload. Retained version-1 through version-3 envelopes are explicitly migrated before publication: existing roles, user data, and revision are preserved; missing Jones roles receive deterministic owner/member values; message author IDs are recovered from their stored author/profile data; and the v4 result is safely persisted once. Every mutation coordinates on the storage key, re-reads and validates the latest envelope, deterministically replays its change, increments the revision, and only then serializes, stores, and publishes the committed state. Reads also refresh from a newer committed revision so separate local actors see one shared family record. Coordination uses `navigator.locks` when available and a module-level promise lock as a same-runtime fallback. Independent-tab atomicity is neither guaranteed nor tested on Safari or other environments without Web Locks. Persistence failures, malformed payloads, and unsupported envelope versions remain visible rather than silently resetting or reseeding, and a failed mutation or migration does not publish uncommitted active state.

`EXPO_PUBLIC_DATA_MODE=memory` explicitly selects the in-memory factory used for isolated automated tests. The durable adapter exposes `resetAndReseed()` only as an explicit test/development recovery seam; no production UI silently invokes it.

Wave 6 exercised the then-version-3 local architecture as a complete browser journey. Event creation, RSVPs, messages, URL/file media, deletion, Home/Calendar projections, Family membership, and completed-event memories all converged on the same durable envelope and survived hard reload plus development-server restart. The tested journey ended at revision 9. Malformed and future-version envelopes remain visible and are not overwritten; restoration is deliberate.

Because the adapter and browser storage are local, the architecture does not require a network for reads and mutations after the application bundle has loaded. Wave 6 did **not** separately exercise an in-session offline mutation, so this is an architectural property rather than direct journey evidence. It is not an installable/offline-shell architecture: a cold disconnected reload cannot fetch the application bundle because no service worker or PWA shell is present, by design and pending separate authorization.

Mock seed events use unique stable IDs, and the mock adapter explicitly sorts group event reads by start time rather than relying on insertion order. This keeps Home, Calendar, and Event Detail identity-consistent as new events are created during a running process.

The Create tab owns transient form state for title, local start date/time, location, and optional notes. It validates before calling the event service, keeps fields after a failed mutation, and uses a two-hour default duration. Success seeds the returned exact-event Query key, invalidates the active family's event list, and routes to that exact ID. Events and RSVPs remain service-owned rather than mirrored in Zustand, so durable-local reconstruction feeds Home, Calendar, Family, and Event Detail consistently.

## Adopted data and session boundary

ADR 001 governs upcoming migrations: service data accessed through TanStack Query is authoritative; deterministic memory data is limited to explicit test use; configured backend failures remain visible; Query owns service state; Zustand owns transient UI state only; and migrated screens explicitly render loading, error, empty, and populated states.

`AuthSessionProvider` now implements the session side of that boundary. Unconfigured builds enter the deterministic prototype without credentials. Configured builds restore a persisted Supabase session and gate the shell behind explicit restoring, signed-out, authentication-error, group-loading, group-error, and no-group states. The authenticated group list is Query-owned and resolves the active group; configured failures never select fixtures. The M2 event screens and M3 Event Detail thread comply with this boundary; other product slices remain fixture-backed until their separately authorized missions.

Event messages are scoped by stable event ID. The mock and Supabase adapters trim and reject blank sends and return parsed-instant chronological results with stable ID ties. Event Detail keeps thread loading and failures local, retains a failed draft, clears it only after successful send, and never substitutes fixture messages for service failures.

Completed-event history is derived rather than separately persisted. Home and Memories read the active family's service-backed events, select completed events, and combine each with media and comments queried under that exact event ID. `derivedHistory.ts` owns the pure combination rule and isolation tests prevent records from leaking between events. Memories renders loading, error/retry, empty, and populated states and routes to the exact completed event. The former reminder controls and dead reminder state were removed because no scheduling or delivery service exists.

## Service boundary

`app/src/services/api.ts` defines the service contract for auth, groups, events, RSVPs, activity, event messages, media, and notifications. `app/src/services/index.ts` selects exactly one adapter at startup:

- Durable local AsyncStorage is the default when `EXPO_PUBLIC_DATA_MODE` is unset or set to a local value.
- The in-memory adapter is selected only by `EXPO_PUBLIC_DATA_MODE=memory` and remains the deterministic isolated-test path.
- The Supabase adapter is selected only by `EXPO_PUBLIC_DATA_MODE=supabase`. Missing Supabase URL/key configuration produces a visible unavailable-service error; it never falls back to local Jones Family data.

The durable seed contains one stable Jones Family group with five members, exactly three future trips and one completed trip relative to 2026-07-13, plus consistent RSVPs, event-scoped messages, memories, and media metadata. Seed images are Unsplash URLs with local captions. Formal attribution/domain treatment remains follow-up work for the private-media wave; these URLs are demonstration metadata, not proof of uploaded private media.

Group membership is exposed as `GroupMember` records with `owner`, `admin`, or `member` roles through `listGroupMembers(groupId)` across mock, durable-local, and Supabase adapters. The Family screen reads the active group, its scoped members, and its events through Query and derives displayed roles from those records; it does not use group fixtures or invitation/admin mutations. Supabase membership/profile query code exists, but no remote membership or RLS behavior has been exercised.

The bottom navigation renders one tablist with five sequentially tabbable tabs. The active tab exposes native selected semantics through `aria-selected`; no extra visible selected marker is rendered. Decorative background overflow is clipped at the shell boundary.

The Supabase client uses AsyncStorage for auth-session persistence. Local browser durability is not remote persistence, multi-user synchronization, authenticated authorization, deployed database/RLS, or private-storage proof. Docker is unavailable in the current environment and no remote deployment has been verified, so repository migration, RLS, realtime, and bucket definitions remain intended infrastructure rather than live proof.

The local proof keeps the shared versioned family database in durable browser storage while keeping the selected person in per-tab `sessionStorage`; identity is therefore isolated between tabs and survives reload without pretending to be production authentication. Local service methods derive RSVP, comment, and media ownership from that selected member and enforce group membership before group, event, RSVP, thread, or media access. Photo deletion is limited to the uploader or a group owner/admin. Supabase RSVP writes likewise derive the authenticated user and profile name instead of trusting caller-supplied identity. The remote media adapter still relies on matching database and Storage RLS policies for uploader/owner deletion; those policies and object/database rollback behavior are not certified against the linked shared sandbox, and no remote policy or bucket mutation was performed in this wave.

## Product and implementation constraints

- Treat iOS Safari and Android Chrome phone browsers as the primary surface; desktop web is a usable secondary surface.
- Treat Expo native targets, native apps, app stores, and EAS builds as future non-goals unless separately authorized.
- Keep event detail as the center of logistics, RSVP, discussion, media, and recap behavior.
- Keep memories derived from completed events and keep group context as the event permission boundary.
- Do not expand auth, billing, settings, teams, notifications, deployment, or dependencies without an explicit mission.
- Prefer small feature-aligned changes, deterministic fixtures, and selectors that can later accept service data.

## Verification

From the repository root, run `npm test`. For app changes, also run `cd app`, then `npm test` and `npx tsc --noEmit`. Use `scripts/check-harness.ps1` when the current mission requires the full harness check.
