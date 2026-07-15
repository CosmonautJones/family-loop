# Current Mission

Mission ID: `FAMILY-LOOP-FULL-001`

Status: `IN PROGRESS — CONFIGURED LOCAL CORE LOOP COMPLETE — OPORDS RECONCILED — EXTERNAL RELEASE/OPERATIONS GATES PENDING SEPARATE AUTHORIZATION`

Decision charter: **Correctness > Safety > Scope discipline > Speed.**

Latest checkpoint: Dedicated hosted Supabase project `vkogznsfthirhxkqysza` records all six checked forward migrations and the first real account/family bootstrap: one confirmed Auth identity and `Travis Jones` profile, one `Jones Fam`, and exactly one owner membership with a consumed creation entitlement. Hosted Data API defaults initially left authenticated-only security-definer RPCs executable by `anon`; forward migration `20260715123221_restrict_hosted_rpc_execute_grants.sql` removes those direct grants and read-back leaves only the two intentional invitation preflight functions anonymous. Independent review then found and the fix loop closed an invited-account token-format blocker, with regression coverage for all 18 protected RPC grants. Exact-head CI run `29451842237` and artifact digest `7a18b2f5…fc3c8c` produced immutable deploy `6a57fc726b558b21faf57459`, now published at `https://loopedin-family.netlify.app` as release `0.1.0-3cf45367dc85`; Auth Site URL/redirect custody includes it, and exact-deploy rollback to `6a57f034…` and restoration to `6a57fc72…` passed without database reversal. Hosted recovery dispatch and hardened synthetic run `qa-mrml3fsl-a08c4f8e` prove the synthetic owner/member/outsider family, events, RSVP, comments, reminders, notifications, private media, Realtime, denial, and zero-residue matrix. User-observed password replacement is still pending. Real state still contains one validation event named `Testing` and one RSVP, while comments/media/Storage remain empty; this residue must be replaced with realistic starter content. Roles currently support owner/member only, and family invitations do not send email. The unrelated Supabase project and personal Netlify site remain untouched. Real-account browser core loop, custom SMTP/invitation delivery, telemetry, backup/restore, physical devices/AT, custom domain, and production approval remain open.

OPORD 005's local response-loss gap is closed for event and comment creation. The UI retains a UUID operation key across an unchanged visible retry, rotates it after edits/success, and never auto-retries writes. Durable-local v8 and loopback Supabase private operation maps replay the same authoritative row exactly once, while distinct operations and cross-user key collisions stay distinct. The isolated family/RLS harness and retained populated-scenario verifier pass; authoritative counts remained 8/2/6/5/9/9/4/60/1. Server correlation, universal deadlines/rate enforcement, hosted readiness, and non-event/comment write idempotency remain explicit gaps.

The configured responsive-web core loop now also passes one read-only semantic matrix in installed Edge 150 and stock Firefox 151 at 390/430. Both cover signed-out recovery entry, owner session/core screens/private photo, member role safety, outsider denial, exact routing/Back/reload, notifications, invite/export reachability, 48px two-dimensional targets, and zero console/network/backend failures. The run found and corrected a narrowly scoped release CSP omission for the already validated runtime media origin. Exact source `31c74466e6faba2e9824cc5c7046c2fbfad5c269` rebuilt as release `0.1.0-31c74466e6fa`, SHA-256 `a8c41774b3cb4bbedc8cc53eb14af95a3f23227d9627e9778df58b568c0ef740`; both engines reran green and independent review closed GREEN. Safari, physical devices, assistive technology, and moderated older-adult use remain external gates.

OPORD 017's local authenticated export slice is also complete. The Family/no-family surfaces produce a client-encrypted current-account contribution bundle with owned photo bytes, counts, and integrity metadata. Owner, member, and outsider actual browser downloads passed decryption and cross-user exclusion without mutating the retained scenario. Shared-family archive scope, hosted export operations, and every destructive deletion behavior remain open.

## Commander's intent

Deliver LoopedIn as an elegantly simple, genuinely usable responsive-web family account experience. A family should be able to open the app on a phone browser, understand what is next, plan trips and gatherings, RSVP, converse, share photos, and revisit completed events without losing identity or context.

The canonical demonstration account is the **Jones Family**, populated with several realistic future trips and gatherings, event-scoped comments, attendance, and legally reusable sample photos. No fixture, screenshot, schema, or adapter may be represented as remote production evidence.

## Objective

Complete the product from its current service-backed prototype to an end-to-end responsive web application with:

- a durable family/group, user, event, RSVP, conversation, photo, reminder/update, and memory lifecycle;
- clear, forgiving mobile-web UX suitable for older adults, with desktop web remaining usable;
- robust, observable connections to the server, database, private media storage, and authenticated authorization boundary;
- a reproducible Jones Family scenario exercised from sign-in through planning, sharing, commenting, reload/recovery, and recap;
- automated, browser, accessibility, security, data-isolation, deployment, rollback, and recovery evidence appropriate to each wave.

## Non-goals

- Public profiles, followers, feeds, discovery, direct messages, billing, teams, admin dashboards, AI features, marketplaces, or generic project-management features.
- Native iOS/Android applications, app stores, EAS builds, or native-only dependencies.
- Broad visual redesign unrelated to clarity, touch use, accessibility, or the event-centered loop.
- External calendar sync, web push, or service-worker complexity unless separately authorized after the core loop is proven.
- Silent fallback from a configured backend to mock data.
- Copyright-incompatible images or committed remote secrets.

## Campaign authority and safety boundary

The user authorized completion of the full local application campaign and requested sequential command execution and fix loops. That authorization does **not** authorize remote or shared-sandbox mutation without a separate explicit gate.

### GREEN — proceed

- Read-only inspection and local verification.
- File edits inside the active wave's explicit manifest.
- Local tests, builds, browser smoke checks, and deterministic local seed creation.
- Reversible local database/service work using non-secret development configuration.
- Patch/minor dependency adjustments when already within an authorized OPORD.

### AMBER — choose the simpler path and log it

- Two valid interpretations within the active wave.
- A required test tool is unavailable; preserve truthful `NOT RUN` evidence and use the strongest safe substitute.
- A significant but non-breaking implementation choice inside owned territory.

### RED — halt and obtain explicit authorization

- Creating, changing, deleting, or seeding any remote/shared Supabase project, database, storage bucket, user account, deployment, DNS record, or hosted environment.
- Handling or exposing credentials, service-role keys, passwords, tokens, `.env` contents, or personal data.
- Destructive or irreversible operations, data-loss migrations, force-pushes, remote pushes/PRs, or production deployment.
- New major dependencies, breaking public API/schema changes, or scope expansion beyond the active wave.

## Authorized campaign territory

Later waves may edit only files named by their approved OPORD/task manifests. Intended campaign territory is:

