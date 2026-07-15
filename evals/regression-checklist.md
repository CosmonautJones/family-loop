# Regression Checklist

## OPORD 005 event/comment response-loss retries

- [x] Event and comment drafts retain one UUID operation key across an unchanged manual retry and rotate it on edit or success; writes still never retry automatically.
- [x] Durable-local v8 replays the same authoritative ID with one row and no revision increment; v1–v7 migrate once with empty private operation maps.
- [x] Loopback Supabase response-loss/retry returns the same IDs and one row; distinct keys create distinct rows.
- [x] Operation maps are private, authenticated has no table privilege, actor/entity scoping prevents cross-user replay, and outsiders remain denied by membership checks/RLS.
- [x] The destructive harness cleans its rows; retained baseline remains exactly 8/2/6/5/9/9/4/60/1 and the populated browser scenario remains unchanged.
- [ ] Universal deadlines/rate enforcement, request correlation/version propagation, hosted deployment, and other write classes remain `NOT RUN` or separately scoped.

## OPORD 003 password recovery

- [x] Known and unknown addresses receive identical HTTP and visible request responses; only the known disposable account receives local mail.
- [x] Recovery uses an exact approved same-origin callback and snapshots only recovery/error presence before Supabase consumes the token-bearing fragment.
- [x] Valid local reset replaces the password; old sign-in fails, new sign-in passes, authenticated reload succeeds, and the disposable session can sign out.
- [x] Replayed/malformed reset links return no session and render explicit request-new/return-to-sign-in actions.
- [x] Offline recovery retains the email and renders connection-specific safe copy; retry remains available.
- [x] Configured 390×844 Chrome has one primary heading, no horizontal overflow, 52px inputs/actions, email/current-password/new-password autocomplete, and accessible alert/live regions.
- [x] Invite-first signup and unconfigured local-profile semantics remain intact; no open registration, settings, schema, dependency, or production-mail work was added.
- [x] Dedicated synthetic Auth user, email, token-bearing browser profile, and static server are removed after proof; retained family-browser-v1 users remain untouched.
- [ ] Hosted redirect allowlist, production email delivery/templates/rate limits, physical iOS Safari/Android Chrome, and assistive technology — `NOT RUN`.

## OPORD 010 reminder preference

- [x] Exact-user/event read, enable/upsert, and disable/delete exist across memory, durable-local, and Supabase adapters.
- [x] Durable-local v8 preserves reminder preferences across reconstruction and migrates v1–v7 with empty missing collections without changing retained data/revision.
- [x] Two authenticated loopback users can enable the same event independently across relogin; one user's idempotent disable leaves the other unchanged.
- [x] Outsider event read is empty and direct-ID reminder insert is denied by existing self-user/event-member RLS.
- [x] Event Detail uses a 48px switch with explicit checked semantics, `Morning of event`, On/Off state, honest no-push/email copy, and pending/error/refetch/retry/success states.
- [x] Configured 390×844 Chrome passes exact-event deep link, reload persistence, keyboard focus-visible, no horizontal overflow, failed-write intent retention, and successful retry after local gateway recovery.
- [x] Both harnesses remove their preferences; populated scenario returns exactly zero reminder rows and zero outsider residue.
- [ ] Hosted RLS/project state, actual push/email/SMS delivery, physical iOS/Android, assistive technology, and moderated use — `NOT RUN` or explicit non-goals.

## Local multi-user and KISS gate

