# Review Log

## 2026-07-14 — OPORD index certification reconciliation

- Reconciled the campaign index with already-recorded source evidence: OPORD 003 loopback password recovery, OPORD 008 exact-event Realtime/reconnect cleanup, and OPORD 012 corrected warm mobile-web performance are locally complete with external conditions; OPORD 017 now names the locally proven encrypted current-user export while remaining partial overall.
- Hosted Auth/Realtime/load/backup/export operations, physical browsers and assistive technology, long-outage and human evidence, approved lifecycle/shared-family policy, and destructive deletion/retention apply remain explicitly open. No runtime, schema, test, dependency, or remote state changed.
- Follow-up certification audit corrected the current OPORD 006 migration count to five and the current checklist to record proven event/comment response-loss replay. Correlation/version propagation, universal deadline/rate enforcement, other write classes, hosted migration/telemetry, and production cardinality evidence remain open.

## 2026-07-14 — OPORD 005 event/comment response-loss idempotency

- Event and comment writes still never auto-retry. Their mobile-web composers retain a UUID operation key only while the unchanged failed draft remains visible and rotate it on any edit or successful authoritative response.
- Durable-local advances to v8 with private actor/entity/key operation mappings. A committed response-loss replay returns the retained record without another row or revision; retained v1–v7 envelopes migrate once.
- Forward migration `20260714140000_loopedin_create_idempotency.sql` keeps operation keys out of member-readable event/comment rows. Revoked private tables and narrow security-definer RPCs serialize actor/entity/key scopes with transaction advisory locks and return the authoritative public row.
- The loopback family harness discards initial committed responses, retries, and proves same ID/one row, distinct operations, cross-user same-key separation, outsider denial, revoked table access, and cleanup. Retained SQL counts stayed exactly 8/2/6/5/9/9/4/60/1; the populated scenario verifier remained exact.
- First fix loop corrected an ambiguous PL/pgSQL local variable. Second fix loop updated v8 migration fixtures and the composer contract assertion. Independent review then found a membership-removal TOCTOU in the security-definer RPCs; the correction holds key-share locks on the exact membership row and, for comments, the event row through commit. TypeScript, migration/secret checks, and the expanded local family harness pass after final gates.
- Independent privacy/RLS/schema review: **AMBER before correction, GREEN after the exact blocking race was repaired**. All other reviewed areas passed: private key storage/privileges, actor/entity scoping, authoritative replay, advisory-lock behavior, cascades, UI key lifecycle, durable no-write replay, and cross-user collision behavior.
- Hosted correlation/version propagation, universal deadlines/rate enforcement, and other write classes remain open; OPORD 005 remains PARTIAL/CONDITIONAL overall.

## 2026-07-14 — OPORD 005/006 local readiness and query-plan gate

- OPORD 005 audit rejected a client-only universal envelope: every configured adapter rejection already crosses the central safe-error mapper, while correlation propagation, health endpoints, universal deadlines, and rate enforcement require a cooperating server/gateway. The smallest explicit contract now retries reads once and never automatically retries writes.
- The transaction fixture created 20 members, 100 events, 20 RSVPs, 100 exact-event comments, 50 exact-event active media rows, 20 reminders, and 3,800 generated notification rows. It asserted exact bounded results and captured JSON plans for actual event, message, media, RSVP, notification, reminder, and membership/helper shapes.
- Independent review found the apparent index win belonged to uncalled `listRecentActivity()`, while the live notification screen fetches full history and did not improve. The candidate migration and local index/history entry were removed; four original migrations remain and no speculative index was committed.
- The same review corrected the retry disposition: automatic mutation replay is disabled, but a manually retried message/event insert can duplicate if the server committed and its response was lost. That criterion remains PARTIAL.
- Fixture rows rolled back. Because `ANALYZE` statistics are nontransactional and aborted inserts leave dead tuples, the harness vacuums/analyzes all touched tables after rollback. Exact retained SQL counts stayed 8/2/6/5/9/9/4/60/1, and the independent populated-family verifier stayed 4 identities/3 members/3 trips/6 messages/6 RSVPs/3 media/38 notifications/0 reminders/3 objects/zero outsider residue.
- Hosted migration state, production cardinality/query telemetry, connection pools, request-version/correlation propagation, rate enforcement, and readiness endpoints remain `NOT RUN`; no hosted target was contacted.
- Independent review Run 1 was RED on the dead-path index and manual-retry overclaims. After removing the migration/local index/history and correcting the idempotency disposition, Run 2 was **GREEN / PASS with zero blockers**.
- Final gates pass: root and app-local tests, substantive lint, TypeScript, local-only Expo export, harness, 200-file secret scan, four ordered migration checksums, database lint, family/media/reminder RLS matrices, rollback-safe query plans, populated-scenario verification, and diff check.

## 2026-07-14 — local multi-user, security, and KISS final gate

- Accepted commits: `7deb3fa`, `93dc773`, `1311332`, `2b6d725`, `a52e43b`, and `0601baa`.
- Two same-origin tabs independently selected Alex/Maya through the explicitly labeled local-demo `sessionStorage` chooser. Shared plan convergence, distinct RSVPs/comments, viewer-relative authorship, reload/session isolation, and role-sensitive plan/media controls passed.
- Security fix loops aligned creator/manager rules, captured actors through lock waits, outsider/cross-family denial, RSVP spoof resistance, uploader/manager media deletion, and per-recipient notifications plus v6 migration. Final local security gate: **AMBER / PROCEED-WARN, ZERO LOCAL BLOCKERS**.
- The Event Detail KISS loop was reduced to plan → RSVP → thread → collapsed photos. Exact 320px error recovery, plan edits, mode-specific photo fields, cancellation, permissions, full Memories content, and 390/430 overflow checks passed. Final code and rendered KISS gates: **GREEN**.
- Final automation: root 56/56; app-local 45/45; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder WARN.
- Multi-user chooser opened for an 847-byte PNG but attachment was blocked by the automation extension; it is not recorded as a pass. Earlier Wave 3 selected a real 609-byte PNG; multi-user media ownership is independently exercised by service tests.
- Remote warning: metadata deletion and Storage deletion policies do not yet match, and multi-step object/database writes and deletes are nontransactional. No remote project was mutated. Auth/invites/RLS/private storage and physical-device/assistive-technology evidence remain `NOT RUN`.
- Full matrix and reproduction notes: `docs/runbooks/full-local-multiuser-family-e2e.md`.

## 2026-07-14 — FAMILY-LOOP-FULL-001 Wave 4 external final gate

- External review accepted `d4f4b4d` and records commit `3d80a62` at **AMBER / PROCEED-WARN, ZERO BLOCKERS**.
- Authoritative independent command summaries are root tests PASS 43/43 and app-local tests PASS 32/32. TypeScript, harness, Expo web export, responsive browser checks, and diff check passed; lint remains the known placeholder warning.
- Unused legacy Home and memory fixture exports remain present but are not imported by production Home or Memories. This is advisory cleanup only and does not reintroduce fixture fallback.
- Live Supabase/RLS/private object storage, multi-user behavior, and physical iOS Safari/Android Chrome remain `NOT RUN` and are not inferred from the accepted local evidence.