- `app/**` for responsive-web product implementation and tests;
- `supabase/**` for additive migrations, policies, seed support, and local verification;
- `tests/**` and `scripts/**` for contracts, browser/integration checks, and harness work;
- `docs/**`, `tasks/**`, and `evals/**` for architecture, OPORD, evidence, risk, and review records;
- root package/configuration files only when an approved wave explicitly names them.

## Forbidden territory without a new gate

- Auth, deployment, notification delivery, dependency installation, or database/schema mutation outside the active approved wave.
- User-owned unrelated worktree changes.
- Remote/shared infrastructure and real accounts.
- Secrets and credential files.
- Native platform implementation.

## Ordered campaign waves

Each wave must consume the relevant OPORDs in `docs/opords/README.md`, use file-disjoint atomic tasks where practical, pass its review gate, update the review log, and reach a committed checkpoint before the next wave starts.

0. **Durable local service foundation** — replace process-only behavior with a reload-durable local service path and deterministic Jones Family seed data without remote mutation.
1. **Mobile-web shell and older-adult usability** — navigation, deep links/reload, phone viewport behavior, touch/focus/zoom/reflow, readable language, and forgiving recovery.
2. **Identity and family membership** — minimal authentication, session recovery, family creation/invitation/membership, and explicit no-family states.
3. **Persistent planning loop** — create/edit/cancel trips and gatherings; Home/Calendar/Event Detail identity, chronology, RSVP, and refresh correctness.
4. **Event conversation** — durable comments, authorship, ordering, pending/error/retry behavior, and event isolation.
5. **Private photo sharing** — browser file selection, validation, private upload, signed access, captions/gallery/delete, and event isolation using reusable demonstration media.
6. **Updates, reminders, and memories** — in-app updates, durable reminder state, completed-event recap, and memories derived from real completed events.
7. **Server/database hardening** — additive schema evolution, RLS, storage policies, realtime where justified, idempotency, error contracts, observability, and two-family isolation tests.
8. **Full Jones Family journey** — create or seed the complete scenario, exercise multiple users, several planned trips, photos, comments, RSVPs, reloads, offline/error recovery, and recap behavior end to end.
9. **Quality and security gate** — substantive lint, unit/integration/browser E2E, mobile Safari/Chrome evidence, accessibility, performance, dependency/security review, and data/privacy controls.
10. **Release and operations** — only after the remote gate: hosted environment, migrations, deployment, TLS/security headers/cache policy, monitoring, backup/restore, rollback, runbooks, and final acceptance.

Later waves are planned, not complete. Their precise manifests and acceptance criteria must be confirmed from the applicable ADR/OPORD immediately before execution.

## Wave 0 OPORD — durable local service foundation

### Situation

The current event and message loop works through a deterministic in-memory mock adapter and has Supabase contracts/migrations, but mock mutations reset on browser/process restart and remote Supabase behavior is unverified. A real end-to-end campaign needs a trustworthy local baseline before authentication, media, or shared infrastructure work begins.

### Mission

Create a durable, deterministic local service mode that preserves the existing service contract, survives browser reloads, and supplies the Jones Family scenario needed by later waves. Keep configured Supabase failures honest and make no remote/shared mutation.

### Exact Wave 0 manifest

- `tasks/current-mission.md`
- `app/src/services/**`
- `app/src/lib/storage.ts`
- `app/src/types/domain.ts`
- `app/src/features/home/fixtures.ts`
- `app/src/features/events/fixtures.ts`
- `app/src/features/groups/fixtures.ts`
- `app/src/features/memories/fixtures.ts`
- `tests/app-scaffold.test.js`
- `docs/architecture.md`
- `evals/review-log.md`
- `evals/code-rubric.md`
- `evals/regression-checklist.md`

### Atomic tasks

1. **W0-RECON — authoritative contract audit (read-only).** Map adapter selection, service contracts, mutable mock behavior, fixture IDs, query keys, and existing tests. Record contradictions before implementation.
2. **W0-PERSIST — local persistence primitive.** Add the smallest browser-safe, versioned persistence boundary needed by the local adapter. Serialization, malformed data, and unsupported versions must produce visible errors; they must never silently reset or reseed. Provide an explicit reset/reseed operation for deliberate recovery, and store no credentials.
3. **W0-SEED — Jones Family dataset.** Define stable users/memberships, three future trips, one completed event, RSVPs, event-scoped comments, and media metadata/placeholders suitable for later browser-photo work. Dates are fixed relative to the mission clock of 2026-07-13 so Home promotes a future event and Memories has one completed source event.
4. **W0-ADAPTER — durable adapter integration.** Preserve the existing `LoopedInService` service boundary; make unconfigured local mutations survive browser reload while retaining test isolation. Configured Supabase mode must never fall back silently.
5. **W0-TEST — contract and restart verification.** Prove create/update/read, RSVP, event-isolated comments, durable media metadata mutation, ordering, explicit reset/reseed, reload/re-instantiation durability, visible serialization/malformed/unsupported-version errors, zero-event behavior, and configured-backend honesty.
6. **W0-DOC — evidence and architecture update.** Update `docs/architecture.md`, `evals/review-log.md`, `evals/code-rubric.md`, `evals/regression-checklist.md`, and this current mission record with exact commands, results, limitations, and risks. Do not imply remote persistence.
7. **W0-GATE — independent review/fix loop.** Run the complete Wave 0 gate. Apply up to three targeted local fix loops for failures; stop on RED conditions.

### Wave 0 execution status

- W0-RECON through the initial W0-DOC handoff produced the durable local adapter, version-1 storage envelope, canonical Jones Family seed, explicit memory test mode, configured-Supabase failure boundary, and initial automated contracts.
- External/reviewer Run 1: **RED**. The gate found a stale multi-adapter lost-update risk and an incomplete serialization rollback boundary. The previous AMBER/completion claim and its automated results remain historical run evidence, but are superseded as Wave 0 completion evidence.
- The targeted Run 1 persistence correction is **COMPLETE**. Fresh internal evidence: root tests PASS 29/29; app tests PASS 18/18; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder and is WARN, not substantive lint evidence.
- Independent internal review confirms the revisioned envelope; latest-state deterministic replay under a per-key lock; retention of both A+B event mutations; retention of concurrent RSVP, message, and media mutations; and safe stringify-failure rollback and reset behavior.
- External Run 2 accepted the corrected Wave 0 checkpoint: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. The gate accepted 40 adversarial mutations as evidence of same-runtime coordinated durability. The exact mutation mix was not supplied in the gate handoff and is not inferred here.
- Fix acceptance requires: a revisioned persistence envelope; same-runtime, per-key serialization; a latest-state re-read followed by replay or a visible conflict so acknowledged data is preserved; rollback across stringify, storage-write, and validation failures; and multi-instance regression tests.
- Coordination must be described honestly: use `navigator.locks` when available with an explicit module-level fallback, and document that the fallback cannot guarantee cross-tab serialization on Safari where Web Locks is unavailable. Cross-tab durability beyond the exercised mechanism must not be inferred.
- Wave 0 is **COMPLETE**. Fresh fix evidence remains root tests PASS 29/29; app tests PASS 18/18; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder WARN.
- Campaign status remains **IN PROGRESS** and Wave 1 is pending authorization. Wave 0 completion does not claim an actual browser hard reload, remote Supabase, RLS, private media, multi-user behavior, later waves, or the full application. Safari/no-Web-Locks cross-tab atomicity remains unproven, and Unsplash attribution/domain handling remains a media-wave follow-up.

