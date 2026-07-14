# Current Mission

Mission ID: `FAMILY-LOOP-DATA-002`

Status: Complete (`fd08450`).

## Mission

Replace the fixture-backed event backbone with the existing service and TanStack Query boundary. The active group and its events must load through Query; Create must persist an event and refresh the event views; Home, Calendar, and Event Detail must use the same event identity; and the authenticated user's RSVP must persist and survive reload. Preserve the deterministic mock adapter for unconfigured development and tests, while configured failures remain visible and never fall back to fixtures.

## Objective

Prove one durable, mobile-first coordination loop:

```text
resolved session and active group
-> Query loads that group's events
-> user creates an event
-> Home and Calendar show the created event
-> user opens that exact event by ID
-> user changes their RSVP
-> event and RSVP remain correct after reload/refetch
```

This mission adopts ADR 001 for the event slice: configured and authenticated service data is authoritative, Query owns server state and invalidation, Zustand owns transient UI state only, and migrated screens explicitly render loading, error, empty, and populated states.

## Non-goals

- Event editing/deletion, recurrence, invitations, external calendar sync, or a navigation-library migration.
- Event thread/messages, media upload or galleries, reminders, notifications, or derived memories; these remain M3-M6.
- Sign-up, onboarding, recovery, OAuth, profiles UI, no-group setup, or any expansion of the M1 Auth surface.
- New schema, migrations, RLS/storage-policy changes, deployment configuration, remote administration, or credential work.
- Billing, settings, teams, analytics, generic SaaS features, broad visual redesign, or new dependencies.
- Claiming live Supabase, RLS, realtime, storage, or production readiness from mock/local evidence.

## Authorized manifest

Only the following files may be created or edited during M2:

- `app/src/app/queries.ts`
- `app/src/app/selectors.ts`
- `app/src/features/events/createEvent.ts`
- `app/src/features/events/eventData.ts`
- `app/src/features/events/index.ts`
- `app/src/features/events/selectors.ts`
- `app/src/navigation/AppShell.tsx`
- `app/src/navigation/useAppShellState.ts`
- `app/src/screens/HomeScreen.tsx`
- `app/src/screens/CalendarScreen.tsx`
- `app/src/screens/CreateEventScreen.tsx`
- `app/src/screens/EventDetailScreen.tsx`
- `app/src/services/api.ts`
- `app/src/services/mockAdapter.ts`
- `app/src/services/mockData.ts`
- `app/src/services/supabaseAdapter.ts`
- `app/src/store/useLoopedInStore.ts`
- `app/src/types/domain.ts`
- `tests/app-scaffold.test.js`
- `tasks/current-mission.md`
- `tasks/backlog.md`
- `tasks/completed.md`
- `docs/architecture.md`
- `evals/review-log.md`
- `evals/code-rubric.md`
- `evals/ux-rubric.md`
- `evals/regression-checklist.md`

No environment file, Supabase migration, package manifest, lockfile, deployment file, Auth UI/provider file, or fixture file is authorized. The Sergeant owns commits, integration, wave transitions, and final acceptance. Each subordinate owner must remain inside its wave territory and must not perform Git mutations.

## Ordered execution

### Wave 1 — Query and adapter event contract

Ownership: the data-contract owner has exclusive ownership of `app/src/app/queries.ts`, `app/src/services/api.ts`, `app/src/services/mockAdapter.ts`, `app/src/services/mockData.ts`, `app/src/services/supabaseAdapter.ts`, and `app/src/types/domain.ts`. The test owner may edit only `tests/app-scaffold.test.js`. Mission-record ownership remains with `tasks/current-mission.md`.