- [x] Two same-origin tabs independently choose Alex/Maya via explicitly demo-only `sessionStorage`; one-tab sign-out and reload do not overwrite the other identity.
- [x] Created plan, distinct RSVPs, comments, authorship/self alignment, and URL media converge across actors and reload.
- [x] Creator/manager event controls, uploader/manager photo deletion, outsider denial, RSVP anti-spoofing, actor capture, and recipient-scoped notifications pass local service contracts.
- [x] Home, Calendar, Family, Memories, exact event routes, one main landmark, five tabs, and 320/390/430 no-overflow behavior pass.
- [x] Blank edit focus/recovery, valid location edit, collapsed link/file modes, and cancellation dismiss/confirm pass the rendered KISS gate.
- [x] Current final gates: root 58/58, app-local 47/47, TypeScript, local Supabase migration/lint/lifecycle, harness, Expo web export, and diff check pass.
- [ ] Multi-user PNG attachment — chooser opened for an 847-byte file, but extension file injection failed. Prior Wave 3 real 609-byte PNG evidence remains valid; service tests cover actor ownership.
- [x] Substantive lint — pinned Expo/TypeScript flat config passes with zero warnings and fails on a seeded known violation.
- [x] Repository remote-media contract — forward migration preserves caption/alt/attribution separately and persists pending/active/deleting cross-system operations behind narrow RPCs.
- [x] Local Supabase media lifecycle — migration, schema lint, signup sessions, uploader/member/owner/outsider RLS, private real-PNG read/delete, manager reconciliation, abort/upload race, quota/path/direct-mutation attacks, event FK, and removed-member denial pass.
- [ ] Hosted metadata/Storage lifecycle — remote migration, full failure injection, retry/reconciliation, content scanning, and orphan scans remain `NOT RUN` against a dedicated project.
- [ ] Production auth/invites/RLS/private storage, physical browsers, screen readers, moderated usability, deployment, backup, and restore — `NOT RUN`.

## Wave 6 full local Jones Family journey

- [x] Fresh local seed has five members, three future trips, and completed Lake Geneva.
- [x] Two created exact-ID trips, RSVP changes, comments, URL media, file media, and confirmed deletion survive hard reload and Metro restart.
- [x] Home and Calendar truthfully show five upcoming events after creation; completed Lake Geneva is excluded from upcoming and retains a three-photo/one-comment memory.
- [x] Exact routes and Back pass at 320/390/430/1280 widths without horizontal overflow; controls are >=44px.
- [x] Sequential keyboard navigation, one main landmark, one selected tab, and Lighthouse AX 100/BP 100 pass.
- [x] Corrupt/future envelopes remain visible and are not silently overwritten; deliberate restoration works.
- [ ] Cold offline reload — `NOT MET`: no service worker/offline shell; browser network error is expected and documented.
- [ ] Remote Supabase/RLS/private storage/auth/multi-user and physical-device/assistive-technology checks — `NOT RUN`, separate authorization/environment required.
- [x] Independent review history recorded: Run 1 Calendar RED, Run 2 transient avatar TypeScript RED, Run 3 PASS with zero blockers.

## Wave 0 durable local service

- [x] Default/unconfigured mode is reload-durable local AsyncStorage, not process-only memory.
- [x] Tests can explicitly select the isolated memory factory and reset/reseed without leaking state.
- [x] Version-1 persistence errors are visible and never trigger silent data replacement.
- [x] Jones Family seed identity, chronology, RSVPs, event comments, memories, and media metadata are internally consistent.
- [x] Supabase mode is explicit and cannot silently fall back when configuration is absent or the backend fails.
- [x] Unsplash demonstration URLs retain captions; private upload and formal attribution/domain handling remain later media work.
- [x] External Run 2 Wave 0 gate — AMBER / PROCEED-WARN, zero blockers; 40 adversarial mutations accepted as same-runtime coordinated-durability evidence (exact mix not supplied); fresh fix evidence root 29/29, app 18/18, TypeScript, harness, web export, and diff check pass.
- [x] Substantive lint now covers the retained Wave 0 source under OPORD 015; the historical Wave 0 review used the earlier placeholder.
- [ ] Actual browser hard-reload — NOT RUN; adapter reconstruction passed, but it is limited evidence.
- [ ] Browser durability does not prove remote/multi-user/RLS/private-media behavior; Safari/no-Web-Locks cross-tab atomicity is also unproven.
- [x] Wave 3 URL-photo records require source URL, photographer credit, caption, and alt text; this is local attribution metadata, not proof of remote private-media handling or hotlink permanence.

## Wave 1 family membership and navigation