### Wave 0 acceptance criteria

- The existing public `LoopedInService` boundary remains compatible; no screen imports storage directly.
- Unconfigured/local event, RSVP, comment, and media metadata mutations survive a browser reload or adapter re-instantiation.
- Tests start from a deterministic clean state and cannot leak persisted state between cases.
- Serialization failures, malformed data, and unsupported versions are visible errors and never silently reset or reseed; a deliberate explicit reset/reseed restores the canonical seed.
- The Jones Family seed has stable identities, exactly three future trips and one completed event relative to 2026-07-13, per-event comments, attendance, and media metadata/placeholders; event identities remain consistent across Home, Calendar, Event Detail, and Memories.
- Seed chronology promotes a future event as next on 2026-07-13 and preserves one completed event for recap/memory work.
- A configured Supabase failure remains visible and never uses the local seed as fallback.
- No secret, remote user, remote database row, remote storage object, or deployment is created or changed.
- Architecture and review records distinguish local browser durability from authenticated server/database durability.
- Focused tests, full app tests, TypeScript, root tests, harness, diff check, and status review pass or carry an exact truthful limitation.

### Wave 0 validation commands

```text
npm test
cd app && npm test
cd app && npx tsc --noEmit
cd app && npm run lint
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Additional focused commands may be recorded, but they do not replace the full gate. Browser reload evidence should be captured when the local web build runs; otherwise record `NOT RUN` with the exact environmental reason and retain adapter re-instantiation tests as limited evidence.

## Remote/shared-sandbox gate

Before any wave creates or mutates remote/shared state, Command must present a separate authorization request containing:

1. the exact project/environment and confirmation it is disposable or explicitly approved;
2. every intended mutation: migration, seed, test user, storage object, deployment, DNS/config change, and cleanup action;
3. the secrets-handling plan, with no secret values printed or committed;
4. rollback/cleanup steps and expected cost or quota impact;
5. isolation guarantees preventing access to unrelated users or data;
6. the exact live verification journey and evidence to retain.

Absent explicit approval, work may continue locally but remote/shared mutations remain prohibited. Live verification depending on that gate remains `NOT RUN`, never inferred.

## Stop conditions

Stop the affected task or wave when:

- a required action crosses the remote/shared-sandbox gate;
- secret or personal-data exposure is possible;
- a destructive migration, irreversible operation, breaking API/schema change, new major dependency, or out-of-manifest edit is required;
- unrelated user changes conflict with owned territory;
- three fix loops fail the same gate;
- the implementation would fake photos, comments, persistence, accessibility, or live-backend evidence rather than test real behavior appropriate to the wave;
- a previous wave is not verified and checkpointed.

Independent safe work may continue while one lane is stopped. RED decisions return to Command for explicit authorization.

## Known risks

- Local browser persistence proves reload behavior, not multi-user server durability or RLS.
- Browser storage quotas, private browsing, and eviction require honest recovery behavior.
- Image licensing and hotlink reliability must be resolved before the photo-sharing gate; metadata alone is not a completed photo flow.
- Supabase schema and policies may diverge from the actual remote project until live verification is authorized.
- Older-adult usability requires real-device and moderated-human evidence; automated accessibility checks are insufficient.
- The existing lint command may remain a placeholder until its quality wave; report it as a warning, not a pass.

## Campaign definition of done

This mission is complete only when all authorized waves pass their acceptance and review gates and direct evidence proves:

- a family can authenticate, recover a session, and access only its own family data;
- the Jones Family can plan several trips/gatherings, RSVP, comment, share private photos, reload/recover, and revisit completed-event memories on a phone-focused web UI;
- server, database, and storage behavior is durable, isolated, observable, and tested against an explicitly authorized environment;
- primary flows pass on supported iOS Safari and Android Chrome phone browsers, including keyboard, touch, zoom/reflow, focus, screen-reader, reduced-motion, error, empty, and offline/retry behavior;
- security, privacy, performance, deployment, monitoring, backup/restore, rollback, and operational runbooks have direct evidence;
- every ADR/OPORD is completed with cited evidence or explicitly superseded by an approved record;
- required checks pass, the review log is current, risks/follow-ups are listed, and the worktree is scoped and reviewable.

## 2026-07-14 OPORD evidence reconciliation

The 17-order dependency graph and original task intent remain unchanged. Current acceptance is now recorded criterion-by-criterion in each OPORD and summarized in `docs/opords/README.md`.

- Locally closable product slices: OPORDs 001, 004, 006, 007, 008, 009, 010, and 011 are `LOCAL COMPLETE / CONDITIONAL`; their remaining conditions are external device, human, hosted, production-cardinality, or delivery gates rather than missing local core-loop behavior.
- Partially complete slices: OPORDs 003, 005, 012, and 013 retain named missing local or operational criteria. OPORDs 002 and 014 are now `LOCAL COMPLETE / EXTERNAL CONDITIONAL` after persisted native Chrome 200% proof; physical assistive-technology and moderated-human validation remain their largest external evidence gaps.
- Operational slices: OPORD 015 has substantive lint, a least-privilege CI workflow, local pass/failure proofs, and one green hosted branch-head run, but lacks hosted seeded-failure proof and required-check administration; OPORD 016 lacks hosted artifact release/rollback; OPORD 017 has local encrypted backup/isolated restore and lifecycle dry-run evidence but lacks hosted PITR and approved export/deletion/retention apply.
- Current evidence includes root/app tests, substantive zero-warning lint, TypeScript, Expo web export, harness, loopback database lint, family/media E2E, read-only populated-scenario verification, secret/dependency/migration checks, diff checks, and hosted CI run `29376063946` on commit `12f760d`.
- Explicitly `NOT RUN`: hosted deployment/migrations/monitoring/backup/restore, production recovery email, physical iOS Safari and Android Chrome, VoiceOver/TalkBack, physical software-keyboard behavior, and moderated older-adult use. Local reduced-motion and practical Chrome 200% zoom/reflow pass.

This reconciliation closes the documentation contradiction found by the final local release-readiness review. It does not round conditional or operational evidence up to campaign completion.

## Wave 1 execution status — family membership and responsive-web navigation

- Commits `500ea77` and `e2f34f6` add group-scoped member service reads, the service-backed Family surface, and browser hash/history route contracts without invitation/admin CRUD or remote mutation.
- Executable coverage proves five Jones members, group isolation, durable reconstruction, session/member consistency, route parser/formatter round trips, exact encoded event IDs, and safe unknown-route fallback.
- Verification: root tests PASS 33/33; app tests PASS 22/22; TypeScript, harness, Expo web export, and diff check PASS. Lint remains a placeholder AMBER.
- Chrome DOM at `#/family` showed Jones Family, five members, and selected Family-route semantics. Headless `--window-size` retained a minimum/intrinsic desktop layout, so it is not accepted as 320/390/430 mobile viewport evidence. Interactive Back/reload is also unproven; pure route tests do not establish browser-history behavior.
- The initial closeout marked Wave 1 complete, but that status was superseded by independent Run 1 RED below. No remote Supabase, RLS, real-phone, private-media, or multi-user capability is claimed.