## 2026-07-14 — FAMILY-LOOP-FULL-001 Wave 4 final closeout

- Accepted implementation commit: `d4f4b4d`.
- Memories and Home now derive completed-event history from service-backed family events plus exact-event media and comments. Lake Geneva renders three photos and one comment; Memories has honest loading, error/retry, empty, and populated states and opens the exact event route.
- Independent Run 1 was **RED** because the completed-event derivation did not adequately prove exact-event media/comment isolation. The targeted correction fixed that defect and added isolation regression coverage before re-review.
- Independent Run 2 result: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. Authoritative separate command summaries are root tests PASS 43/43 and app-local tests PASS 32/32; TypeScript, harness, Expo web export, and diff check PASS. Lint remains the known placeholder warning.
- Exact Chrome checks at 320×844, 390×844, 430×932, and 1280×900 found no document overflow. Exact route, Back, and hard reload passed, and no reminder UI was present. Calendar retains 48px actions and truthful shared-plan copy.
- Dead reminder and staged-photo transient state was removed. This prevents the UI from implying scheduling, delivery, or uploads outside the implemented service-backed flow.
- Wave 4 is **COMPLETE** only for this local completed-event-history/product-truth checkpoint. The broader campaign remains **IN PROGRESS**. Remote Supabase/RLS/private object storage, multi-user behavior, and physical iOS Safari/Android Chrome were `NOT RUN` and are not inferred.

## 2026-07-14 — FAMILY-LOOP-FULL-001 Wave 3 external final gate

- External review after records correction `a1e68a1`: **AMBER / PROCEED-WARN, ZERO BLOCKERS**.
- Authoritative independent TAP summaries are root 39/39 and app-local 28/28. Each result comes from its own command summary; the no-count-mirroring closeout discipline remains in force.
- Warnings are unchanged: lint is a placeholder, the React Native Web shadow-style advisory is pre-existing, and live Supabase/RLS/private storage/signed access, multi-user behavior, and real-device Safari/Chrome remain unverified.
- Wave 3 remains **COMPLETE** only for the durable-local comment/browser-photo checkpoint; the broader campaign remains **IN PROGRESS**.

## 2026-07-14 — FAMILY-LOOP-FULL-001 Wave 3 final closeout

- Accepted commits: `daf38d6`, `7eae2b5`, `630ad85`, and `e242761`.
- Independent Run 1 was **RED** because failed comment submission cleared its draft and durable browser-file input lacked explicit size/type constraints. `630ad85` preserves composer drafts through failure/retry; `e242761` validates supported image types and bounded size before durable persistence.
- Independent Run 2 result: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. Authoritative per-command TAP summaries are root tests PASS 39/39 and app-local tests PASS 28/28; TypeScript, harness, Expo web export, and diff check PASS. Lint remains the known placeholder warning.
- Exact CDP at 320×844, 390×844, 430×932, and 1280×900 found no document overflow. The browser journey posted a real comment, attached an attributed URL photo, selected a 609-byte PNG through the file chooser, hard-reloaded with records retained, deleted the uploaded photo, and verified invalid-photo failure with retry input retained.
- The only console advisory was the pre-existing React Native Web shadow-style deprecation warning. Live Supabase, RLS, private object storage/signed access, real-device Safari/Chrome, and multi-user behavior were `NOT RUN` and are not inferred.
- Wave 3 is **COMPLETE** as a durable-local comment/browser-photo checkpoint. The broader campaign remains **IN PROGRESS**.
- Records correction: the initial closeout incorrectly mirrored root's 39/39 TAP count into the app result. The app command's own summary is 28/28. Future closeouts must transcribe each command's TAP summary independently.

## 2026-07-14 — FAMILY-LOOP-FULL-001 Wave 3 Run 1 correction

- Initial implementation commits `daf38d6` and `7eae2b5` moved event comments/photos onto service and Query boundaries, added attributed URL-photo and browser-file paths, and supplied event-isolated durable contracts.
- Independent Run 1 returned **RED** on two targeted defects: failed comment sends lost user input, and unrestricted file reads could put unsuitable data into durable browser storage.
- Fix commits `630ad85` and `e242761` retained failed drafts and added pre-persistence file type/size validation. Run 2 above supersedes Run 1 as final gate evidence.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 2 final closeout

- Independent final result: **AMBER / PROCEED-WARN, ZERO BLOCKERS**.
- The initial G5 documentation-only blocker was corrected in `3262a33`; authoritative fresh counts are root 37/37 and app-local 26/26.
- Runtime, TypeScript, harness, Expo web export, scoped browser journey, and diff evidence passed. Placeholder lint remains AMBER; remote Supabase/RLS, multi-user sync, and real-device Safari/Chrome remain unverified and are not inferred.
- Wave 2 is **COMPLETE**.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 2 implementation handoff

- Commit `c1b135e` replaces preset-only creation with a five-field family-plan form, inline validation, pending/error/retry states, exact-ID navigation, and pending-safe, truthful RSVP controls.
- Root tests PASS 37/37 and app-local tests PASS 26/26; TypeScript, harness, Expo web export, and diff check PASS. Lint remains the known placeholder AMBER.
- Exact 320×844 browser flow created “Wisconsin Dells weekend,” routed to `#/event/event-created-1?from=create`, saved Going, reloaded with event and RSVP retained, returned to Create with Back, and found the trip on Home and Calendar. Client and scroll widths matched at 320, 430, and 1280.
- Read-only Private review blockers for validation export, impossible-date normalization, and selector expectation were fixed; its RSVP live-region advisory was also fixed.
- This implementation handoff was superseded by the accepted final closeout above. Remote Supabase/RLS, multi-user sync, and real-device Safari/Chrome remain unverified.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 1 Run 3 closeout

- Independent Run 3 result: **AMBER / PROCEED-WARN, ZERO BLOCKERS**.
- The gate accepted the durable v1-to-v2 membership-role migration in `483e55e` and its retained-envelope browser evidence; records checkpoint `a9a5981` remains the detailed Run 2 correction record.
- Wave 1 is **COMPLETE**. Lint remains a placeholder warning, and remote Supabase/RLS behavior remains unverified and is not inferred from local evidence.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 1 Run 2 correction

- Independent Run 2 result: **RED**. Retained pre-role version-1 durable envelopes lacked an explicit schema migration, so a hard reload could not guarantee truthful member roles.
- Fix commit `483e55e` introduces the version-2 envelope on the unchanged storage key and an explicit v1 migration. Existing valid roles, all collections/fields, and the monotonic revision are preserved; missing Jones `person-you` role becomes owner and other missing roles become member. Unsupported future versions and migration-write failures remain visible.
- Exact CDP at 320 CSS pixels loaded a retained v1 envelope through a hard reload: document width remained 320, Alex rendered as Owner, the retained custom trip rendered, storage became v2 at revision 11, and the custom event/message/notification plus owner + four member roles were preserved.
- Automated evidence: root tests PASS 35/35; app tests PASS 24/24; TypeScript, harness, Expo web export, and diff check PASS. Lint remains placeholder AMBER; remote Supabase/RLS remains unverified.
- The durable migration blocker is fixed. Wave 1 is ready for independent Run 3 and is not self-certified final GREEN.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 1 Run 1 correction