- [x] `listGroupMembers(groupId)` returns the five Jones members and preserves group isolation across mock and durable reconstruction.
- [x] Family uses active-group, member, and event Query data with loading, error/retry, no-family, and no-members states; fixture onboarding and dead controls are absent.
- [x] Family is the fifth tab; one tablist/five tabs render, the active tab has a visible `Selected` marker, and Chrome AX exposed `Family Selected`.
- [x] Pure hash-route parser/formatter tests cover all tabs, exact encoded event IDs, return source, and unknown/invalid fallback to Home.
- [ ] Interactive browser Back and hard reload — NOT PROVEN; pure route tests do not establish browser-history behavior.
- [x] Exact CDP viewport proof at 320/390/430/1280: HTML/body `scrollWidth === clientWidth`; Family and Owner were present and all five tabs remained reachable.
- [ ] Remote Supabase membership/RLS and real-phone Safari/Chrome — NOT RUN.
- [x] Substantive lint now covers the retained Wave 1 source under OPORD 015; the historical Wave 1 gate’s placeholder warning remains part of its record.
- [x] Independent Run 2 gate — RED on retained-v1 role migration; the blocker is addressed by `483e55e` below.
- [x] Retained pre-role v1 envelope migrates once to v2 on the same key; data/revision and valid roles survive, missing Jones roles receive deterministic owner/member values, and unsupported versions stay visible.
- [x] CDP 320 hard reload from retained v1: width 320, Alex Owner, custom trip visible, stored v2 revision 11, custom event/message/notification and owner + four members preserved.
- [x] Independent Run 3 gate — AMBER / PROCEED-WARN, zero blockers; Wave 1 accepted complete with placeholder lint and remote Supabase/RLS warnings preserved.

## Wave 2 trip creation and RSVP

- [x] Real form has inline required-value and impossible-date validation; optional notes remain optional.
- [x] Failure preserves fields for retry; success routes to the returned exact event ID.
- [x] Created event and RSVP survive durable reconstruction and feed Home, Calendar, and Family-derived views.
- [x] RSVP pending/error/no-response states are truthful and announced.
- [x] Exact 320×844 browser flow covered create, RSVP, reload, Back, Home, and Calendar without document overflow.
- [x] 430×932 and 1280×900 width checks retained the trip without document overflow.
- [x] Independent Wave 2 final gate — AMBER / PROCEED-WARN, zero blockers; authoritative counts root 37/37 and app-local 26/26.
- [ ] Real-device Safari/Chrome and remote Supabase/RLS/multi-user behavior — NOT RUN.

## Wave 3 event comments and browser photos

- [x] Comments remain isolated by exact event ID; blank sends fail and failed sends retain the draft for retry.
- [x] URL photo creation requires valid HTTP(S) image/source URLs, caption, alt text, and photographer attribution.
- [x] Browser file selection was exercised with a real 609-byte PNG; the photo survived hard reload and could be deleted.
- [x] Unsupported/oversized browser files fail before durable persistence; invalid URL-photo input remains visible and retryable.
- [x] Comment, attributed URL photo, selected file, reload retention, deletion, and invalid-photo retry were exercised in Chrome.
- [x] Exact CDP widths 320×844, 390×844, 430×932, and 1280×900 had no document overflow.
- [x] Root tests 39/39 and app-local tests 28/28; TypeScript, harness, web export, and diff check pass.
- [x] Independent Run 2 — AMBER / PROCEED-WARN, zero blockers after Run 1 draft-retention and file-guard fixes.
- [x] Closeout counts were read from each command's own TAP summary; the earlier mirrored app 39/39 claim is superseded.
- [x] External final gate after `a1e68a1` — AMBER / PROCEED-WARN, zero blockers; authoritative root 39/39 and app-local 28/28 remain independently transcribed.
- [x] Substantive lint supersedes the historical placeholder under OPORD 015; the pre-existing React Native Web shadow warning, live Supabase/RLS/private storage/signed access, physical devices, and multi-user behavior remained warnings or `NOT RUN` for this historical wave.

## Wave 4 completed-event history and product truth