### Wave 1 independent Run 1 correction

- Independent Run 1 reopened Wave 1 at **RED** for narrow-width document overflow, fabricated member-role presentation, and missing browser-verifiable selected-tab state.
- Fix commit `8480c17` contains decorative overflow, carries explicit `owner | admin | member` roles through membership contracts, derives role labels from data, and renders a live visible `Selected` marker in the active tab.
- Exact CDP at 320/390/430/1280 proved HTML/body `scrollWidth` equals `clientWidth`, Family and Owner are present, and one tablist contains five tabs. Chrome AX names included `Family Selected`.
- Fresh verification: root tests PASS 34/34; app tests PASS 23/23; TypeScript, harness, Expo web export, and diff check PASS. Lint remains placeholder AMBER. Remote Supabase/RLS remains unverified.
- Run 1 defects are fixed. Wave 1 awaits the independent Run 2 gate and is not self-certified final GREEN.

### Wave 1 independent Run 2 correction

- Independent Run 2 reopened Wave 1 at **RED** because retained pre-role version-1 durable envelopes had no explicit role-schema migration.
- Fix commit `483e55e` uses a version-2 envelope on the unchanged storage key and migrates v1 before publishing state. It preserves existing roles, all user data, and revision; assigns Jones `person-you` owner and other missing roles member; and keeps unsupported versions and migration-write failures visible.
- Exact CDP at 320 hard-reloaded a retained v1 envelope with no horizontal overflow: Alex Owner and the custom trip rendered; stored state became v2 revision 11; custom event/message/notification and owner + four member roles were preserved.
- Fresh verification: root tests PASS 35/35; app tests PASS 24/24; TypeScript, harness, Expo web export, and diff check PASS. Lint remains placeholder AMBER and remote Supabase/RLS remains unverified.
- The Run 2 blocker is fixed. Wave 1 is ready for independent Run 3 and is not self-certified final GREEN.

### Wave 1 independent Run 3 acceptance

- Independent Run 3 accepted Wave 1 at **AMBER / PROCEED-WARN with zero blockers** after reviewing the durable v1-to-v2 migration and retained-envelope browser evidence.
- Wave 1 is **COMPLETE**. Lint remains a placeholder warning, and remote Supabase/RLS behavior remains unverified; neither warning is represented as production evidence.

## Wave 2 implementation status — trip creation and RSVP

- Commit `c1b135e` adds a real responsive-web family-plan form, exact-ID success routing, inline validation, retained-field retry, and truthful pending/error/no-response RSVP behavior through the existing service boundary.
- Durable reconstruction proves the created event and RSVP feed Home, Calendar, Family, and Event Detail. No event/RSVP mirror, new dependency, or remote mutation was added.
- Root tests PASS 37/37 and app-local tests PASS 26/26; TypeScript, harness, Expo web export, and diff check PASS. Lint remains placeholder AMBER.
- Exact 320×844 browser evidence covers create, exact route, Going RSVP, reload retention, Back, Home/Calendar visibility, and no document overflow. 430×932 and 1280×900 width checks also passed.
- Private review blockers and its RSVP live-region advisory were fixed before handoff.

### Wave 2 independent acceptance

- Independent final gate accepted Wave 2 at **AMBER / PROCEED-WARN with zero blockers** after the records-only test-count correction in `3262a33`.
- Authoritative fresh evidence is root tests PASS 37/37 and app-local tests PASS 26/26; TypeScript, harness, Expo web export, browser journey, and diff check remain PASS.
- Wave 2 is **COMPLETE**. Placeholder lint, real-device Safari/Chrome, and remote Supabase/RLS/multi-user behavior remain explicit warnings or unverified scope.

## Wave 3 implementation status — event comments and browser photos

- Commits `daf38d6` and `7eae2b5` make Event Detail comments and photos service-backed and event-scoped, add durable URL-photo and browser-file records, and expose caption, attribution, validation, loading/error/retry, and delete behavior without adding a dependency or remote mutation.
- Independent Run 1 was **RED**: a failed comment send cleared its draft, and durable browser files had no explicit size/type guard. Fix commits `630ad85` and `e242761` retain failed comment/photo drafts and reject unsupported or oversized browser files before durable storage.
- Independent Run 2 accepted Wave 3 at **AMBER / PROCEED-WARN with zero blockers**. Authoritative per-command TAP summaries are root tests PASS 39/39 and app-local tests PASS 28/28; TypeScript, harness, Expo web export, and diff check PASS. Lint remains the known placeholder warning.
- Exact CDP checks at 320×844, 390×844, 430×932, and 1280×900 had no document overflow. A real browser journey posted a comment, added an attributed URL photo, selected a 609-byte PNG through the browser file chooser, hard-reloaded with all three retained, deleted the uploaded photo, and exercised invalid-photo failure plus retained retry input.
- The console retained only the pre-existing React Native Web shadow-style deprecation warning. Live Supabase, RLS, private object storage/signed URLs, multi-user behavior, and physical iOS Safari/Android Chrome remain unverified and are not inferred from durable local evidence.
- Wave 3 is **COMPLETE**. This completes the authorized local event-comment/browser-photo checkpoint, not the broader campaign or its remote private-media objective.
- Closeout discipline correction: the first Wave 3 record mirrored the root 39/39 count into the app result. Future records must capture each command's own TAP summary rather than copying a count across suites.

### Wave 3 external final gate

- External review after records correction `a1e68a1` accepted Wave 3 at **AMBER / PROCEED-WARN with zero blockers**.
- The authoritative independent command summaries remain root tests PASS 39/39 and app-local tests PASS 28/28; counts are transcribed from each suite and are not mirrored.
- Placeholder lint and the pre-existing React Native Web shadow-style warning remain advisories. Live Supabase, RLS, private object storage/signed access, multi-user behavior, and physical iOS Safari/Android Chrome remain unverified and are not inferred.