- Independent Run 1 result: **RED**. It found horizontal document overflow at narrow widths, ID-fabricated presentation roles, and no browser-verifiable selected-tab state. The earlier Wave 1 closeout below is provisional and superseded as final gate evidence.
- Fix commit `8480c17` clips decorative overflow, models `GroupMember.role` through local and Supabase adapter contracts, derives labels from actual roles, bounds Family/navigation layout, and exposes the active tab through a visible `Selected` marker while retaining tab/tablist and native selected-state semantics.
- Exact CDP evidence: at 320, 390, 430, and 1280 CSS pixels, HTML/body `scrollWidth` equaled `clientWidth`; Family and Owner were present; the DOM contained one tablist and five `role=tab` controls. Accessibility-tree names included `Family Selected` from the live visible marker.
- Automated evidence: root tests PASS 34/34; app tests PASS 23/23; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder AMBER.
- Run 1 defects are fixed, but Wave 1 is awaiting an independent Run 2 gate and is not self-certified GREEN. Remote Supabase and RLS remain unverified.

## 2026-07-13 — FAMILY-LOOP-FULL-001 Wave 1 closeout

- Accepted implementation checkpoints: `500ea77` and `e2f34f6`.
- Added group-scoped member reads across the service adapters, executable five-member/isolation/reconstruction coverage, a Query-backed Family screen with honest loading/error/empty states, and hash/history route parsing for tabs and exact event IDs.
- Automated evidence: root tests PASS 33/33; app tests PASS 22/22; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder and is AMBER, not substantive lint evidence.
- Chrome DOM at `#/family` contained Jones Family, five members, and selected Family-route semantics. Headless `--window-size` retained a minimum/intrinsic desktop layout, so it is not valid proof of 320/390/430 mobile viewport behavior. Interactive Back/reload was not proven; parser/formatter round-trip tests are narrower evidence only.
- This provisional closeout marked Wave 1 complete, but independent Run 1 above superseded that status. Remote Supabase, RLS, real-phone browsers, private media, and multi-user behavior remain `NOT RUN` and are not inferred.

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
# 2026-07-14 — Wave 5 mobile accessibility implementation handoff

- Added a single main landmark and placed the fixed five-tab navigation before it in DOM order. Tabs expose selected state directly, remain in sequential keyboard order, retain 48px targets, and use at least 11px labels; content clearance now keeps long forms above the fixed bar.
- Primary and state titles expose explicit heading levels. Loading updates are polite and failure feedback uses alert/assertive semantics where action is required.
- Photo cards have informative names derived from their visible title/subtitle; adjacent avatars are decorative. Repeated event/photo actions include the event title or photo caption.
- Invalid Create submission focuses the first invalid field and exposes stable labels, `aria-invalid`, and `aria-describedby` error relationships. Location/URL/name fields use conservative autocomplete and keyboard hints.
- Independent Run 1 was **RED** because inactive tabs used `tabIndex=-1` without arrow-key handling and therefore were unreachable by sequential keyboard navigation.
- The targeted fix keeps all five tabs sequentially tabbable while retaining tablist/tab roles and explicit selected state; it does not claim a roving-tab implementation.
- Fresh fix evidence: root tests PASS 44/44; app-local tests PASS 33/33; TypeScript PASS; harness PASS; Expo web export PASS. Lint exits 0 but is still a placeholder WARN.
- Independent Run 2 accepted Wave 5 at **AMBER / PROCEED-WARN with zero blockers**. Sequential keyboard traversal reached Home → Calendar → Create → Memories → Family; Enter routed each tab; the rendered page exposed one selected tab and one main landmark. At 320×844, document width, overflow, and fixed-navigation sanity checks passed.
- Authoritative automated evidence remains root tests PASS 44/44 and app-local tests PASS 33/33; the reviewed worktree was clean. Placeholder lint, the pre-existing React Native Web warning, physical iOS Safari/Android Chrome, browser screen readers, practical 200% zoom/reflow, reduced motion, and moderated older-adult testing remain warnings or `NOT RUN` and are not inferred.

## 2026-07-14 — Wave 6 full local Jones Family E2E closeout

- Accepted implementation/fix commit: `178a69e`.
- Run 1: **RED** — Calendar included completed Lake Geneva under upcoming, counted six shared plans, and selected June. Commit `178a69e` filters completed events and makes the upcoming agenda/count truthful.
- Run 2: **RED** — a transient avatar TypeScript blocker remained during the fix cycle.
- Run 3: **PASS, zero blockers** — Calendar truthfully showed five upcoming events; the final browser run had zero console errors after the avatar fix, apart from the separately known React Native Web warning.
- Authoritative automation: root PASS 45/45; app-local PASS 34/34; TypeScript, harness, Expo web export, and diff check PASS. Lint exits 0 but is a placeholder WARN.
- Isolated browser proof covered the fresh five-member Jones Family; three future seed trips and completed Lake Geneva; validation; exact-ID Dells and Chicago creation; Going/Maybe RSVPs; comments on both; Nathan Dumlao Unsplash URL media with verified creator profile but an opaque photo page that was not independently verified; deletion cancel/accept; and a real 68-byte PNG file choice with caption and alt text.
- Hard reload and Metro stop/restart retained envelope v3/revision 9. Home and Calendar showed five upcoming events; seed-only Run 3 showed three and excluded completed Lake Geneva. Family showed 5/5 and Lake Geneva memory showed exactly three photos and one comment. Exact routes/Back, 320/390/430/1280 widths, >=44px controls, keyboard navigation, one main, one selected tab, Lighthouse accessibility 100, and best practices 100 passed.
- Corrupt and future envelopes stayed visible and unmodified until deliberate recovery. In-session offline mutation was **NOT SEPARATELY EXERCISED**; only the local adapter architecture supports mutation after load. Cold offline reload **failed** with a browser network error because there is no service worker/offline shell; this is not recorded as a pass.
- Gate boundary: local Waves 0-6 are complete. Production mission remains IN PROGRESS pending the separate remote authorization gate. Supabase/RLS/private storage, auth/multi-user, physical Safari/Android, screen readers, practical 200% zoom, deployment, backup, and restore are `NOT RUN`.
# 2026-07-14 — Remote media repository-readiness implementation

