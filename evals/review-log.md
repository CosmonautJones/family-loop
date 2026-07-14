# Review Log

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 0 Run 2 closeout

- External Run 2 accepted the corrected Wave 0 checkpoint: **AMBER / PROCEED-WARN, ZERO BLOCKERS**.
- The external gate accepted 40 adversarial mutations as evidence of same-runtime coordinated durability; the exact mutation mix was not provided and is not invented in this record.
- Fresh fix evidence retained for the accepted checkpoint: root tests PASS 29/29; app tests PASS 18/18; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder and is WARN, not substantive lint evidence.
- Wave 0 is **COMPLETE**. The broader `FAMILY-LOOP-FULL-001` campaign remains **IN PROGRESS**, with Wave 1 pending authorization; no later wave is complete.
- Limitations remain explicit: actual browser hard reload was not run; remote Supabase, RLS, private media, and multi-user behavior are not proven; Safari/no-Web-Locks cross-tab atomicity is not proven; and Unsplash attribution/domain handling remains a later media-wave follow-up.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 0 Run 1 correction

- External/reviewer Run 1 result: **RED**. Review found a stale multi-adapter lost-update risk and a serialization rollback gap in the durable local persistence path.
- Wave 0 was reopened. The prior AMBER/complete statement and associated automated results remain historical run evidence, but were superseded as completion evidence.
- Targeted fix acceptance requires a revisioned envelope and same-runtime per-key serialization, with each mutation re-reading the latest persisted state and either replaying safely or surfacing a visible conflict so previously acknowledged data is not lost.
- The rollback boundary must cover stringify, storage-write, and persisted-payload validation failures, and multi-instance tests must exercise stale adapters, ordering, acknowledged-data preservation, visible conflicts, and rollback.
- Coordination claims must remain platform-accurate: prefer `navigator.locks` when available, use an explicit module-level fallback otherwise, and document the Safari limitation that a module fallback does not serialize independent tabs when Web Locks is unavailable.
- Targeted correction evidence: root tests PASS 29/29; app tests PASS 18/18; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder and is WARN rather than substantive lint evidence.
- Independent internal review confirms the revisioned envelope, latest-state deterministic replay under a per-key lock, retention of both A+B event mutations, retention of concurrent RSVP/message/media mutations, and safe stringify-failure rollback and reset behavior.
- Internal Run 1 fix gate: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. This was subsequently accepted by external Run 2 as recorded above.
- Limitation: `navigator.locks` is used when available. The module fallback coordinates adapter instances only inside the same JavaScript runtime; cross-tab atomicity on Safari or any environment without Web Locks is `NOT PROVEN`.
- The broader campaign remains in progress.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 0 documentation handoff

- Implementation documentation reflects the current durable local service: AsyncStorage is the default/unconfigured mode, `memory` is explicit for isolated tests, and only `EXPO_PUBLIC_DATA_MODE=supabase` selects the remote adapter.
- The version-1 envelope, explicit reset/reseed recovery seam, stable Jones Family dataset, and visible storage/configuration failures are documented without claiming a production reset UI.
- The seed includes five members, three future trips and one completed trip relative to 2026-07-13, with consistent RSVPs, event messages, memories, and Unsplash-backed media metadata/captions.
- Evidence boundary: local browser durability is not remote persistence, multi-user synchronization, RLS, private media upload, or deployed server proof. Unsplash attribution/domain handling remains a later media-wave follow-up.
- Independent line review required targeted fix loops for explicit-Supabase missing-config fallback, versioning the persistence envelope, rolling back failed writes, allowing explicit reset/reseed after corrupt initialization, validating the complete persisted payload, and preserving the synchronous auth-unsubscribe contract. Each finding was repaired before final review.
- Automated gate: root `npm test` PASS 27/27; app `npm test` PASS 16/16; app `npx tsc --noEmit` PASS; harness PASS; Expo web export PASS with temporary output removed; `git diff --check` PASS.
- Lint exits 0 but remains a placeholder, so it is WARN rather than substantive lint evidence. Actual browser hard-reload was `NOT RUN`; adapter reconstruction is automated durability evidence and the web export proves bundling only.
- Historical independent Wave 0 gate: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. This result was superseded as completion evidence by the subsequent external/reviewer Run 1 RED recorded above. Remote Supabase, RLS, private media, and multi-user verification remain `NOT RUN` and are not inferred.

## 2026-07-13 — FAMILY-LOOP-WEB-001 responsive-web campaign correction