## Wave 4 implementation status — truthful completed-event history

- Commit `d4f4b4d` replaces fixture memories and reminder theater with service-backed completed-event history. Memories and Home derive from the active family's completed events, exact-event media, and exact-event comments; each query remains isolated by stable event ID.
- Lake Geneva renders as the completed Jones Family example with three photos and one comment. Memories owns honest loading, error/retry, empty, and populated states and opens the exact event route; Home exposes the same completed-event recap without duplicating durable records.
- Independent Run 1 was **RED** because completed-event media/comment derivation was not sufficiently isolated between event IDs. The targeted correction added exact-event isolation coverage and repaired the derivation before re-review.
- Independent Run 2 accepted Wave 4 at **AMBER / PROCEED-WARN with zero blockers**. Authoritative per-command results are root tests PASS 43/43 and app-local tests PASS 32/32; TypeScript, harness, Expo web export, and diff check PASS. Lint remains the known placeholder warning.
- Chrome checks at exact 320×844, 390×844, 430×932, and 1280×900 found no document overflow. Lake Geneva showed three photos and one comment; exact route, Back, and hard reload passed; no reminder UI remained. Calendar uses truthful shared-plan copy and 48px minimum actions.
- Removed reminder controls and the dead staged-photo/reminder transient store state rather than implying delivery or scheduling that does not exist.
- Wave 4 is **COMPLETE** only as the local product-truth/completed-event-history checkpoint. Remote Supabase/RLS/private object storage, multi-user behavior, and physical iOS Safari/Android Chrome remain unverified.

### Wave 4 external final gate

- External review accepted commits `d4f4b4d` and `3d80a62` at **AMBER / PROCEED-WARN with zero blockers**.
- Authoritative independent results remain root tests PASS 43/43 and app-local tests PASS 32/32; TypeScript, harness, Expo web export, browser checks, and diff check remain PASS. Lint remains a placeholder warning.
- Legacy Home/memory fixture exports remain in the repository but are not consumed by production Home or Memories. Their removal is advisory cleanup, not a runtime fallback or Wave 4 blocker.
- Live Supabase/RLS/private storage, multi-user behavior, and physical iOS Safari/Android Chrome remain unverified and are not inferred from the accepted local gate.

Current truth: **Waves 0-4 are complete. Independent Wave 4 Run 2 accepted the corrected implementation at AMBER / PROCEED-WARN with zero blockers. The broader campaign remains IN PROGRESS; no remote/live Supabase, RLS, private object storage, multi-user, or physical-device capability is claimed complete.**

## Wave 5 implementation status — mobile accessibility and older-adult clarity

- The scoped implementation adds one main landmark, DOM-first fixed navigation with explicit selected state, level-appropriate headings, contextual actions, informative photo labels, decorative avatars, and urgent/non-urgent state announcements.
- Create validation focuses the first invalid field and exposes stable labels with invalid/described-by error relationships. Conservative autocomplete and keyboard hints were added without a dependency or API change.
- Navigation targets remain at least 48px, labels are at least 11px, and main content has additional bottom clearance for long phone forms.
- Independent Run 1 was **RED** because inactive tabs were removed from sequential keyboard order without an arrow-key focus implementation. The targeted correction makes all five tabs sequentially tabbable while preserving tablist/tab roles and explicit selected state.
- Fresh fix evidence: root tests PASS 44/44; app-local tests PASS 33/33; TypeScript, harness, and Expo web export PASS. Lint exits 0 but remains a placeholder warning.
- Independent Run 2 accepted Wave 5 at **AMBER / PROCEED-WARN with zero blockers**. Sequential keyboard navigation reached Home → Calendar → Create → Memories → Family, Enter routed each tab, exactly one selected tab and one main landmark rendered, and 320×844 width/overflow/fixed-navigation sanity passed. The reviewed worktree was clean.
- Wave 5 is **COMPLETE** as the authorized responsive-web accessibility checkpoint, not as the full campaign. Placeholder lint, the pre-existing React Native Web warning, physical iOS Safari/Android Chrome, VoiceOver/TalkBack, practical 200% zoom/reflow, reduced motion, and moderated older-adult evidence remain warnings or `NOT RUN` and are not inferred.

## Wave 6 implementation status — full local Jones Family journey

- Implementation/fix commit `178a69e` completed the isolated browser journey and corrected Calendar to exclude completed Lake Geneva from its upcoming agenda/count and select the truthful upcoming month. Before the fix it counted six shared plans and selected June; afterward it showed the five genuinely upcoming events.
- Authoritative automated evidence is root tests PASS 45/45 and app-local tests PASS 34/34, recorded separately. TypeScript, harness, Expo web export, and diff check PASS. Lint exits 0 but remains a placeholder WARN.
- Fresh local data showed five Jones members, three seeded future trips, and completed Lake Geneva. The browser journey validated form errors; created exact-ID Dells and Chicago trips; Going and Maybe RSVPs; comments on both; attributed Nathan Dumlao Unsplash URL media; cancel and confirmed deletion; and a real 68-byte PNG file selection with caption and alt text.
- Hard reload plus Metro stop/restart retained the version-3 envelope at revision 9. Home showed five upcoming events, Calendar truthfully showed five after the fix, Family showed all five members, and the Lake Geneva memory showed exactly three photos and one comment. Exact routes, Back, keyboard navigation, one main landmark, and one selected tab passed.
- Browser checks passed at 320, 390, 430, and 1280 CSS-pixel widths with no horizontal overflow and controls at least 44px. Lighthouse accessibility and best-practices scores were both 100. The final run had zero console errors after the avatar repair; the known React Native Web warning remains non-blocking.
- Corrupt and future-version envelopes produced visible errors without overwrite, and deliberate local restoration succeeded. In-session offline mutation was **NOT SEPARATELY EXERCISED**; the adapter is architecturally local after load, but the journey directly proved only online reload/restart durability. A cold offline reload **fails** with the browser network error because there is no service worker/offline shell. Offline-shell/PWA work remains a separately authorized non-goal, not a passed criterion.
- Review history: Run 1 found the Calendar blocker; Run 2 found a transient avatar TypeScript blocker; Run 3 passed with zero blockers. Reproduction and recovery steps are in `docs/runbooks/full-local-jones-family-e2e.md`.
- Local Waves 0-6 and the full local Jones Family proof are **COMPLETE**. The broader production mission remains **IN PROGRESS** and blocked at the separate remote authorization gate. Supabase/RLS/private storage, auth/multi-user behavior, physical Safari/Android devices, screen readers, practical 200% zoom, deployment, backup, and restore remain `NOT RUN`.

## Local multi-user and KISS closeout