- Added a forward-only media migration after initial infrastructure; the historical migration remains unchanged.
- Repository policy removes generic media mutations and exposes narrow begin/activate/abort/list/claim/finalize operations around persisted `pending`, `active`, and `deleting` states. Storage insert requires a matching pending row and owned path; update is unsupported; deletion requires a claimed row plus object ownership or group-manager authority. The event foreign key restricts deletion while any media operation exists.
- Supabase media mapping preserves caption, alt text, and source/creator attribution as separate fields. The previous migration-refusal branch is removed.
- Upload streams through a 1 MiB cap, validates MIME and image signatures, creates pending metadata before Storage, disables upsert, and activates only after the owned object exists. Delete first claims the row, then removes Storage and finalizes metadata only after object absence is verified. Interrupted operations remain hidden and queryable for retry/reconciliation.
- Event cancellation remains fail-closed when media metadata exists.
- Source-contract and migration assertions cover ordering, lifecycle states, revoked generic mutations, field parity, byte validation, operation order, and retryable errors. They do not substitute for live RLS tests.
- No remote project, credential, migration ledger, account, policy, bucket, object, environment, dependency, or deployment was accessed or changed. Live RLS and failure injection remain `NOT RUN` pending a named dedicated disposable project.
- Local Supabase later became available: the forward migration applied, database lint reported no schema errors, and `scripts/test-local-supabase-media.ps1` passed real signup-session uploader/member/owner/outsider metadata and Storage checks. Added passes cover a real decodable PNG, manager activation after uploader removal, concurrent abort/upload locking, quota/path/direct-mutation attacks, event FK restriction, and local-only/finally-safe test cleanup. Hosted RLS remains `NOT RUN`.
- Final independent security verdict: GREEN for repository/local media lifecycle with no remaining RED blocker. Current final gates are root 58/58, app-local 47/47, TypeScript, local migration/lint/lifecycle, harness, Expo web export, and diff check PASS; lint remains placeholder WARN.

## 2026-07-14 — Configured local Supabase multi-user browser proof

- Scope: local loopback Supabase only. No hosted project, remote account, deployment, credential file, or shared environment was created or changed.
- Browser sessions: Avery created Jones Family; Maya and Jordan completed invitation-bound signup and joined; an authenticated outsider remained isolated. Owner/member administration controls and direct-route isolation matched role and membership boundaries.
- Product loop: three trips, multi-user Going/Maybe RSVPs, event-scoped comments, completed-event Memories, two attributed Unsplash-source photos, and one actual local JPEG browser-file upload all persisted across reloads. Private image rendering used signed access.
- Browser lifecycle coverage also persisted an event edit, created and confirmed cancellation of a throwaway plan, transferred ownership from Avery to Maya, and transferred it back. The final state remained three members with Avery as sole owner and exactly two upcoming plans.
- Updates: database-generated recipient-scoped activity reached non-actors/current members. The owner cleared 14 unread updates through Mark all read; invitees retained separate counts.
- Corrective loop: real-browser Home initially stalled during the active-family transition. Commit `89d8720` removes the hard-coded initial family, validates restored selection, and evicts protected queries before publishing the next active family. Its focused transition regression passed 2/2; root 69/69, app-local 58/58, TypeScript, and Expo web export passed afterward.
- Mobile evidence: exact 320/390/430 CSS-pixel widths had no horizontal overflow. The 320 views exposed one main, one primary heading, and no visible control under 48×48 CSS pixels. Authenticated Home Lighthouse scored 100 Accessibility and 100 Best Practices; SEO was 67 and agentic browsing 50. Final fix commits `c6ee2b2` and `8703582` stopped partial remote-photo preview requests and supplied stable DOM form IDs/autocomplete metadata; a hard-reloaded 320px Event Detail with the remote-photo form open then showed zero console, warning, or Chrome Issues messages.
- Gate boundary: configured local Auth, Postgres/RLS, private Storage, multi-session persistence, and core-loop role isolation are proven. Hosted deployment/migrations/backup/restore, physical iOS Safari/Android Chrome, VoiceOver/TalkBack, moderated older-adult use, reduced motion, and practical 200% zoom remain `NOT RUN`; no production-readiness claim is made from local evidence.

## 2026-07-14 — OPORD and ADR evidence reconciliation

- Audited `README.md`, the 17 OPORDs and their dependency index, ADR 001, `docs/architecture.md`, `tasks/current-mission.md`, and this review log against commits through `88d0ed9` and the configured-browser/local-Supabase evidence.
- Replaced stale claims that Docker/local Supabase were unavailable, configured groups/media were unwired, Memories were fixture-only, or the default adapter was process-local.
- Added a criterion-level `COMPLETE`, `PARTIAL/CONDITIONAL`, or `NOT RUN` disposition to every OPORD without changing its historical mission, task table, or dependency graph.
- Local-complete conditional slices: OPORDs 001, 004, 007, 009, and 011. Partial slices: 002, 003, 005, 006, 008, 010, 012, 013, and 014. Not-run operational slices: 015, 016, and 017.
- The reconciliation explicitly preserves open gates for password recovery/production email, realtime subscriptions, reminder preference, representative query plans/performance budgets, incident tabletop, substantive lint/CI, hosted release/rollback, backup/restore/data lifecycle, physical iOS/Android, VoiceOver/TalkBack, practical 200% zoom, reduced motion, and moderated older-adult use.
- Verification for this documentation checkpoint: root test suite (including the new evidence-contract test), harness, OPORD stale-fact scan, dependency graph checks, and diff checks. No browser scenario, application runtime, database, Storage object, user, or remote environment was mutated.

## 2026-07-14 — OPORD 012 representative capacity and reconnect proof

- Recorded the approved local representative volume and phone-web budgets, added a deterministic 20-member/100-event/100-comment/50-media capacity check, and limited Home to 12 later plans per increment.
- Local Node measurements were 121.3 ms for parallel reads, 51.0 ms for Home/Event Detail selectors, and 518.0 ms for durable initialization plus reconstruction. Exact event identity, ordering, counts, and 20-person RSVP summary passed.
- At 390x844, the production export showed no horizontal overflow and opened the exact 100-comment/50-media event in 333.8 ms. A warm Slow 3G plus 4x CPU trace recorded 6,528 ms LCP and a 673 ms long task, failing the 4,000 ms and 200 ms budgets; startup/font delivery remains open.
- A configured loopback-Supabase outage retained the exact typed comment, exposed a visible retry, persisted one copy after recovery, and still showed exactly one copy after hard reload. The raw `Failed to fetch` message failed the calm-language criterion and is assigned to OPORD 013.
- The disposable retry event was cancelled through the UI. The read-only scenario verifier returned the original 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 3 Storage objects, and zero outsider residue.
- Cold disconnected reload, offline queues/background sync, hosted load/reconnect, physical phones, assistive technology, practical 200% zoom, reduced motion, and moderated older-adult use remain unsupported or `NOT RUN` as documented.

## 2026-07-14 — OPORD 013 local security and incident-response baseline