- [x] Completed-event derivation uses the active family's service events and exact-event media/comments, not memory fixtures.
- [x] Run 1 exact-event isolation defect was reproduced and fixed; records for one event cannot appear in another event's recap.
- [x] Lake Geneva renders three photos and one comment in the completed-event history.
- [x] Memories loading, error/retry, empty, populated, exact-route, Back, and hard-reload behavior are covered.
- [x] Home and Memories expose the same service-backed history without introducing a second durable source of truth.
- [x] Dead reminder/staged-photo transient state is absent; the later OPORD 010 preference card is service-backed and explicitly does not claim delivery.
- [x] Calendar copy is truthful and its actions retain a 48px minimum target.
- [x] Exact Chrome viewports 320×844, 390×844, 430×932, and 1280×900 have no document overflow.
- [x] Root tests 43/43 and app-local tests 32/32; TypeScript, harness, Expo web export, and diff check pass.
- [x] Independent Run 2 — AMBER / PROCEED-WARN, zero blockers.
- [x] External final gate after `3d80a62` — AMBER / PROCEED-WARN, zero blockers; authoritative root 43/43 and app-local 32/32 remain independently transcribed.
- [x] Legacy Home/memory fixture exports are unconsumed by production Home and Memories; removal remains advisory cleanup rather than a runtime-truth blocker.
- [x] Substantive lint supersedes the historical placeholder under OPORD 015; remote Supabase/RLS/private object storage, physical devices, and multi-user behavior remained warnings or `NOT RUN` for this historical wave.

## OPORD campaign documentation

## OPORD 015 CI quality gates

- [x] Exact ESLint/Expo config performs substantive TypeScript/React lint with zero allowed warnings.
- [x] CI defines stable Application quality, Security and dependencies, and Migration integrity checks with `contents: read`, concurrency cancellation, bounded timeouts, Node 22, immutable action pins, and exact Supabase CLI version.
- [x] App `npm ci` and cache use the deterministic app lockfile; root tests do not pretend a root lockfile exists.
- [x] Secret scan reports only file/rule metadata; high/critical dependency findings block; exceptions require owner and expiry.
- [x] Migration filenames, strict order, SHA-256 inventory, base-ref immutability, disposable apply, and database lint are gated.
- [x] Local clean gates pass; seeded lint, test, fake-secret, historical-edit, and out-of-order failures each exit nonzero and all seeds are removed.
- [x] GitHub-hosted clean run `29376063946` passed `Application quality`, `Security and dependencies`, and `Migration integrity` on commit `12f760d`, including disposable migration reset/apply/lint.
- [ ] Hosted seeded-failure runs and administrator-required branch checks remain `NOT RUN`; no repository setting was changed.
- [x] All CI jobs check out the same exact event head; release artifact waits for the three quality jobs, invokes the exact-commit build once, verifies source commit, emits digest/commit outputs, and uploads through immutable `actions/upload-artifact` without secrets, provider CLI, deploy, or remote database access.
- [x] Hosted run `29383816628` passed all four jobs and its downloaded exact-head artifact independently matched commit `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce` plus trusted digest `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3`.

## OPORD 012 resilience and capacity

- [x] Approved representative volume is covered: 20 members, 100 events, 100 comments, and 50 media metadata records on one exact event.
- [x] Focused capacity test preserves exact event identity/order and reconstructs the version-7 durable-local envelope with exact counts.
- [x] Local parallel reads stay within 250 ms and selector processing stays within the 200 ms local-processing budget.
- [x] Warm durable-local support is explicit; configured writes are not queued offline.
- [x] Three consecutive 390x844 warm production-export reloads under 500 kbps/400 ms RTT plus 4x CPU meet the <=4,000 ms LCP and <=200 ms longest-task budgets: 2,200/2,208/2,368 ms and 170/110/91 ms respectively, with zero configured-backend requests.
- [x] The already-loaded exact event reaches its final heading and usable RSVP controls in 646 ms; document width remains 390/390.
- [x] Removing decorative tab icons and Moti card entrances preserves five labeled >=48px tabs, reduced-motion image behavior, keyboard order, Back/deep-link/reload, and 320/390/430/1280 no-overflow checks.
- [ ] Cold disconnected reload — intentionally unsupported; no service worker/PWA shell exists.
- [ ] Offline write queue/background sync — intentionally not implemented.
- [ ] Physical Safari/Chrome, VoiceOver/TalkBack, and hosted load/reconnect — `NOT RUN`; local reduced-motion handling and persisted Chrome 200% zoom pass.

## OPORD 013 security and incident response