- External Run 1 review: RED. Blocking contradictions remained in `docs/04-spec-roadmap.md` and `docs/10-loop-architecture-and-workflow.md`, and active native-test wording remained in OPORDs 003, 004, 005, 008, and 015. The targeted correction is authorized; external re-review remains pending after evidence and commit.
- Targeted Run 1 fix evidence: historical roadmap banner and authoritative links added; implementation bridge corrected to responsive web; all 17 active OPORDs searched and stale native-test phrases removed. Root tests PASS 24/24; app tests PASS 13/13; TypeScript and harness PASS; lint exits successfully but remains a placeholder. External PASS is not claimed.
- External Run 3 closeout: G1 TEST PASS; G2 LINT WARN because lint remains a placeholder assigned to OPORD 015; G3 REVIEW PASS; G4 INTEGRATION PASS; G5 KNOWLEDGE PASS. Overall AMBER / PROCEED-WARN with zero blockers. Accepted commits: `4e6fb85`, `0cd69b5`, and `1361e03`.

- Scope reviewed: source-of-truth product/architecture documents, all 17 OPORDs and their index, portable contract tests, and mission/evaluation records. No runtime, dependency, configuration, credential, remote, or deployment file changed.
- Platform correction: LoopedIn is now consistently specified as a responsive web app built with Expo/React Native Web, optimized first for iOS Safari and Android Chrome phone browsers, with desktop web usable and secondary. Native apps, EAS, and app stores are future non-goals unless separately authorized.
- Campaign invariants: numeric OPORD IDs, 60 bounded tasks, dependency graph, canonical order, backend/server/database scope, and authorization boundaries are preserved. OPORD 014 and 016 received accurate mobile-web testing and web-release filenames.
- Browser-specific correction: the campaign now addresses touch without hover, virtual keyboards, Back/history/deep-link/reload behavior, zoom/reflow, focus/screen readers/reduced motion, browser media selection, visit/resume updates, browser resilience, hosted artifacts, TLS/security headers/cache control, SPA fallback, and instant frontend rollback.
- Evidence boundary: mobile Safari/Chrome hardware, assistive technology, moderated older-adult sessions, live Supabase, deployment, backup, and restore remain `NOT RUN`; this documentation-only correction does not infer implementation.
- Automated gate: root tests PASS 23/23; app tests PASS 13/13; TypeScript PASS; harness PASS; `git diff --check` PASS. The lint command exits successfully but remains the existing honest placeholder assigned to OPORD 015.
- Internal pre-external gate at initial closeout: GREEN, with placeholder lint and unavailable conditional browser/human/live-environment evidence carried as explicit limitations. This internal result was superseded by the subsequent external Run 1 RED and is not the current external review result.
- Historical records describing the former native-first stance remain historical and are labeled superseded rather than rewritten as past responsive-web evidence.

## 2026-07-13 — FAMILY-LOOP-OPORD-001 campaign documentation

- Scope reviewed: one index, 17 numeric OPORDs, portable documentation-contract tests, and authorized architecture/mission/evaluation records. No runtime, dependency, environment, credential, deployment, or remote file changed.
- Coverage spans product simplicity, accessible design, auth/recovery, users/groups/invitations, service/environment boundary, database/RLS/indexes, events/calendar/RSVP, realtime conversation, private media, notifications, memories, resilience/performance, security/observability, native/usability tests, and CI/release/backup/data lifecycle.
- Baseline honesty: M1-M3 exist; remote Supabase remains unverified, Docker unavailable, lint a placeholder, and native/human validation not run. Future OPORDs require fresh authorization.
- Run 1 review result: RED — validation sections were not explicitly split and UI targets used a 44-point floor. The documentation was corrected before re-review.
- Run 2 review result: RED — combined delivery/recovery scope, abstract task model tiers, ambiguous numeric execution order, OPORD-005 runtime authority, and insufficient parser-level tests remained. The campaign was expanded to 17 and received bounded task tables, then entered this targeted Run 3 correction.
- Run 3 external review: G1 TEST PASS; G2 LINT WARN because `app/package.json` remains a placeholder, with remediation assigned to OPORD 015; G3 REVIEW PASS; G4 INTEGRATION PASS; G5 KNOWLEDGE PASS. Blocking findings: 0. Overall: AMBER / PROCEED-WARN.
- Accepted artifacts: commits `6c612ce`, `0291b3f`, and `fd6061d`; exactly 17 OPORDs and 60 bounded task rows.
- Conditional evidence: remote Supabase, Docker-backed database, iOS/Android native, screen reader, reduced motion, moderated older-adult, deployment, backup, and restore checks were `NOT RUN` because this was a documentation-only mission without a safe authorized environment or participants.
- Gate: Run 3 AMBER / PROCEED-WARN, zero blockers. Documentation mission complete; no planned runtime capability is certified.