- Reproduced input: OPORD 012's configured loopback outage surfaced raw `Failed to fetch` during a comment send. Inspection found raw `error.message` propagation, unwrapped rejected transport promises, and raw Storage/RPC detail appended to media recovery states.
- Added one Supabase service-boundary wrapper. Rejected transport promises and returned backend errors now map to calm network, session, access, conflict, rate-limit, or unknown recovery messages. Deliberate validation/domain messages remain unchanged.
- Media upload/delete recovery keeps its existing state distinction (nothing kept, incomplete/reconcilable, activation pending, deletion pending, cleanup pending) without appending backend text.
- Focused tests inject synthetic credentials, access tokens, signed URLs, message content, storage paths, and SQL/backend detail; none appears in surfaced copy. A rejected configured-style `sendMessage` promise produces `We couldn’t reach LoopedIn. Check your connection and try again.`
- Fix loop: Run 1 implementation behavior passed, but the test incorrectly required retry wording in the access-denied message. The expectation was corrected to accept explicit access guidance; no product copy was weakened. Run 2 passed.
- Added `docs/runbooks/security-incident-response.md` with SEV levels, conditional owner, minimal evidence taxonomy, remote authorization gates, recovery validation, and a recorded local tabletop. The tabletop closed without production access, credential rotation, policy change, user contact, or data deletion.
- Final app-local tests PASS 61/61 and TypeScript PASS after the unknown-plain-error hardening. Root tests PASS 74/74 and harness PASS before that narrow hardening; Command owns the final campaign-wide rerun.
- Loopback family lifecycle PASS (four sessions, invitations, plans, RSVP, comments, media, notifications, and isolation). The media wrapper stopped before Node because Supabase status wrote an optional-service warning to stderr under strict PowerShell; the unchanged loopback-only media E2E was rerun with the working environment extraction and PASS (uploader/member/owner/outsider matrix).
- Secret scan matched only environment-variable names and documented scan commands, not values or private keys. `git diff --check` PASS with line-ending notices only.
- Remaining limitations: production telemetry, named hosted incident ownership, retention decisions, hosted enforcement, external assessment, and physical-browser failure copy are `NOT RUN`; local proof is not a production security certification.

## 2026-07-14 — OPORD 014 local mobile-web accessibility pass

- Added one shared React Native `AccessibilityInfo` preference hook. It defaults to reduced motion until the async platform result resolves, subscribes to `reduceMotionChanged`, and removes the listener on unmount.
- `SurfaceCard` now removes entrance displacement/fade duration when motion is reduced. `PhotoCard` and `Avatar` set Expo Image transitions to zero while preserving their existing 300 ms and 220 ms transitions otherwise. No dependency, redesign, data, auth, schema, deployment, or remote change was added.
- Focused executable contract tests pass 2/2 and verify initial safety, platform query/listener cleanup, reduced values, and retained normal values. TypeScript passes.
- A local-only production export was served on `127.0.0.1:8086`; data mode was explicitly `local`, and no hosted request was made. `scripts/check-opord14-mobile-accessibility.mjs` used the installed Chrome and Node runtime with a disposable isolated profile and no new package.
- Rendered evidence: 320/390/430 and desktop 1280 widths each had exact document width, one main landmark, five tabs, and one selected tab. Reduced-motion emulation matched in-page and retained exact width. Sequential focus reached Sign out, then Home → Calendar → Create → Memories → Family.
- Navigation/form evidence: `#/event/event-door-county?from=home` rendered as an exact-event deep link, Back restored `#/home`, and hard reload retained it. At 320x500, invalid Create submission focused the title input, exposed `aria-invalid=true` and `aria-describedby=title-error`, remained visible, and introduced no horizontal overflow.
- A 200% CDP page-scale proxy produced `visualViewport.scale=2` and a 160 CSS-pixel visual viewport without document-width overflow. This is not practical browser-zoom evidence and is not rounded up to that claim.
- Advisor red-team decision: defaulting to reduced motion until preference resolution avoids an opted-out first-paint animation; the tradeoff is that already-mounted cards do not retroactively replay normal motion, which is acceptable because motion is decorative.
- Final local gates: root PASS 75/75 (including all 62 app-scaffold tests), focused reduced-motion/accessibility PASS 2/2, TypeScript PASS, harness PASS, Expo production export PASS, repeat CDP smoke PASS, and diff check PASS. Lint exits zero but remains the known placeholder WARN.
- Physical iOS Safari/Android Chrome, VoiceOver/TalkBack, physical software-keyboard behavior, practical browser zoom/reflow, and moderated older-adult testing remain `NOT RUN`. OPORD 014 stays PARTIAL/CONDITIONAL.

## 2026-07-14 — OPORD 015 local CI quality gates

- User approval activated the previously gated lint dependencies. Exact `eslint-config-expo@9.2.0` and ESLint 9 flat config replace the placeholder; ESLint moved from the initially selected 9.25.1 to exact 9.39.5 after the audit exposed a patched moderate tooling advisory. The patched version remains inside the supported ESLint 9 line.
- The substantive zero-warning pass surfaced seven focused source findings: two array-style warnings, two unused imports, two unescaped JSX apostrophes, and one hook dependency caused by reading the initial route from the effect closure. Each was corrected in place without feature, style-system, data, or API changes. Lint and TypeScript pass afterward.
- `.github/workflows/ci.yml` defines stable `Application quality`, `Security and dependencies`, and `Migration integrity` checks. It uses `contents: read`, same-ref cancellation, timeouts, Node 22, the app lockfile/cache, no secret references, and commit-SHA-pinned official actions. Supabase CLI is exact 2.109.0 and fresh CI runners reset/apply/lint migrations without reaching a remote database.
- Verified official-ref pins: checkout v4 `34e114876b0b11c390a56381ad16ebd13914f8d5`; setup-node v4 `49933ea5288caeca8642d1e84afbd3f7d6820020`; setup-cli v1 branch `ab058987d8d6c725971f6cf9d0b5c98467e30bd1`.
- No-dependency validators scan tracked/non-ignored repository files without printing matched values and enforce migration naming, strict order, complete SHA-256 inventory, and base-ref immutability. High/critical dependency findings block; current 11 moderate Expo 53 transitive build-tool findings are owned by the repository maintainer for review by 2026-08-14 or the next approved Expo upgrade.
- Intentional failures all exited 1: unused TypeScript lint warning, one failing Node test, harmless fake named-secret assignment, historical migration modification, and earlier-timestamp migration. All seed files/edits were removed; clean secret and migration validators pass.
- The populated Supabase scenario was not reset. Read-only database lint passed, and the verifier retained 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media rows, 38 notifications, 3 Storage objects, and zero outsider residue.
- GitHub-hosted success/failure runs and administrator-required checks remain `NOT RUN`: no branch push, PR, or repository-setting mutation was authorized. OPORD 015 is therefore PARTIAL/CONDITIONAL rather than complete.

## 2026-07-14 — OPORD 016 local immutable release and rollback