- Commits `7deb3fa`, `93dc773`, and `1311332` add an explicitly labeled per-tab local actor chooser, enforce captured-actor membership/ownership rules, and scope notifications per recipient through durable envelope v6. The chooser uses `sessionStorage`; it is not production authentication or an invitation flow.
- Two fresh same-origin tabs independently selected Alex and Maya. Alex created a shared plan, Maya saw it after reload, their Going/Maybe RSVPs and comments persisted with correct authors/viewer-relative alignment, and each saw only permitted plan/photo controls. Signing Alex out did not sign Maya out.
- Service contracts reject an outsider across Jones group/event/RSVP/thread/media/notification reads; reject RSVP spoofing and actor-switch TOCTOU; enforce creator/manager event controls and uploader/manager media removal; and require notification recipient plus current membership.
- Commits `2b6d725`, `a52e43b`, and `0601baa` simplified Event Detail and fixed edit/DST/timeline, fail-closed cancellation, photo-mode, and Supabase timeline consistency defects. Final KISS code and rendered fast gates were GREEN; the final local security gate was AMBER / PROCEED-WARN with zero local blockers.
- Exact 320px review covered long-content Memories/Event Detail, validation focus/recovery, location edits, collapsed link/file photo modes, destructive-action cancel/confirm, and Maya's denied management controls; 390px and 430px retained no document overflow. Review used Nielsen heuristics and observable WCAG 2.2-oriented behavior without claiming certification.
- The multi-user browser run opened a real chooser for an 847-byte PNG, but its extension could not programmatically attach it. Prior Wave 3 evidence remains the actual-file browser proof (609-byte PNG); actor-owned data-URL media is covered at the service boundary.
- Authoritative final checks: root 56/56, app-local 45/45, TypeScript, harness, Expo web export, and diff check PASS. Lint exits 0 but remains a placeholder WARN.
- Remaining remote blockers are explicit: checked-in metadata deletion is uploader/manager-scoped while Storage deletion permits any event member, and remote object/database operations are nontransactional. Remote auth/invites/RLS/private storage, physical browsers/assistive technology, deployment, backup, and restore remain `NOT RUN`.
- Detailed evidence: `docs/runbooks/full-local-multiuser-family-e2e.md`.

## Remote media repository-readiness checkpoint

- A forward-only migration after initial infrastructure adds/backfills required alt text, keeps caption separate, and stores optional source/creator attribution without changing the initial migration.
- Generic authenticated media insert/update/delete is revoked. Narrow RPCs persist, list, activate, abort, claim, and finalize incomplete operations; authorized event reads retry them. Galleries expose active rows only.
- Storage insert requires the authenticated user's matching pending path; update is unsupported; deletion requires a claimed row and uploader/object-owner or group-manager authority. The bucket and client agree on a 1 MiB JPEG/PNG/WebP boundary, paths use random UUIDs, and event deletion is foreign-key restricted while media exists.
- Interrupted upload or deletion steps remain hidden and queryable for retry/reconciliation instead of relying on lossy best-effort compensation.
- Event cancellation remains fail-closed whenever media metadata exists.
- This checkpoint changes no hosted environment. Local Supabase migration, RLS, bucket, synthetic accounts, real object operations, attack cases, and failure races now pass; hosted application and failure-injection evidence still requires a dedicated authorized project.
- Deployment/certification procedure and current limits are in `docs/runbooks/remote-media-readiness.md`.
- Local Supabase evidence now exceeds the original repository-only checkpoint: migration and database lint pass, and the reproducible media runner passes signup-session uploader/member/owner/outsider metadata and private-Storage behavior, manager recovery, concurrent abort/upload locking, attack cases, event FK restriction, and real PNG bytes. No hosted environment was changed.
- Current final gates: root 58/58, app-local 47/47, TypeScript, local Supabase migration/lint/lifecycle, harness, Expo web export, and diff check PASS. Lint remains a placeholder WARN.

## Configured local Supabase family browser proof

- The loopback-only browser harness provisioned the smallest trusted state: one email-confirmed entitled owner, one outsider, and no pre-created family. The app ran with `EXPO_PUBLIC_DATA_MODE=supabase`; no hosted project or shared environment was touched.
- Avery created Jones Family through the UI. Maya and Jordan used separate invitation-bound signup sessions and joined, producing one owner plus two members. A fourth authenticated outsider remained isolated in the no-family state, including after direct navigation to a Jones event URL.
- The three members created Door County Cabin Weekend, Yellowstone Road Trip, and completed Lake Geneva Family Reunion, then added distinct Going/Maybe RSVPs and event comments. Home, Calendar, Event Detail, and Memories retained exact identities and records across reloads.
- Lake Geneva retained three private signed-access photos after reload: two attributed Unsplash-source uploads and one actual local JPEG browser-file upload with caption and alt text. Member/owner media controls stayed role- and uploader-scoped.
- Recipient-scoped database-generated updates appeared for non-actors and current members. The owner observed 14 unread updates and successfully used Mark all read; invitees had their own independent counts.
- A configured-browser failure in active-family query transition was reproduced and fixed in `89d8720`. Focused regression tests, root 69/69, app-local 58/58, TypeScript, and Expo web export passed after the correction; a final all-gates rerun is still owned by the campaign closeout.
- Exact 320/390/430 CSS-pixel browser checks passed without horizontal overflow. At 320 there was one main landmark, one primary heading, and no visible action below 48×48 CSS pixels. Authenticated Home Lighthouse scored 100 Accessibility and 100 Best Practices; SEO 67 and agentic browsing 50 are recorded without being treated as release blockers or passes.
- Detailed setup, journey, cleanup, and evidence boundaries are in `docs/runbooks/configured-local-family-browser-e2e.md`.
- This closes the configured **local** Auth/Postgres/RLS/private-Storage browser proof. It does not close the production mission: hosted deployment/migrations/monitoring/backup/restore, physical iOS Safari and Android Chrome, VoiceOver/TalkBack, practical 200% zoom, reduced-motion verification, and moderated older-adult testing remain `NOT RUN` pending the appropriate authorization, environment, devices, or participants.

## OPORD 016 local web release and rollback checkpoint

