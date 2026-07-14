# Review Log

## 2026-07-13 — FAMILY-LOOP-DATA-002 Wave 3 final review

- Architecture: Home and Calendar read active-group events through Query; Create uses the event mutation; Event Detail loads the exact event ID and its RSVPs; RSVP changes use the service mutation. Zustand no longer mirrors durable RSVP or event records.
- Configured-boundary rule: migrated screens expose loading/error/empty/not-found states and do not fall back to event fixtures.
- Automated verification: root `npm test` PASS (12/12); app `npm test` PASS (6/6); app `npx tsc --noEmit` PASS; app `npm run lint` PASS but remains a placeholder; harness PASS; `git diff --check` PASS.
- Commit sequence reviewed: `d003aa9` (Query/data contract), `78923ae` (event UI), `c31397d` (runnable-boundary repair).
- Execution-discipline advisory: Wave 1 was committed before its changed selector interface had a compatible caller, so that commit was not independently runnable. Wave 2 exposed the interface mismatch and `c31397d` repaired it. Future wave gates must run the declared checks against each commit before transition.
- Mock contract durability is process-local. It proves mutation plus refetch behavior, not persistence across a full app-process restart.
- Mock phone smoke: PASS in Chrome DevTools at emulated 390x844 with Supabase variables explicitly blank. Home loaded; Create produced `event-created-1` and opened the exact `Neighborhood potluck on the green` detail. The first pass exposed Create still mounted behind detail; the shell now guards every tab screen and a regression test covers it. The clean rerun showed only exact Event Detail, changed RSVP Maybe -> Going, showed `1 going / Going`, and Calendar showed `3 shared plans` plus the exact created-event button.
- Mock reload boundary: a hard reload reset the process-local adapter and returned seeded Home. Mutation/refetch durability passed within the running adapter; persistence across a full reload/process restart is intentionally not claimed.
- Configured-boundary phone smoke: PASS in Chrome DevTools at emulated 390x844 with a non-secret placeholder URL/key. Only `Welcome back`, email, password, and disabled `Sign in` appeared; no product shell or mock/fixture event content was reachable and no credentials were submitted or mutated.
- Live Supabase event/RSVP CRUD: `NOT RUN — ENV unavailable`. No remote setup, credential discovery, migration, policy, or deployment operation was authorized.
- Scope: no migration/RLS, dependency, environment, deployment, Auth expansion, thread, media, notification, or memory work was absorbed.
- Gate: PASS. M2 acceptance is complete with the explicit process-local mock limitation and permitted live result.

## 2026-07-13 — FAMILY-LOOP-DATA-001 Wave 2 implementation review

- Added configured session/auth/group gates and preserved direct unconfigured mock entry.
- Configured states are explicit: restoring, signed out/auth error, group loading, group error, no groups, and authenticated shell. No configured failure branch renders fixtures.
- Minimal sign-in includes email, password, disabled pending/invalid submit, and inline accessible errors; no sign-up, recovery, OAuth, or group creation was added.
- Root `npm test`: PASS (11/11).
- App `npm test`: PASS (5/5).
- App `npx tsc --noEmit`: PASS.
- App `npm run lint`: PASS, but remains a placeholder command.
- Harness: PASS.
- `git diff --check`: PASS (line-ending warnings only).
- Mock phone smoke: PASS at 390x844 using `EXPO_NO_DOTENV=1` with Supabase process variables unset. Home showed Emma's Birthday Brunch; the unique visible `Open event` action opened Event Detail with the same title plus attendance, logistics, and thread context.
- Configured-unauthenticated phone smoke: PASS at 390x844 using the existing configured local Expo start. Only LOOPEDIN, Welcome back, email, password, and disabled Sign in were shown; protected shell content was absent and no login was submitted.
- Live auth: `NOT RUN — ENV unavailable`.
- Limitation: lint remains a placeholder command and remote deployment remains unverified.
- Gate: PASS. Both required non-mutating phone paths and all implementation checks are green.

## 2026-07-13 — Persistent data campaign M0

- G3 targeted fix: added the explicit M0 allowed-files/systems manifest, ordered task ownership boundaries, and stop conditions requested by review; no runtime or product evidence changed.
- G3 gate response: PASS — 0 blocking comments remain for the M0 execution-control record; later campaign missions remain sequencing only and require separate authorization.
- Recorded repository capabilities while separating code presence from live deployment proof.
- Adopted ADR 001: configured/authenticated Query data is authoritative; mocks are unconfigured/test-only; configured failures stay visible; Zustand remains transient.
- Sequenced M0-M6 across session, the durable event/RSVP backbone, thread, media, reminders/notifications, and derived memories/closeout with narrow non-goals.
- Docker is unavailable and remote deployment is unverified; no live migration, RLS, bucket, or service claim is made.
- Product behavior changed: no.
- Verification: root tests 11/11, app tests 5/5, TypeScript, harness, and diff check passed.
- Status: complete.

## 2026-07-13 — Repository readiness repair

- Added the required current-state architecture document after confirming it was missing.
- Documented the existing Expo entry, custom shell navigation, fixture selectors, Zustand state, query foundation, and mock/Supabase adapter boundary.
- Added local Codex and Expo generated directories to `.gitignore`.
- Established this review log and added required-artifact checks.
- Product behavior changed: no.
- Risks or follow-ups: screen data remains fixture-backed even though service query hooks exist; address that only through a future scoped mission.

## 2026-07-13 — Home coordination loop

- Replaced Home's prototype/marketing lead with a phone-first next-event hierarchy.
- Moved the featured fixture to July 18, 2026 and aligned its identity with Event Detail.
- Added an event-ID seam through the existing shell so Home opens the same event record.
- Added a deterministic selector path for an existing group with zero events; activity and memories are empty and the Home CTA selects the existing Create tab.
- Added executable populated/empty selector tests and focused shell wiring checks.
- Verification: root tests 10/10, app tests 5/5, TypeScript, harness, and diff check passed. Expo web at 390x844 confirmed populated Home -> Emma's Birthday Brunch detail.
- Limitation: empty Home was not browser-smoked because doing so would require a speculative runtime fixture toggle; selector behavior and CTA wiring were verified directly.
- Scope review: no onboarding, backend/query plumbing, dependency, navigation-library, or unrelated screen changes.