- Added dependency-free release tooling for exact-commit Expo export, canonical manifest/digest generation, byte-verifying digest-addressed promotion, executable loopback CSP/security/cache/SPA policy, and baseline → candidate → baseline rehearsal. Install and export processes have explicit 300-second limits.
- Fix loop 1: Expo rejected an output directory outside the archived project. The builder now exports beneath the archived app before copying the result.
- Fix loop 2: a broad hosted-domain guard falsely matched Supabase SDK documentation strings. Isolation now relies on the stronger source/process boundary: exact Git archive, refusal of tracked non-example environment files, `EXPO_NO_DOTENV=1`, forced local data mode, and removal of supported Supabase variables.
- Fix loop 3: Windows PowerShell lacked `Convert.ToHexString`; hashing now uses compatible `BitConverter` output. Redirected `.cmd` launch and missing `$env:OS` were corrected with `cmd.exe` plus platform-enum detection.
- Fix loop 4: the first rollback run exposed non-canonical Windows separators in manifest paths. Both builder and verifier now canonicalize `/`; a focused regression assertion retains the contract. Rebuilt evidence supersedes prior interim digests.
- Final deterministic gate: two independent clean builds of `3cec45b` produced byte-identical 22-file manifests and digest `ef793a72101bb80a5c8f6fe40bd6425fcec7630e04fd1b32c1e25ea4b11117dd`.
- Final rollback gate: baseline `74e7e2b` (`e9cec97ac684069c1b8b3c8cb9493b5c185dfac0d64429bcdcba3a53f8b8493d`) promoted to candidate and returned to baseline. CSP/security headers, extensionless fallback, no-cache HTML, immutable hashed assets, release identity, and no mixed hashed path/bytes passed.
- Candidate browser evidence passed 320/390/430/1280 exact widths and landmark/tab contracts, reduced motion, sequential navigation, 200% page-scale proxy, exact-event deep link, Back/reload, and reduced-height invalid-form focus.
- Final gates: root PASS 80/80; app-local PASS 62/62; substantive lint and TypeScript PASS; Expo export, harness, secret scan, four-migration integrity, release-script contracts, and diff check PASS. The read-only populated-scenario verifier retained 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media rows, 38 notifications, 3 Storage objects, and zero outsider residue. Port 8087 had no listener after rehearsal cleanup.
- No hosted, database, Storage, DNS, TLS, deployment, secret, or production action occurred. Full OPORD completion remains blocked by compile-time backend configuration, hosted CI/environments/TLS, configured staging compatibility, named human approval/rollback authority, physical/mobile assistive-tech evidence, and a real hosted rehearsal.

## 2026-07-14 — OPORD 017 local backup, isolated restore, and lifecycle dry run

- Added dependency-free PBKDF2-SHA256/AES-256-GCM authenticated encryption, selected logical-schema backup, private Storage byte capture, migration/object hashing, isolated restore, and deterministic non-destructive lifecycle planning.
- Fix loop 1: whole-cluster and clean schema restores collided with Supabase-managed hooks. The archive narrowed to authoritative application/auth/storage schemas and restores into a fresh database rather than cleaning a bootstrap database.
- Fix loop 2: `pg_isready` observed the image's temporary init postmaster. Waiting for Docker health `healthy` removed the planned-shutdown race.
- Fix loop 3: restored RLS lacked grants when privileges were omitted. Normal ACLs are restored while role-owned default ACL entries are filtered; member and outsider queries pass.
- Final drill: authenticated-encrypted payload 608,653 bytes; exact counts 4/1/3/3/6/6/3/38/4/3; three object hashes/sizes and all migration hashes pass; missing event/object/media references are 0/0/0.
- Restored RLS allowed the selected member 3 events/6 messages/3 media and returned 0/0/0 to the outsider. Observed snapshot age was 14.806 seconds and restore 7.745 seconds; neither is an approved RPO/RTO.
- Live self-scope dry run found 21 owner candidates, all protected/blocked with no apply mode, and zero row/object discrepancies. Tests deny cross-user planning, exclude foreign IDs, prove deterministic bounds, authenticate encryption/tamper failure, and exercise both orphan directions.
- The primary stack was read-only except removal of its temporary dump files. The populated scenario remained retained; disposable restore/plaintext and the test-passphrase artifact were removed.
- Review verdict: **AMBER / PROCEED-WARN, zero local blockers**. Hosted backup/PITR/schedules, product/legal retention/grace/erasure policy, approved RPO/RTO, complete authenticated encrypted export, deletion/apply, and hosted restore remain required.

## 2026-07-14 — OPORD 003 local password recovery

- Added the minimal Auth contract and configured flow for neutral reset requests, provider recovery events, password replacement, and invalid/replayed callbacks. Invite-first signup and the local profile demo remain unchanged; no settings/profile center, schema, dependency, remote configuration, or production email work was added.
- Known and unknown loopback requests returned identical status/body and rendered the same confirmation. Only the disposable known account received Mailpit mail. The exact approved callback produced a recovery session; replacement made the old password fail and the new password pass. Replay and malformed verification returned no session.
- Configured Chrome at 390×844 passed no overflow, one primary heading, 52px controls, email/current/new-password metadata, mismatch validation, replacement, authenticated return, old/new UI sign-in, authenticated reload, replay/invalid new-link recovery, and offline connection copy.
- Fix loop 1: the local exact redirect allowlist correctly stripped a query marker. Recovery detection now snapshots only provider fragment type/error presence before Supabase consumes it; no token enters app state, logs, or evidence.
- Fix loop 2: replay initially remained on the loading screen because a signed-out provider event superseded restore. Signed-out callback events and restore rejection now deterministically publish the invalid state.
- Fix loop 3: Supabase's retryable Auth transport error initially mapped to generic unknown copy. The service boundary now categorizes retryable/status-zero Auth failures as network errors and retains the calm connection-specific recovery message.
- Both harnesses delete their synthetic user/message and isolated browser profile in `finally`; explicit residue checks returned zero. The retained `family-browser-v1` scenario was not mutated.
- Final gates: app-local PASS 64/64; root PASS 86/86; focused recovery service and configured-browser E2E PASS; substantive lint PASS with zero warnings; TypeScript PASS; configured local Expo export PASS; harness PASS; secret scan PASS across 186 repository files; and diff check PASS with line-ending notices only.
- The read-only populated-scenario verifier retained 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media rows, 38 notifications, 3 Storage objects, and zero outsider residue. Recovery auth residue, Mailpit message residue, and the temporary port 8086 listener each returned zero after cleanup.
- Local verdict: **GREEN** for OPORD 003's implementable slice. Hosted mail/redirects/rate limits, physical browsers/assistive technology, and production operations remain `NOT RUN`.

## 2026-07-14 — OPORD 008 local event realtime convergence

- Added one synchronous `ThreadApi.subscribeMessages(eventId, onChange, onStatus)` contract. Supabase creates one `postgres_changes` channel filtered to `loopedin_event_messages.event_id`; memory and durable-local implementations are truthful no-ops.
- Query owns reconciliation: change and `SUBSCRIBED` callbacks invalidate only `queryKeys.messages(eventId)` with `exact: true`. No payload is inserted into cache, so stable-ID ordered server history remains authoritative and duplicate-free.
- Deterministic tests prove the exact filter, connected/reconnecting status mapping, one convergence callback per subscribe/change, idempotent `removeChannel`, and inert callbacks after teardown.
- The two-client loopback RLS harness passed: Maya received Event A once, unrelated Event B and outsider received zero, resubscription converged exactly two stable-ID rows, and client channel lists returned zero after cleanup.
- Three isolated configured-app Chrome profiles passed the rendered proof. Owner UI Send appeared once for Maya without reload; Event B and a switched route stayed isolated; stopping only `supabase_realtime_family-loop` created a genuine missed comment, restart/resubscribe recovered it once; outsider received nothing.
- Both harnesses delete disposable events in `finally`; event cascade removed their comments/notifications. The retained verifier returned the original 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 3 Storage objects, and zero outsider residue. After browser shutdown, `realtime.subscription` was zero and the Realtime container was healthy.
- Final gates: root PASS 87/87 (including the 65 app-scaffold tests); substantive lint and TypeScript PASS; Expo web export, harness, secret scan across 190 files, four-migration integrity, database lint, local family lifecycle, local media lifecycle, both realtime harnesses, populated-scenario verification, and diff check PASS.
- Local verdict: **GREEN**. Hosted Realtime/RLS, physical Safari/Chrome, assistive technology, long-outage behavior, and human usability remain `NOT RUN`.