- [x] Supabase returned errors and rejected transport promises cross one adapter-boundary sanitizer.
- [x] Network, session, access, conflict, rate-limit, and unknown failures use calm recovery copy without raw backend details.
- [x] Safe validation/domain messages remain intact; media recovery states retain their actionable meaning without appended Storage/RPC messages.
- [x] Focused tests inject credentials, tokens, signed URLs, message bodies, storage paths, and SQL/backend details and prove they are absent from surfaced copy.
- [x] The local incident runbook assigns severity, conditional owner, minimal evidence, authorization gates, recovery validation, and records a no-production-action tabletop.
- [ ] Production telemetry, named hosted incident ownership, retention decisions, hosted enforcement, external assessment, and physical-device failure copy remain `NOT RUN`.

## OPORD 016 local release and rollback

- [x] Exact-commit builds use `git archive`, clean `npm ci`, dotenv-disabled durable-local mode, and 300-second npm/export process bounds.
- [x] Two independent candidate exports have byte-identical timestamp-free manifests: 22 files, digest `ef793a72101bb80a5c8f6fe40bd6425fcec7630e04fd1b32c1e25ea4b11117dd`.
- [x] Promotion verifies every file, publishes digest-addressed directories atomically, and moves only a small named alias.
- [x] Local baseline → candidate → baseline rehearsal passed release-header, CSP/security, cache, hashed-asset consistency, and extensionless SPA fallback checks.
- [x] Promoted candidate passed 320/390/430/1280 no-overflow/landmark/navigation, reduced motion, sequential focus, 200% scale proxy, exact-event deep link, Back/reload, and reduced-height validation focus.
- [x] Rollback changed only the frontend alias; no destructive/down database migration or hosted mutation occurred.
- [x] Release web startup validates an exact public runtime overlay before rendering App or creating a service/client; missing/invalid configuration fails closed to an accessible state.
- [x] Exact artifact `12925c40f8068afbaa58b3dd5a7b132ed405e9e510adc90310945e72ca27f38d` ran unchanged under distinct local-demo and loopback-Supabase IDs; config was external/no-store and exact backend origin drove CSP.
- [x] Runtime-config rehearsal restored artifact plus overlay after invalid-config proof; final performance budgets remained green at 3,252/2,712/2,668 ms LCP and 178/115/94 ms longest task.
- [ ] Identical artifact promotion and compatibility across distinct hosted backends remains `NOT RUN`; the loopback overlay used the same local Supabase stack as existing configured proof.
- [x] GitHub run `29383816628` passed all four jobs for exact source `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce`; downloaded artifact digest `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3` verified independently.
- [x] Dedicated site `loopedin-family` deploy `6a56f0408614647fe35cf968` passed transport-only HTTPS/root/runtime no-store/exact CSP/hashed-cache/missing-404/release-environment/hash-reload/signed-out Chrome checks and was restored unchanged to `https://loopedin-family.netlify.app` as staging at `2026-07-15T20:00:24.333Z`; custom domain/Git link remain absent and `travisjohnjones` exact ID is unchanged.
- [x] Exact-head run `29451842237` and digest `7a18b2f5…fc3c8c` produced immutable deploy `6a57fc726b558b21faf57459`; staging rollback restored/verified prior fixed release `6a57f034…` and then restored/verified final release `0.1.0-3cf45367dc85` without database reversal. The new immutable URL is present in Auth redirects.
- [x] Read-only inventory distinguishes dedicated Supabase `vkogznsfthirhxkqysza` (`us-east-2`, healthy) from quarantined `lzscofbvecgpchokxhyb` (`us-west-2`); expected tables are not Data-API-visible, but migration history/emptiness is not inferred.
- [x] Dedicated hosted Supabase records six checked forward migrations, one passwordless Travis Jones identity/profile, one Jones Fam, exactly one owner, and only the two intentional anonymous invitation-preflight RPC grants.
- [x] Hosted Auth Site URL/redirect allow-list now name exact staging, immutable preview, and future production origins; the rendered recovery request returned enumeration-safe success and redacted Auth logs prove recovery mail dispatch to the approved address.
- [x] Hardened hosted synthetic family run `qa-mrml3fsl-a08c4f8e` passed two live-invite outsider denials plus recipient acceptance, owner/member restrictions, three events, RSVPs, comments, reminders, seven notifications, private-media lifecycle, exact-event Realtime, and outsider database denial; protected non-QA hash stayed identical, automated residue was zero across users/profiles/groups/invitations/objects, and exact-ID SQL also returned zero private entitlements/operation maps.
- [ ] User-observed password replacement, real-account hosted core loop/starter content, custom SMTP/invitation delivery, telemetry, backups/restore, physical phones/AT/human checks, custom domain, and production approval remain `NOT RUN`.
- [x] Target-neutral Netlify publish-envelope builder/verifier requires trusted CI digest/commit inputs and rejects tampered/self-consistent untrusted bytes, duplicate/unsafe/unsupported entries, invalid identity/version/epoch, invalid/secret-like overlays, drifted `_headers`/`_redirects`, and partial output; preview and envelope share one runtime/CSP policy.
- [x] Generated static envelope contains no Function/Edge Function, site/team link, install/build command, secret, or deploy action; runtime config is browser/CDN `no-store`, only manifest-verified hashed assets are immutable, shell/manifests revalidate, fragment deep links reload at `/`, and the lack of a catch-all preserves missing-asset 404s.