- Added an exact-Git-commit artifact builder with clean lockfile installation, dotenv disabled, durable-local mode forced, supported Supabase public variables removed, tracked environment-file refusal, and 300-second bounds for install/export subprocesses. The timestamp-free manifest records version/environment/source plus sorted portable paths, bytes, and SHA-256 values.
- Candidate commit `3cec45b` was independently exported twice. Both 22-file manifests were byte-identical with digest `ef793a72101bb80a5c8f6fe40bd6425fcec7630e04fd1b32c1e25ea4b11117dd`.
- A real prior-commit baseline (`74e7e2b`, digest `e9cec97ac684069c1b8b3c8cb9493b5c185dfac0d64429bcdcba3a53f8b8493d`) and candidate used different content-addressed JS names. Promotion verified bytes, published through an atomic digest-addressed directory, and moved only the `stable` alias.
- The baseline → candidate → baseline rehearsal passed extensionless SPA fallback, CSP/security headers, no-cache entrypoints, one-year immutable hashed assets, consistent hashed paths/bytes, and release-header restoration. Rollback did not reverse or mutate database state.
- The promoted candidate passed 320/390/430/1280 exact widths, one main/five tabs/one selected tab, reduced motion, sequential focus, 200% page-scale proxy, exact-event deep link, Back/reload, and 320x500 invalid-form focus.
- Final gates pass: root 80/80; app-local 62/62; substantive lint; TypeScript; Expo export; harness; secret and migration validators; release-script contracts; and diff check. The read-only configured-scenario verifier retained its exact 4/3/3/6/6/3/38/3 counts with zero outsider residue, and the rehearsal server left no listener.
- No `.env.local`, hosted project, Auth account, database row, Storage object, DNS/TLS, deployment, or remote environment was read or changed. The populated loopback scenario remains intact.
- OPORD 016 is **PARTIAL/CONDITIONAL**. The local artifact/runtime-config/promotion/rollback slice passes and removes the compile-time backend blocker, and branch head `12f760d` has green hosted CI. Hosted artifact linkage, named environments/operators/config custody, DNS/TLS, configured staging compatibility, physical devices/AT/human evidence, hosted rollback, and manual production approval remain `NOT RUN`.

## OPORD 017 local recovery and lifecycle checkpoint

- Encrypted local backup captures application-owned logical schemas, exact migration inventory, and all private event-media bytes without printing or persisting the runtime passphrase.
- A fresh database in a disposable isolated Docker container restored exact 4 profiles, 1 group, 3 memberships, 3 events, 6 RSVPs, 6 messages, 3 media, 38 notifications, 4 Auth users, and 3 Storage objects.
- All private object hashes/sizes matched; row/event/object reconciliation was zero. Restored RLS let a member see 3/6/3 events/messages/media and the outsider see 0/0/0.
- Observed restore was 7.745 seconds from a 14.806-second-old snapshot. These are not approved RTO/RPO targets.
- Self-scoped planning is deterministic, bounded, cross-user-denying, and dry-run only. It found 21 protected/blocked owner candidates and zero live media orphans; fixtures cover both orphan directions.
- The populated primary stack remained read-only. Hosted PITR/scheduling, retention/grace/legal policy, complete authenticated export, deletion/apply, hosted restore, and production authorization remain open. OPORD 017 is **PARTIAL/CONDITIONAL**.

## OPORD 017 authenticated encrypted export checkpoint

- The signed-in Family surface, including the no-family state, downloads a versioned current-account contribution bundle. It includes the profile identifier/display name, memberships, created plans, own RSVPs/comments/photos/reminders, and owned photo bytes when readable; it excludes other people’s contributions, whole-family archives, Auth/invitation secrets, and signed URLs.
- PBKDF2-SHA256/AES-256-GCM uses a user-supplied memory-only passphrase. The encrypted manifest records counts and data integrity; wrong passphrases and modified ciphertext fail closed. Unavailable photo bytes are reported while metadata remains, and a fresh export retries the authorized read.
- Isolated configured Chrome sessions for Avery, Maya, and the outsider each produced an actual `.loopedin` download. Decryption proved exact-user filtering and pairwise foreign-ID absence; the outsider export was minimal/empty. At 390px inputs/action measured 52/48px, width was 390/390, mismatch retry retained the passphrase, and console events were zero.
- The read-only proof preserved the canonical 4/3/3/6/6/3/38/0/3 scenario with zero outsider residue. Details are in `docs/runbooks/authenticated-encrypted-user-export.md`.
- Local export verdict: **GREEN** for the conservative current-user scope. Shared-family scope, server audit/hosted delivery, physical devices/assistive technology, product/legal retention approval, and all account deletion behavior remain open. OPORD 017 overall remains **PARTIAL/CONDITIONAL**.

## 2026-07-14 — OPORD 014 real Chrome zoom and UX closeout

- A fresh configured production export at the checked-out revision ran read-only against the retained loopback scenario. Its final verifier remained exact at 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 objects, and zero outsider residue.
- Chrome 150 used persisted native browser zoom. Same physical windows produced 640→320, 780→390, and 860→430 CSS-pixel layouts; DPR changed 1→2 while `visualViewport.scale` and computed CSS zoom stayed 1. No CDP page scale, device emulation, or CSS zoom supplies the claim.
- Signed-out, owner, member, and outsider sessions covered auth/recovery, Today/Updates, Calendar, invalid Create focus, Memories, Family/invite/export, Event Detail/edit/RSVP/thread/reminder/photo form, Back/deep-link/reload, and direct-route denial. Full owner sweeps also passed at effective 320 and 430; a 1280-CSS desktop 200% regression passed.
- Strengthened >=48px, control-box, and text-glyph geometry found one P2 Calendar defect: the Yellowstone status chip painted beyond its contained row. A shrinking agenda-copy wrapper (`flex: 1; minWidth: 0`) restores containment; source and real-browser regressions cover it.
- Final local evidence has no horizontal overflow, clipped control boxes or descendant control text/glyphs, sub-48px controls, console warning/error/exception, failed load, or functional app/backend HTTP error. The automatic optional `/favicon.ico` 404 is recorded as P3 and does not affect a user flow.
- Practical local Chrome 200% zoom is closed. Physical iOS Safari/Android Chrome, VoiceOver/TalkBack, physical software keyboards, and moderated older-adult use remain `NOT RUN` and are not inferred.

## 2026-07-14 — OPORD 010 local per-user event reminder preference

- Added the smallest reminder service contract: exact-current-user/event read, idempotent enable/upsert, and idempotent disable/delete. Memory, durable-local, and Supabase adapters share the contract; no schema, dependency, settings center, scheduler, worker, push, email, or SMS work was added.
- Durable-local advances from envelope v6 to v7. Retained v1–v6 data and revision migrate once with an empty reminder collection; reminder mutations use the existing captured-actor and coordinated-write boundary.
- Supabase reuses `loopedin_reminder_drafts` and its existing self-user/event-member RLS. Two authenticated users enabled independent preferences on the same retained event, signed out and back in, and saw only their own row. One user's repeated disable did not change the other; an outsider could not read the event or insert by direct ID.
- Event Detail renders one 48px `switch` with explicit `aria-checked`, `Morning of event`, explicit On/Off state, and honest copy that this is an in-app preference while push/email delivery is inactive. Loading, error/refetch, pending, success, and retained-intent retry states remain local to the preference card.
- Configured 390×844 Chrome passed 390/390 no-overflow, 48px target, keyboard `:focus-visible`, exact-event deep-link/reload persistence, and a real local-gateway outage. The failed disable retained confirmed On state plus `Retry turning off`; retry after Kong recovery persisted Off.
- Fix loop: the first rendered gate found that React Native Web emitted `role=switch` but not DOM `aria-checked` from `accessibilityState`. Explicit `aria-checked` fixed the semantics and the repeated browser gate passed.
- Cleanup is part of both loopback harnesses. The final read-only verifier retained exactly 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 0 reminders, 3 Storage objects, and zero outsider residue.
- Final gates: root PASS 88/88; app-local PASS 66/66; substantive ESLint and TypeScript PASS; configured Expo export, harness, secret scan across 194 files, four-migration integrity, database lint, family/media/reminder loopback matrices, configured reminder browser proof, populated-scenario verification, and diff check PASS. `npm audit --audit-level=high` exits zero; 11 moderate transitive Expo-toolchain advisories remain because the offered fix is a breaking Expo 57 upgrade outside this mission.
- Local verdict: **GREEN** for OPORD 010's implementable slice. Hosted RLS, production delivery, physical Safari/Chrome, assistive technology, and moderated family/older-adult use remain `NOT RUN`; actual push/email/SMS delivery remains an explicit non-goal.