## 2026-07-14 — OPORD 010 reminder preference local gate

- Scope stayed narrow: existing reminder table/RLS, one service/query seam, one Event Detail card, tests, harnesses, and docs. No schema, dependencies, settings center, delivery worker, push, email, SMS, or scheduler were added.
- Service review PASS: exact-current-user/event reads; idempotent enable/upsert and disable/delete; mock/durable/Supabase parity; v1–v6 to v7 migration; event deletion cascade; protected query eviction and exact user/event invalidation.
- Multi-user review PASS: Alex/Maya durable actors and two real Auth/RLS sessions held independent same-event preferences across reconstruction/relogin. Repeated owner disable left Maya intact. Outsider direct-ID event read returned none and reminder insert was denied.
- Rendered review Run 1 RED: the 48px React Native Web switch had `role=switch` but lacked DOM `aria-checked`; `accessibilityState.checked` alone was insufficient in the observed build.
- Fix Run 2 GREEN: explicit `aria-checked` rendered and tracked Off/On. At 390×844 the control measured 48px, keyboard traversal produced `:focus-visible`, exact event hash and preference survived reload, and document/client widths were 390/390.
- Failure review PASS: stopping only local Kong made disable fail; the switch remained at confirmed On, calm copy said the choice was ready to retry, and `Retry turning off` preserved exact intent. After Kong restart the same retry persisted Off.
- Product/UX judgment: one fixed `Morning of event` choice is KISS and comprehensible; the adjacent sentence truthfully calls it an in-app preference and says push/email delivery are inactive. No copy promises that a notification will be scheduled or received.
- Cleanup PASS: both harnesses delete preference rows in `finally`; final scenario is exactly 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 Storage objects, and zero outsider residue.
- Final verification PASS: root 88/88, app-local 66/66, substantive lint, TypeScript, configured Expo export, harness, 194-file secret scan, four-migration integrity, database lint, family/media/reminder matrices, configured reminder browser, scenario verifier, and diff check. High/critical dependency audit gate passes; 11 moderate transitive Expo-toolchain advisories require a breaking Expo upgrade and remain advisory/out of scope.
- Local gate: **GREEN, zero local blockers**. Hosted policy state, production delivery, physical phone browsers, VoiceOver/TalkBack, and moderated family/older-adult use remain `NOT RUN`; delivery remains outside this OPORD.

## 2026-07-14 — OPORD 012 focused mobile-web performance correction

- Scope stayed inside the measured startup blockers: labeled bottom navigation, decorative card entrance, a dependency-free CDP measurement script, focused source contracts, and evidence docs. No service, schema, auth, remote, list architecture, dependency, or budget changed.
- Baseline local production export used `EXPO_NO_DOTENV=1` plus explicit local data mode. It contained 2,286,293 bytes of JavaScript and 3,890,364 bytes across 19 icon-font files (6,177,881 bytes total). No configured hosted URL was present or called.
- Baseline three-run 390x844 warm profile at 500 kbps/400 ms RTT plus 4x CPU: LCP 2,156/2,352/2,292 ms; longest tasks 332/170/127 ms; CLS 0.057/0.058/0.058; width 390/390 each. Run 1 reproduced the >200 ms failure. Resource timing loaded the 442,604-byte Ionicons font; the prior DevTools trace had independently recorded 2,050 ms icon-font delay.
- The smallest KISS fix removed redundant icons from the five already text-labeled tabs and replaced the Moti `SurfaceCard` entrance wrapper with a static `View`. Image crossfades retain platform reduced-motion handling. No package was added or upgraded.
- Candidate export contains one 980,027-byte JS bundle and no font assets (981,256 bytes total): 57.1% less JavaScript and 84.1% fewer artifact bytes.
- Final authoritative Chrome 150 three-run gate: LCP 2,200/2,208/2,368 ms; longest tasks 170/110/91 ms; CLS 0.057 each; width 390/390 each; configured-backend requests zero. All unchanged <=4,000 ms LCP and <=200 ms longest-task budgets pass. The exact `Door County Weekend` route reached its final heading and usable Going/Maybe actions in 646 ms.
- Responsive/accessibility regression passed exact 320/390/430/1280 widths, one main/five tabs/one selected tab, reduced-motion emulation, five-tab sequential focus, 200% page-scale proxy, deep link, Back, reload, and 320x500 invalid-field focus/visibility. Tab targets remain 58px high and labels remain 12px.
- Review verdict: **GREEN for the local OPORD 012 performance slice, zero local blockers**. Physical iOS Safari/Android Chrome performance, VoiceOver/TalkBack, practical zoom, hosted load/reconnect, and moderated older-adult use remain `NOT RUN` and are not inferred from desktop Chrome emulation.
- Final gates: root PASS 90/90; app-local PASS 68/68; focused capacity/static-navigation PASS 3/3; substantive lint and TypeScript PASS; local-only production export, performance CDP, accessibility CDP, harness, 195-file secret scan, four-migration integrity, high/critical dependency audit, local family/media matrices, database lint, populated-scenario verification, and diff check PASS. The retained scenario remains 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 objects, and zero outsider residue. Eleven moderate Expo-toolchain advisories remain unchanged because remediation requires an out-of-scope breaking Expo upgrade.

## 2026-07-14 — OPORD 016 public runtime configuration and identical artifact

- Added one strict web bootstrap overlay and lazy service/client creation. Native/dev compile-environment behavior remains unchanged. The overlay is public-only, exact-schema, no-store, never logged, and rejects unknown modes/fields, unsafe URLs, and secret/service-role keys before App renders.
- Fix loop 1: Expo export emitted a split App file without an active async bundle loader; browser evidence failed with `Requiring unknown module "163"`. Static module loading plus the existing render gate and lazy service/client removed the unsupported split while preserving config-before-creation ordering.
- Fix loop 2: promotion accepted only schema-v1 environment-bound manifests. The verifier now supports historical v1 rollback artifacts and environment-neutral v2 runtime artifacts while rejecting v2 manifests that carry an environment ID or non-runtime mode.
- Final candidate `0.1.0-522aed7217ea`, digest `12925c40f8068afbaa58b3dd5a7b132ed405e9e510adc90310945e72ca27f38d`, contains three files and no tested environment endpoint/key/project ID. It ran unchanged under local-demo and loopback-Supabase overlays; environment/CSP changed while release identity did not.
- Browser gate passed exact widths 320/390/430/1280, one main/five tabs/one selected, reduced motion, keyboard/focus, 200% scale proxy, exact deep link, Back/reload, and reduced-height validation. Configured mode rendered its environment and `Welcome back`; rejected service-role-looking config rendered the accessible unavailable state and no backend CSP.
- Runtime candidate performance stayed within OPORD 012: LCP 3,252/2,712/2,668 ms, longest tasks 178/115/94 ms, exact-event 648 ms, width 390/390, zero backend calls. Artifact/config rollback restored baseline/local and left no port listener.
- Verdict: **GREEN for the local runtime-config/rehearsal slice**. The loopback overlay used the existing local Supabase stack, so distinct hosted backend compatibility, host/DNS/TLS, named operators/custody, GitHub-hosted green commit, physical devices/AT, staging deployment/rollback, and production approval remain `NOT RUN`.