1. Audit the existing event and RSVP service methods against the repository schema without changing migrations, policies, or remote state.
2. Define stable Query keys and enabled conditions for active-group events, event-by-ID detail, and event RSVPs. Auth/session and group resolution must gate configured queries.
3. Add the smallest mutations needed for event creation and RSVP upsert/update. Successful mutations must update or invalidate every affected event, group-event, and RSVP query; failures must remain visible.
4. Ensure the mock and Supabase adapters obey the same event/RSVP contract, including stable event identity, group scoping, chronological event results, authenticated-person RSVP semantics, and returned created/updated records.
5. Keep unconfigured mock records deterministic but mutable for the duration of a test/app process so create and RSVP reload/refetch behavior can be proven without fixtures.
6. Add focused contract/structural tests for Query ownership, configured failure behavior, mutation invalidation, group isolation, same-ID lookup, and RSVP upsert semantics.

Wave 1 success criterion: the service/Query boundary can independently create, refetch, retrieve, and RSVP to the same group-scoped event in deterministic mock mode, while the configured path has no fixture fallback and no durable event/RSVP mirror in Zustand.

Wave 1 commit gate: the Sergeant reviews the diff, runs the automated checks relevant to the owned files, confirms no RED boundary was crossed, and commits Wave 1 before Wave 2 begins.

### Wave 2 — Persistent event UI loop

Ownership: the event-flow owner has exclusive ownership of `app/src/app/selectors.ts`, `app/src/features/events/createEvent.ts`, `app/src/features/events/eventData.ts`, `app/src/features/events/index.ts`, `app/src/features/events/selectors.ts`, `app/src/navigation/AppShell.tsx`, `app/src/navigation/useAppShellState.ts`, `app/src/screens/HomeScreen.tsx`, `app/src/screens/CalendarScreen.tsx`, `app/src/screens/CreateEventScreen.tsx`, `app/src/screens/EventDetailScreen.tsx`, and `app/src/store/useLoopedInStore.ts`. Wave 1 contract files are read-only unless the Sergeant explicitly returns the wave for a surgical correction.

1. Make Query-backed group events the source for Home and Calendar in both service modes; do not read event fixtures after the event slice is migrated.
2. Render honest loading, error, empty, and populated event states. The empty state must still route to the existing Create surface, and configured request failures must not display fixture events.
3. Submit Create through the event mutation using the resolved active group. Prevent duplicate submissions, show pending and useful inline failure states, clear only after success, and return to a view that shows the persisted event without a full restart.
4. Route event selection by stable event ID and load Event Detail for that exact ID. Unknown/missing IDs must produce an explicit not-found/error state, never a different fixture event.
5. Load RSVPs for the selected event and persist the current authenticated person's RSVP through the service mutation. In mock mode use the deterministic mock identity already supplied by the service/session boundary.
6. Remove event drafts and RSVP overrides from durable Zustand ownership. Keep only transient form/navigation state that cannot become a competing event or RSVP source of truth.
7. Preserve phone-first Home prominence, same-event navigation, thumb-friendly RSVP actions, and the existing non-event tab surfaces without redesigning them.
8. Extend focused tests for all four rendered states, create-to-refetch, duplicate-submit prevention, same-ID detail, unknown ID, RSVP persistence, configured no-fallback behavior, and existing empty-group behavior.

Wave 2 success criterion: at a 390x844 viewport, an unconfigured user can create an event, see it on Home/Calendar, open the same ID, change RSVP, and observe the result after refetch/reload; configured loading and failures are truthful and protected by the M1 session gate.

Wave 2 commit gate: the Sergeant reviews and smoke-tests the complete event loop, confirms Wave 1 contracts remain intact, and commits Wave 2 before closeout work begins.

### Wave 3 — Verification, review, and mission closeout

Ownership: the verification/records owner has exclusive ownership of `tests/app-scaffold.test.js`, `docs/architecture.md`, `tasks/backlog.md`, `tasks/completed.md`, `evals/review-log.md`, `evals/code-rubric.md`, `evals/ux-rubric.md`, and `evals/regression-checklist.md`. Runtime files from Waves 1 and 2 are read-only unless the Sergeant authorizes a surgical fix followed by rerunning the affected wave checks.