## Final configured browser completion audit

- A fresh disposable loopback-Supabase family exercised the full reachable web UI across owner, two members, and an outsider. The exact evidence matrix is `docs/runbooks/final-configured-browser-feature-matrix.md`.
- Same-tab reinvitation, idempotent safe-error handling, and hidden-state text contrast defects found during the replay were corrected and independently rerun.
- The configured local user journey and practical Chrome 200% zoom are GREEN. The broader mission remains IN PROGRESS because hosted runtime configuration/export/delete/operations, physical browsers and assistive technology, and moderated human usability remain unproven.

## OPORD 016 runtime-configured immutable artifact checkpoint

- Release builds now compile only `EXPO_PUBLIC_DATA_MODE=runtime`; environment ID, data mode, Supabase URL, and publishable key are supplied by an external `runtime-config.json` that is excluded from the manifest/digest and served `no-store`.
- The web root validates the exact overlay before rendering `App`. Adapter and Supabase client creation are lazy. Unknown fields/modes, unsafe IDs, non-HTTPS non-loopback URLs, secret/service-role-looking keys, and missing config fail closed without logging configuration.
- Exact source `522aed7217ea` produced release `0.1.0-522aed7217ea`, three files, one 986,099-byte JavaScript bundle, and digest `12925c40f8068afbaa58b3dd5a7b132ed405e9e510adc90310945e72ca27f38d`. Loopback endpoint/key and the prior hosted project identifier were absent from the artifact.
- One candidate ran unchanged under `runtime-local-demo` and `runtime-loopback-supabase`. Release identity stayed fixed, environment identity and exact-origin CSP followed the overlay, configured mode reached `Welcome back`, and a rejected service-role-looking overlay exposed no environment and rendered the accessible unavailable state.
- Local mode retained 320/390/430/1280, reduced motion, keyboard/focus, 200% proxy, deep-link/Back/reload, and form-focus gates. LCP was 3,252/2,712/2,668 ms; longest task 178/115/94 ms; exact-event usability 648 ms; width 390/390; backend requests zero.
- Baseline/local → candidate/local → candidate/loopback → invalid/fail-closed → baseline/local rehearsal passed. No hosted/backend mutation occurred. The two overlays identify different runtime targets but use one local Supabase stack. Branch head `12f760d` passed hosted CI, while distinct hosted backend compatibility, artifact-from-CI linkage, named environment/host/DNS/TLS owners, physical devices/AT, staging deployment, and production approval remain `NOT RUN`.

## OPORD 015/016 repository-side hosted artifact and envelope checkpoint

- CI now defines a fourth, bounded `Release artifact` job. All four jobs check out the exact PR head/push SHA; artifact construction waits for the other three to pass, runs the existing exact-commit build once, verifies the manifest commit, exposes only source/digest outputs, and uploads the exact directory for later promotion through an immutable action pin.
- The job retains global `contents: read`, persists no checkout credential, references no secret, provider CLI, migration, remote backend, or deploy command, and cannot promote to Netlify or Supabase.
- A dependency-free builder verifies the downloaded schema-v2 runtime artifact, rejects tampered/missing/extra/symlink entries and unsafe runtime configuration, and atomically assembles a target-neutral static Netlify publish envelope. A separate command re-verifies the envelope before use.
- Preview and envelope share one runtime-config/security-header policy. `connect-src` is exact to the validated backend/WebSocket origins; `img-src` intentionally retains `https:` for user-entered attributed media. Public config is `no-store`, only exact manifest-listed content-addressed assets are immutable, shell/fallback paths are no-cache, and missing extensionful/static resources are not rewritten to HTML.
- Envelope build and verification require the trusted digest and source commit from CI outputs, validate release identity/version/epoch and unique safe paths, and cannot authenticate a modified download from its own manifest alone.
- Focused TDD evidence is GREEN locally, including intentional RED runs for missing tooling/job, numeric environment identity, and unmanifested symlink defenses. The exact pre-change `02ae226` artifact remained three files at digest `ecfa8045a59835f9dcd01c23eae2330102925f908ec070395a95b3a5cbfca007`; it is historical input evidence, not the final branch candidate.
- Hosted run `29383816628` and its downloaded artifact prove exact source `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce` and artifact digest `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3`.
- Dedicated Netlify site `loopedin-family` (`50ae6d6b-28ad-49c0-9654-c3a54899fcb5`) has one unpublished draft deploy `6a56f0408614647fe35cf968` at its unique URL. HTTPS, root/runtime transport, no-store/exact CSP/cache policy, missing-asset 404, release/environment headers, hash reload, and signed-out Chrome console/network checks pass.
- The draft is transport-only, not configured-core-loop completion. Supabase migrations/authenticated flows, SMTP, telemetry, backup/PITR/object copy, staging rollback, physical-device/AT/human evidence, production alias/custom domain/Git link, and production approval remain `NOT RUN`. Personal site `travisjohnjones` retained exact ID `519f3aa3-c723-4b2a-b9dd-4761e7b0a8bf`; the unrelated Supabase project stays quarantined.
- Read-only Supabase inventory identifies dedicated healthy project `vkogznsfthirhxkqysza` (`LoopedIn`, organization `yxedrtsnkpwfryhebswc`, `us-east-2`) distinct from quarantined `lzscofbvecgpchokxhyb` (`us-west-2`). Email Auth is enabled with confirmation required and signup open; phone is disabled. All ten expected public-table endpoints returned `404/PGRST205`, which proves only that the schema is not Data-API-visible. Remote migration history is unavailable, so emptiness, migration application, RLS/Storage/Realtime, mail, and configured core-loop behavior remain unproven. WAL-G is enabled, PITR is disabled, and no usable backup-list evidence exists.