## 2026-07-14 — Final configured multi-user browser replay

- Built a static web export with dotenv disabled and explicit loopback Supabase configuration. Bundle inspection included the loopback API and excluded the hosted-project domain.
- A disposable four-profile run completed signed-out denial, family create/invite/revoke/decline/accept, ownership round-trip, remove/reinvite, leave/reinvite, plan create/edit/cancel, all RSVP states, three-user comments, URL and actual-file photos, authorized/denied deletion, reminder persistence, individual/all notification reads, Memories, exact routing/Back/reload, logout/restore, recovery, and outsider direct-ID denial.
- Browser checks passed 320/390/430/1280 exact widths, one main, five tabs, one selected tab, >=48px actions, reduced motion, and zero console events. Browser realtime passed an actual container outage/reconnect exactly once; reminder and recovery outage/retry paths passed.
- Fix loop 1 added same-tab invitation hash synchronization. Fix loop 2 made safe service-error sanitization idempotent so offline recovery retains actionable network copy.
- Contrast review found hidden-state failures: coral and sage semantic text were below 4.5:1 on light surfaces. Error/emphasis text now uses berry (>=5.03:1) and success text uses plum (>=8.07:1); a regression blocks coral/sage as small semantic screen text.
- Disposable marker cleanup returned zero residue, Realtime subscriptions were zero, and retained `family-browser-v1` remained exact at 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 objects, and zero outsider residue.
- Practical Chrome UI 200% zoom, physical phone browsers, VoiceOver/TalkBack, moderated older-adult use, hosted Supabase/deployment/email/operations remain `NOT RUN`; the local browser verdict does not close those gates.
# 2026-07-14 — OPORD 017 authenticated encrypted current-user export

- AMBER scope decision: export only the signed-in account profile/memberships and content it created, authored, uploaded, or selected. This avoids silently disclosing a shared family archive while product ownership policy is absent.
- Added one service-composed collector and one reusable Family/no-family card. No adapter API, schema, dependency, Auth flow, settings center, server privilege, deletion behavior, or remote mutation was added.
- Owned media is fetched through the authorized URI and stored as bytes/type/size/SHA-256; the URI never enters plaintext. Unavailable bytes remain explicit in the encrypted manifest and a new export retries the read.
- Independent Run 1 was RED: media used a post-buffer size check, raw comment objects could retain an author avatar URI, and verifier/count evidence was incomplete. The fix streams through a pre-allocation 1 MiB ceiling with a 15-second abort, allowlists comment fields, recomputes manifest counts/scope/timestamp, and adds oversized/hung/avatar/integrity regressions plus configured file hash/count assertions.
- Executable crypto/isolation tests pass for two local actors, AES-256-GCM/PBKDF2 round trip, inner integrity, wrong passphrase, ciphertext tamper, unavailable-media reporting, and retry.
- Configured Chrome proof used real isolated Auth sessions for Avery, Maya, and the outsider. Three actual downloads decrypted; all personal records matched the current user, foreign IDs were pairwise absent, signed URL patterns were absent, and outsider data was minimal. Exact 390px layout was 390/390 with 52px inputs, 48px action, visible input focus, retained mismatch retry, and zero console events.
- The proof was read-only. The retained verifier remained exact at 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 objects, and zero outsider residue.
- Independent Run 2: **GREEN, zero blockers/advisories**. The reviewer confirmed the streamed media bound/timeout, allowlisted comment DTO, manifest consistency verifier, adversarial regressions, configured byte/hash/count/reminder assertions, and truthful limits. Hosted export operations/server audit, shared-family scope, physical phones/AT, and all deletion/grace/retention behavior remain open.

## 2026-07-14 — OPORD 014 persisted Chrome zoom and mobile UX review

- Chrome 150 initialized isolated disposable profiles with `partition.default_zoom_level.x = log(2) / log(1.2)`. Same-window controls measured 640→320, 780→390, and 860→430 CSS pixels, DPR 1→2, `visualViewport.scale=1`, and CSS zoom 1. The harness contains no page-scale or CSS-zoom command.
- Configured Auth sessions covered signed-out, owner, member, and outsider at 100%/200%; the 390px matrix spans 18 screen states per zoom, full owner core-screen sweeps run at native effective 320/390/430, and 1280 CSS pixels is the secondary desktop 200% regression.
- Exact roles, auth/recovery, Today/Updates, Calendar, Create validation, Memories, Family/invite/export, Event Detail/edit/RSVP/thread/reminder/photo form, Back/deep-link/reload, and outsider denial pass. The retained scenario remained unchanged after the read-only run.
- Fix loop: the initial box-only gate missed a Calendar chip whose glyphs rendered to x=510.09 in a 500px viewport while the outer action ended at x=459. Adding `flex: 1`/`minWidth: 0` to the agenda copy fixed the P2; the strengthened gate checks >=48px height plus control-box and descendant-text containment.
- Browser evidence is zero for document overflow, clipped control boxes or descendant control text/glyphs, sub-48px controls, console warnings/errors/exceptions, failed requests, and functional app/backend HTTP errors. The optional browser-generated `/favicon.ico` 404 is recorded as P3 and explicitly excluded.
- Independent accessibility review was **AMBER / PROCEED-WARN, zero blockers**. It confirmed genuine native browser zoom and readable reflow; its threshold/glyph/width advisories became fix-wave requirements and were corrected. Broad keyboard activation/focus-ring claims remain grounded in the prior dedicated keyboard harness; this run adds invalid-field focus plus pointer navigation, Back, and reload only.
- KISS/industry review required effective 320/390/430 rather than only 390; the added owner matrices close that P2 evidence gap. Physical phone browsers, assistive technology, physical software keyboards, and moderated older-adult sessions remain conditional and are not inferred.
- Targeted post-fix UX re-review was **GREEN, zero P0-P2**. It confirmed the 320/390/430 evidence closure and requested only the wording precision that glyph containment applies to interactive controls, not universal body-text measurement.
- Final gates: root PASS 100/100; app-local PASS 75/75; TypeScript, ESLint, harness, 208-file secret scan, five-migration validation, local database lint, real Chrome zoom replay, and diff check PASS.