1. Run the full verification matrix and inspect failures rather than weakening checks.
2. Perform the required phone smoke in unconfigured mock mode: create an event, confirm Home and Calendar reflect it, open that exact event, change RSVP, and confirm event/RSVP durability after a page reload or the strongest available equivalent.
3. Perform configured-boundary smoke with non-secret placeholder configuration only: verify the M1 gate prevents protected event queries/UI and that failures never fall back to mock/fixture content.
4. Apply the conditional live Supabase rule below exactly. No live result may be inferred from repository definitions.
5. Review the final diff against the product/code rubrics, ADR 001, manifest, non-goals, and every acceptance criterion. Record exact commands, smoke method, results, limitations, residual risks, and follow-ups.
6. Update architecture and campaign records truthfully. Add the completed M2 summary to `tasks/completed.md`, mark M2 complete in `tasks/backlog.md`, and leave M3-M6 unabsorbed.

Wave 3 success criterion: every acceptance item has direct evidence, required checks and phone smokes are recorded, live limitations are explicit, review records are current, and the final scoped diff is committed independently.

## Acceptance criteria

- [x] Changes are confined to the authorized manifest; no dependency, migration, policy, environment, deployment, or Auth-surface file changes occur.
- [x] Home and Calendar obtain active-group events through TanStack Query and explicitly render loading, error, empty, and populated states.
- [x] Configured/authenticated event data is authoritative; a configured request or auth failure never renders mock or fixture events as fallback.
- [x] Unconfigured operation uses the deterministic mock service through the same Query/mutation path, not screen fixtures.
- [x] Create Event persists through the service contract, is group-scoped, prevents duplicate submission, reports failure, invalidates/refetches affected queries, and appears on Home and Calendar after success.
- [x] Selecting an event opens Event Detail for that exact stable ID; an unknown or missing ID cannot silently open another event.
- [x] Event Detail loads its event and RSVPs through Query and explicitly handles loading, error, not-found/empty, and populated states.
- [x] The current user's RSVP mutation persists through the service contract and remains correct after refetch/reload at the strongest available local boundary (process-local mock; hard reload resets it).
- [x] Query is the sole owner of durable events and RSVPs; Zustand contains no durable event draft, persisted event record, or RSVP override that competes with server state.
- [x] Existing group resolution, M1 session gate, zero-event Create path, Home-to-same-event behavior, and unrelated tab surfaces remain intact.
- [x] Focused tests cover adapter parity, group scoping, chronological results, mutation invalidation, create-to-detail identity, unknown IDs, duplicate submission, RSVP persistence, explicit screen states, and configured no-fallback behavior.
- [x] Mock phone smoke passes at 390x844 for create -> Home/Calendar -> same-ID detail -> RSVP -> refetch; hard reload reset behavior is explicitly recorded.
- [x] Configured-boundary phone smoke passes at 390x844 without credentials or remote mutation and proves protected content does not fall back to mock/fixtures.
- [x] Conditional live Supabase verification is recorded exactly as `NOT RUN — ENV unavailable`.
- [x] All required automated commands pass; architecture, task history, review log, rubrics, and regression checklist accurately describe the implemented behavior and remaining limitations.
- [x] All three waves are reviewed and committed sequentially by the Sergeant, with no later mission silently absorbed.

## Verification commands

Run from the repository root unless a directory change is shown:

```powershell
npm test
cd app
npm test
npx tsc --noEmit
npm run lint
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
git diff --check
```

Required phone smoke at 390x844:

1. Unconfigured/mock: start with Supabase process configuration absent; create a uniquely titled future event; verify it appears on Home and Calendar; open it and verify the same title/ID; change the current user's RSVP; reload/refetch; verify the event and RSVP remain correct at the strongest supported mock boundary. Record precisely whether persistence is process-local or survives a full process restart.
2. Configured boundary: use non-secret placeholder configuration sufficient only to exercise the configured gate; do not submit credentials. Verify protected event UI is unreachable and the app does not render mock or fixture event content after restore/request failure.