## OPORD 017 local backup, restore, and data lifecycle

- [x] Logical schemas and all private event-media objects are packaged with migration/object hashes under authenticated AES-256-GCM encryption; the runtime passphrase is not logged or stored.
- [x] Restore uses a fresh database in a random disposable Docker container with no primary volume/network and removes plaintext/container state in `finally`.
- [x] Counts match at 4/1/3/3/6/6/3/38/4/3 for profiles/groups/memberships/events/RSVPs/messages/media/notifications/Auth users/objects; all three object hashes/sizes pass.
- [x] Restored reference checks are zero; member RLS sees 3/6/3 events/messages/media and outsider RLS sees 0/0/0.
- [x] Observed snapshot age 14.806s and restore 7.745s are recorded as measurements, not approved RPO/RTO targets.
- [x] Self-scoped dry-run planning denies cross-user scope, excludes foreign user IDs, is deterministic/bounded, exposes no apply mode, and found zero live row/object discrepancies.
- [x] Fixture tests exercise both orphan directions with review-only grace/retention/legal-hold exclusions.
- [x] Authenticated current-user export includes own profile/memberships and only own created/authored/uploaded/selected records; owned media bytes are embedded without signed URLs.
- [x] PBKDF2-SHA256/AES-256-GCM actual downloads decrypt and verify counts/digests; wrong passphrase and tampering fail; unavailable-media retry succeeds.
- [x] Real loopback Auth sessions for owner/member/outsider exclude pairwise foreign IDs; outsider contributions are empty; 390px inputs/actions are 52/48px with no overflow or console events.
- [ ] Hosted backup/PITR/schedule/retention/export operations, approved RPO/RTO, shared-family export scope, deletion/apply, legal/product policy, and hosted restore remain `NOT RUN`.

## Wave 5 mobile accessibility implementation

- [x] Exactly one main landmark wraps the active screen and the fixed navigation appears before it in DOM order.
- [x] All five tabs are in the sequential keyboard order and expose selected state; no unimplemented roving-focus behavior is claimed.
- [x] Navigation labels are at least 11px, targets remain at least 48px, and main content clears the fixed navigation.
- [x] Create validation focuses the first invalid field and exposes stable invalid/error relationships without changing submitted data.
- [x] Screen/state headings, contextual action names, informative photos, decorative avatars, and live/error semantics have focused contract coverage.
- [x] Root tests 44/44 and app-local tests 33/33; TypeScript, harness, and Expo web export pass.
- [x] Independent Run 1 RED keyboard defect reproduced and corrected; Run 2 accepted at AMBER / PROCEED-WARN with zero blockers.
- [x] Sequential Home → Calendar → Create → Memories → Family keyboard order, Enter routing, one selected tab, one main landmark, and 320×844 width/overflow/navigation sanity passed.
- [x] Card surfaces are static; platform reduced-motion state and changes disable Expo image crossfades while normal image transition durations remain covered.
- [x] Dependency-free Chrome/CDP smoke passes 320/390/430/1280 overflow and landmark checks, five sequential tabs, exact-event deep-link/Back/reload, and invalid-field focus/visibility at a 320×500 keyboard-height proxy.
- [x] A 200% CDP page-scale proxy reports scale 2, a 160 CSS-pixel visual viewport, and no document-width overflow from the 320 CSS-pixel layout.
- [x] Practical Chrome 150 browser zoom uses the persisted native zoom preference: same-window 640→320, 780→390, and 860→430 CSS layouts, DPR 1→2, visual scale 1, CSS zoom 1; owner core screens plus four-role 390px replay have no overflow, clipped control boxes or descendant control text/glyphs, or sub-48px control.
- [ ] Physical Safari/Chrome, VoiceOver/TalkBack, physical software-keyboard behavior, and moderated older-adult testing — `NOT RUN`.