## 2026-07-13 — FAMILY-LOOP-DATA-003 final review

- Commits reviewed: `ad6ae77` (runnable Query/adapter contract) and `28f9ba4` (runnable Event Detail thread UI).
- Contract evidence: executable tests prove event A/B isolation, whitespace rejection, trimmed persistence/refetch, session-derived `You`/self identity, mixed-offset parsed-instant ordering, and stable ID ties. Supabase parity was corrected non-breakingly; schema/RLS and remote state were untouched.
- UI evidence: Thread owns explicit loading, error, empty, and populated states. Send is disabled for empty/pending drafts; visible failures retain text; success clears only after event-key invalidation/refetch. No fixture fallback remains.
- Automated verification: root `npm test` PASS (19/19); app `npm test` PASS (13/13); app `npx tsc --noEmit` PASS; harness PASS; `git diff --check` PASS. App lint command PASS but remains a placeholder.
- Phone smoke: PASS at 390x844 in Chrome DevTools mock mode. `Bringing fruit salad` appeared as `You`, cleared from the composer after success, and remained visible after Back -> Open event. Event B isolation is direct adapter-test evidence. Console had only the pre-existing React Native Web shadow-style deprecation warning.
- Configured signed-out regression: PASS at 390x844 with non-secret placeholders; only the sign-in gate rendered and no credentials were submitted.
- Live RLS/two-user: `NOT RUN — safe environment unavailable`.
- AMBER decision: exact-key invalidation/refetch was chosen over optimistic insertion; message errors remain local to the Thread card. This avoids duplicates and preserves the rest of Event Detail.
- Gate: GREEN with the known placeholder-lint and unavailable-live-environment limitations. No RED boundary was crossed.

## 2026-07-13 — FAMILY-LOOP-DATA-002 Run 3 ordering correction

- Implementation commit reviewed: `43c8567`.
- Correctness repair: mock event results now sort by parsed epoch rather than lexical ISO text, so differing UTC offsets are ordered by their actual instants. Valid dates sort before invalid dates; invalid strings sort lexically for deterministic behavior; equal values use the stable event ID tie-break.
- Executable regression: the mixed-offset counterexample inserts `2026-08-01T10:00:00-05:00` (15:00Z) before `2026-08-01T14:30:00Z` and proves the 14:30Z event is returned first.
- Automated verification: root `npm test` PASS (16/16); app `npm test` PASS (10/10); app `npx tsc --noEmit` PASS; harness PASS; `git diff --check` PASS.
- Scope: only the mock adapter, its focused executable test, and truthful mission records changed. No dependency, Auth, schema, migration, remote, environment, deployment, or later-mission work was absorbed.
- Gate: PASS. Numeric instant ordering closes the mixed-offset chronology gap while preserving deterministic malformed-input behavior.

## 2026-07-13 — FAMILY-LOOP-DATA-002 targeted RED correction

- Commit reviewed: `5d10bc1`, following the immutable closeout record `79a72bb`.
- Correctness repairs: deterministic seed events use unique stable IDs; the mock adapter explicitly sorts group event results by `startsAt`; Home preserves the next-event hero and exposes every later upcoming event in chronological order with its own exact-ID action; the August 3 draft weekday is corrected to Monday.
- Automated verification: root `npm test` PASS (15/15); app `npm test` PASS (9/9); app `npx tsc --noEmit` PASS; harness PASS; `git diff --check` PASS. App lint passes but remains the pre-existing placeholder command.
- Mock phone smoke: PASS in Chrome DevTools at 390x844. Default Create opened the created event's exact detail; Home showed that event under `Also coming up`; its `Open` action returned to the same detail; RSVP showed `1 going` and `Going`; Calendar showed two unique shared plans.
- Console: no duplicate-key errors. The only observed message was the pre-existing React Native Web shadow-style deprecation warning.
- Configured-boundary smoke: PASS at 390x844 with non-secret placeholder configuration. Only signed-out authentication UI appeared; protected shell and mock event content were absent.
- Scope: no dependency, Auth, schema, migration, remote, environment, deployment, or later-mission work was absorbed.
- Gate: PASS. The correction closes the targeted identity, ordering, Home discoverability, and date-label findings.

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