Record exact commands, viewport, method, and results in `evals/review-log.md`. A narrow structural test is not sufficient evidence for the end-to-end phone criteria.

## Conditional live Supabase restriction

Live event creation, reads, and RSVP mutation may be tested only if all of the following are already true without discovery work:

- A safe, pre-authorized Supabase environment and existing test identity/group are already available to the running process.
- Testing requires no reading, printing, copying, reporting, creating, resetting, or mutating credentials, tokens, environment values, dashboards, or secret stores.
- The existing schema and policies accept the M2 contract without migration, policy, bucket, deployment, or administrative changes.
- The test data mutation is explicitly safe, confined to the existing test group, and can be identified as test data without touching real user content.

If any condition is not already satisfied, do not inspect for it and record exactly:

`NOT RUN — ENV unavailable`

That conditional result does not fail M2 when mock/contract/boundary evidence passes. It provides no evidence that remote schema, RLS, realtime, storage, or deployment is ready.

## Stop conditions and authorization limits

Stop immediately and return RED to the Sergeant if any of the following is required:

- Reading, printing, transmitting, creating, resetting, or mutating a secret, credential, token, environment value, or real-user data.
- Any migration, schema change, RLS/storage-policy change, remote administrative mutation, deployment operation, or destructive/irreversible action.
- Any new dependency, package/lockfile edit, environment-file edit, Auth expansion, or edit outside the authorized manifest.
- Implementing event editing/deletion, recurrence, invitations, calendar sync, thread, media, reminders, notifications, memories, onboarding, settings, billing, teams, or another M3-M6 concern.
- A need to weaken ADR 001 by adding fixture fallback in configured mode, mirroring server events/RSVPs in Zustand, or bypassing session resolution.
- A service/schema incompatibility that cannot be corrected additively and surgically inside the authorized manifest.
- A required check or acceptance failure that cannot be corrected inside the current wave's territory without changing approved scope.
- A Git conflict, unrelated dirty-worktree overlap, or destructive Git operation.

The Sergeant alone may authorize an AMBER interpretation, return a wave for correction, transition between waves, or commit. Simpler in-scope interpretations must be chosen when ambiguity does not affect the mission outcome, and the interpretation must be logged in `evals/review-log.md` during Wave 3.

## Risks and follow-ups

- Docker/local Supabase and remote deployment remain unverified; mock parity cannot prove live schema, policy, or storage behavior.
- The mock adapter can prove Query/refetch durability but may be process-local; records must not imply full device-restart persistence unless directly observed.
- The existing schema or Supabase adapter may not expose the authenticated profile fields needed for RSVP attribution; incompatible schema/RLS needs are RED, not permission to invent identity data or alter migrations.
- Chronological ordering and time-zone conversion can diverge between adapters; focused contract evidence is required.
- Create mutation success followed by refetch failure must remain a visible error, not be concealed by optimistic fixture state.
- Event thread, media, reminders/notifications, and derived memories remain M3-M6 in that order and must build on the event IDs established here.
- Invitations and no-group onboarding remain separately authorized work.

## Definition of done

- [x] Waves 1, 2, and 3 are accepted and committed in order by the Sergeant.
- [x] Every behavioral acceptance criterion has direct current-state evidence or the explicitly permitted conditional live result.
- [x] The complete mock phone loop and configured-boundary smoke are recorded with exact results and the process-local reload limitation.
- [x] All required commands pass without weakening tests or omitting failures.
- [x] ADR 001 ownership rules hold for the migrated event/RSVP slice.
- [x] Review, architecture, task, rubric, and regression records are truthful and current.
- [x] Residual risks and later missions are recorded without expanding M2.
- [x] The worktree contains no uncommitted M2 implementation changes after the Sergeant's final commit.