- [x] Responsive-web correction accepted at external Run 3 AMBER / PROCEED-WARN with zero blockers.
- [x] Exactly 17 OPORDs and 60 task rows preserved after platform correction.

- [x] Exactly 17 numeric OPORDs are indexed with resolvable, acyclic dependencies.
- [x] The obsolete combined OPORD 015 is absent; CI, release/rollback, and backup/data lifecycle are separate executable orders 015-017.
- [x] Every OPORD has the required mission, territory, usability, execution, acceptance, validation, stop, risk, and done sections.
- [x] Coverage includes all requested frontend, backend, server/database, security, quality, release, and operations domains.
- [x] Future orders do not claim authorization or live proof.
- [x] Existing M4-M6 persistent-data backlog entries remain and are mapped rather than deleted.
- [x] Persisted native Chrome 200% zoom passes effective 320/390/430 under OPORD 014.
- [ ] iOS Safari/Android Chrome, browser screen-reader, physical software-keyboard, and moderated older-adult validation — NOT RUN; local reduced-motion handling also passes.
- [x] Responsive widths, touch targets, keyboard/history/reload, zoom/reflow, focus, and desktop-secondary gates are documented.
- [x] Native applications and app-store delivery are not active campaign blockers.
- [ ] Remote Supabase, deploy, backup, and restore validation — NOT RUN; safe authorized environment unavailable here.

## M3 event thread

- [x] Messages remain isolated by exact event ID.
- [x] One open configured thread subscribes only to its exact event; server refetch remains authoritative and duplicate-free.
- [x] Separate member sessions receive one live comment without reload; an unrelated event and outsider receive none.
- [x] Successful resubscription refetches a missed comment once; route/event/session cleanup removes the channel and late callbacks are inert.
- [x] Blank sends are rejected and successful sends refetch only the selected event thread.
- [x] Event Detail has loading/error/empty/populated thread states without fixture fallback.
- [x] Pending send is disabled; failure retains the draft; success clears it.
- [x] Existing Event Detail RSVP/logistics remain available when only the thread fails.
- [x] Configured signed-out mode exposes no protected event/thread content.
- [ ] Live two-user RLS — NOT RUN; safe environment unavailable.

Use this before considering a mission complete.

## Core flow

- [x] The main user path still works.
- [x] First-run experience is unchanged; onboarding was out of scope.
- [x] Existing-group zero-event state works at the selector/component boundary.
- [x] Error-state behavior is unchanged; error plumbing was out of scope.
- [x] Unconfigured mode still reaches the existing fixture-backed shell without credentials.
- [x] Configured auth and group failures have explicit non-fixture gates.
- [x] Home and Calendar obtain active-group events through Query and retain the zero-event Create route.
- [x] Create, same-ID Event Detail, and RSVP use the service/Query boundary in automated coverage.
- [x] Unknown event IDs render an explicit state rather than another fixture event.
- [x] Historical M2 phone evidence covered the then-process-local adapter; Wave 0 now adds automated durable-adapter reconstruction coverage. A fresh browser reload gate remains pending.
- [x] Configured-boundary no-fallback phone smoke verified at 390x844.

## Product constraints

- [x] No generic bloat added.
- [x] Core loop improved or stayed intact.
- [x] Anti-goals respected.

## Technical checks

- [x] Tests pass, if present.
- [x] Diff check passes; lint remains a pre-existing placeholder.
- [x] App starts locally.
- [x] No secrets committed.
- [x] No unrelated files changed.
- [x] TypeScript and harness checks pass for M1.
- [x] Mock and configured-unauthenticated phone smoke pass at 390x844.
- [x] M2 root tests pass 12/12; app tests pass 6/6; TypeScript, harness, and diff check pass.
- [x] Live Supabase CRUD recorded as `NOT RUN — ENV unavailable`; no live capability inferred.

## Review

- [x] UX review completed.
- [x] Code review completed.
- [x] Agent review log updated.
- [x] M2 final UX review completed after required phone smokes.
- [x] M2 automated code review completed, with the wave-runnability advisory recorded.

## Final configured browser replay

- [x] Owner, two members, and outsider exercised independent real Auth sessions.
- [x] Invitation create/revoke/decline/accept and same-tab reinvite work.
- [x] Ownership transfer/back, owner removal/reinvite, and member leave/reinvite work.
- [x] Plan create/edit/cancel, every RSVP state, multi-user comments, Memories, notifications, reminders, URL media, actual-file media, and scoped deletion work.
- [x] Realtime outage/reconnect, reminder write retry, and recovery offline copy pass dedicated browser gates.
- [x] Exact deep link, Back, reload, logout/restore, and outsider direct-ID denial pass.
- [x] 320/390/430/1280 widths, one main/five tabs/one selected, >=48px actions, reduced motion, no hover-only controls, and zero console events pass.
- [x] Semantic error/emphasis and success text use >=4.5:1 light-surface color pairs; low-contrast coral/sage text is rejected by regression coverage.
- [x] Practical Chrome UI 200% zoom passes locally at effective 320/390/430 CSS pixels with real Auth roles and exact routes.
- [ ] Physical phone browsers, VoiceOver/TalkBack, and moderated older-adult use remain `NOT RUN`.

## Edge and Firefox configured core loop

- [x] Installed Edge 150 and stock Firefox 151 run one read-only semantic matrix through native CDP and WebDriver BiDi respectively.
- [x] Signed-out validation/recovery, owner core/session restore, member role safety, outsider denial, Back/deep-link/reload, notifications, invitation/export reachability, reminder/thread/gallery, and private signed-image rendering pass.
- [x] 390/430 widths have no document/body overflow or clipped controls; visible controls are at least 48px in both dimensions; authenticated shells have exactly five tabs, one selected tab, and one main landmark.
- [x] Both browser runs finish with zero console warnings/errors, failed requests, or app/backend HTTP errors.
- [x] Browser failure evidence redacts URL query, fragment, and user information; generated matrix files contain no signed tokens or secret-looking values.
- [x] Release CSP permits private images only from the exact validated runtime backend origin and does not add unrelated HTTP origins or wildcards.
- [x] Exact source `31c74466e6faba2e9824cc5c7046c2fbfad5c269` rebuilt as three-file release `0.1.0-31c74466e6fa` with SHA-256 `a8c41774b3cb4bbedc8cc53eb14af95a3f23227d9627e9778df58b568c0ef740`; both engines reran against those bytes.
- [ ] Safari, physical phone browsers, VoiceOver/TalkBack, physical software-keyboard behavior, and moderated older-adult testing remain `NOT RUN`.

## OPORD 005/006 local service and database hardening

- [x] Configured adapter failures cross one non-sensitive service-error boundary; no fixture fallback or raw backend detail is introduced.
- [x] Query reads retry at most once and mutations explicitly never auto-retry; unchanged event/comment manual retries retain UUID operation keys and replay a response-lost committed authoritative row without a duplicate, while distinct operations and actors remain distinct.
- [x] The plan fixture contains 20 members, 100 events, 20 RSVPs, 100 comments and 50 active media rows on one exact event, 20 reminders, and normal trigger-generated notifications.
- [x] Actual adapter query shapes use `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` with exact result bounds and a 100 ms local ceiling.
- [x] An index candidate that benefited only an uncalled activity method was rejected; no speculative migration remains.
- [x] Sequential scans on small or intentionally all-matching event/message/media/RSVP/reminder/member tables are documented rather than misreported as index failures.
- [x] Synthetic rows roll back; dead fixture tuples are vacuumed and nontransactional planner statistics are refreshed from retained rows; exact baseline counts and the populated browser scenario remain unchanged.
- [x] Five ordered migration checksums, database lint, family/media/reminder/RLS matrices, root/app tests, lint, TypeScript, harness, secret scan, and diff checks pass.
- [ ] Server-propagated request versions/correlation IDs, universal deadline and gateway rate enforcement, response-loss idempotency outside the documented targeted write contracts, hosted plans/migrations/telemetry, and production cardinalities remain `NOT RUN`.
