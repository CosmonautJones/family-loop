# LoopedIn Engineering Campaign

## Campaign intent

These 17 operations orders sequence the work required to turn the current Expo/React Native Web prototype into an elegantly simple, dependable responsive web app that older adults can use without coaching. Phone browsers are primary (iOS Safari and Android Chrome); desktop web is a secondary responsive target. Native binaries, app stores, and EAS are future non-goals. Each OPORD is a separately authorized, independently executable mission. The campaign preserves the event-centered wedge: plan, attend, discuss, and remember one shared event.

This index is planning authority only. It does not prove that a feature is deployed or grant permission to use credentials, change remote infrastructure, run destructive migrations, add dependencies, push, or release.

## Current evidence baseline

| Evidence | Current fact |
|---|---|
| Product foundation | Local Waves 0-6 and the configured local Supabase core loop are implemented. Query owns authenticated family, invitation, event, RSVP, comment, media, update, and memory data (`docs/architecture.md`; `evals/review-log.md`). |
| Service contract | Durable-local, memory-test, and Supabase adapters are executable. Configured failures do not fall back to fixtures. |
| Database definition | Seven forward migrations define the baseline, hardened private-media lifecycle, family invitation lifecycle, recipient-scoped updates, private event/comment idempotency, hosted RPC grants, and privacy-safe error telemetry. |
| Remote backend | Dedicated staging `vkogznsfthirhxkqysza` matches all seven migrations; final synthetic multi-user proof passes, the readiness regression passes, and real owner state has three upcoming trips, one completed trip, four RSVPs/comments, and three private photos. Real password completion and recipient delivery remain open. |
| Local backend | Loopback Supabase migrations, database lint, Auth, four-session RLS, private Storage, and cleanup-safe lifecycle scripts pass independently of hosted staging. |
| Automated checks | Root/app tests, substantive lint, TypeScript, Expo export, harness, family/media E2E, database lint, scenario verification, secret scanning, dependency policy, migration validation, and diff checks pass. Historical PR #1 run `29451842237` passed on `3cf45367…`; PR #4 was exact-head and independently GREEN, and merge `2a4b259…` passed main run `29466733884`. Administrator-required checks remain unconfigured. |
| Lint | Exact ESLint 9 and Expo flat config run with zero warnings; clean and seeded-failure evidence is recorded under OPORD 015. |
| Browser/usability evidence | Configured Chrome at 320/390/430 CSS pixels passed no-overflow and >=48px visible-control checks; Back/deep-link/reload, reduced-motion emulation, a full four-session scenario, and persisted native 200% browser zoom at effective 320/390/430 passed. Lighthouse Accessibility and Best Practices scored 100. Physical iOS/Android, screen readers, and moderated older-adult sessions remain `NOT RUN`. |

## Standard OPORD template

Every numbered order contains: Status; Situation and evidence; Mission/objective; Dependencies; Non-goals; Authorized territory (files/systems); Forbidden territory; Older-adult usability guardrail; Execution; Acceptance criteria; Validation commands/evidence; Stop conditions/authorization limits; Risks/follow-ups; and Definition of done.

Status semantics:

- `Planned` — sequenced documentation only; execution requires a separately approved mission.
- `Authorized` — scope and RED boundaries were explicitly approved for one execution.
- `In progress` — authorized work has started and evidence is accumulating.
- `Blocked` — an external prerequisite or authorization prevents safe progress.
- `Complete` — every acceptance item has direct evidence and the review log records the gate.
- `Superseded` — replaced by a named later decision; never silently discarded.

## Global authorization boundaries

All missions use `Correctness > Safety > Scope discipline > Speed`.

- GREEN: local, reversible edits inside that mission's explicit territory; focused tests; documentation.
- AMBER: two valid interpretations, unavailable test facility, or a significant non-breaking design choice. Pick the simplest safe path and log the limitation.
- RED: credentials or secrets; remote deployment or mutation; destructive or irreversible migrations; production data access; backup deletion; public API break; new dependency; push/PR/release; or work outside authorized territory. Stop and obtain separate approval.
- Never infer live capability from schemas, adapters, mocks, generated clients, or a passing structural test.
- Every mission preserves explicit loading, error, empty, pending, success, and recoverable-failure states where applicable.
- UI missions use plain language, readable type, at least 48x48 CSS-pixel primary touch targets, screen-reader semantics, visible keyboard focus, reduced-motion behavior, low cognitive load, and a visible recovery route. Essential actions never depend on hover.
- Mobile-web gates cover 320, 390, and 430 CSS-pixel widths, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, and conditional real-device Safari/Chrome checks; desktop remains a secondary regression target.

## Registry and dependencies

Numeric OPORD IDs are stable identifiers, not execution positions. The registry stays numeric for lookup; execution follows the dependency-safe canonical order below.

| Order | OPORD | Depends on | Primary outcome |
|---:|---|---|---|
| 001 | [Product simplicity and information architecture](001-product-simplicity-information-architecture.md) | None | Small, stable navigation and vocabulary |
| 002 | [Accessible design system](002-accessible-design-system.md) | OPORD-001 | Reusable older-adult interaction standards |
| 003 | [Authentication and account recovery](003-authentication-account-recovery.md) | OPORD-002, OPORD-005, OPORD-006 | Invite-first identity, recovery, and profile bootstrap |
| 004 | [Users, groups, and invitations](004-users-groups-invitations.md) | OPORD-003, OPORD-006 | Safe group ownership and invitation lifecycle |
| 005 | [Service boundary and environment readiness](005-service-boundary-environment-readiness.md) | OPORD-002 | Executable client/server contracts and connection readiness |
| 006 | [Database lifecycle, RLS, and indexes](006-database-lifecycle-rls-indexes.md) | OPORD-005 | Tested schema lifecycle and tenant isolation |
| 007 | [Events, calendar, and RSVP](007-events-calendar-rsvp.md) | OPORD-004, OPORD-006 | Durable coordination backbone |
| 008 | [Event conversation and realtime](008-event-conversation-realtime.md) | OPORD-007 | Event-scoped chat with reconnection semantics |
| 009 | [Private media lifecycle](009-private-media-lifecycle.md) | OPORD-006, OPORD-007 | Private image upload, display, and deletion |
| 010 | [Reminders and in-app notifications](010-reminders-in-app-notifications.md) | OPORD-006, OPORD-007 | Useful, deduplicated event updates |
| 011 | [Derived memories and recaps](011-derived-memories-recaps.md) | OPORD-007, OPORD-008, OPORD-009 | Completed events become memories |
| 012 | [Resilience, offline, performance, and capacity](012-resilience-offline-performance-capacity.md) | OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011 | Predictable degraded-network behavior |
| 013 | [Security, observability, and incident response](013-security-observability-incident-response.md) | OPORD-005, OPORD-006, OPORD-012 | Privacy controls and operable failure signals |
| 014 | [Test pyramid, mobile-web accessibility, and usability](014-test-pyramid-mobile-web-accessibility-usability.md) | OPORD-001, OPORD-002, OPORD-003, OPORD-004, OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011, OPORD-012, OPORD-013 | Evidence across contracts, browsers, and people |
| 015 | [CI quality gates](015-ci-quality-gates.md) | OPORD-013, OPORD-014 | Enforced lint, test, security, and migration gates |
| 016 | [Web release, deployment, and rollback](016-web-release-deployment-rollback.md) | OPORD-015 | Controlled web/backend promotion and recovery |
| 017 | [Backup, restore, and data lifecycle](017-backup-restore-data-lifecycle.md) | OPORD-006, OPORD-016 | Proven restore, retention, export, and deletion lifecycle |

No later order may silently absorb an earlier order's unfinished acceptance criteria. The stable numeric registry does not override the dependency-safe execution order.

Canonical execution order: OPORD-001 -> OPORD-002 -> OPORD-005 -> OPORD-006 -> OPORD-003 -> OPORD-004 -> OPORD-007 -> OPORD-008 -> OPORD-009 -> OPORD-010 -> OPORD-011 -> OPORD-012 -> OPORD-013 -> OPORD-014 -> OPORD-015 -> OPORD-016 -> OPORD-017

## 2026-07-15 evidence disposition

`LOCAL COMPLETE` means every product acceptance item that can be proven in the loopback repository/runtime has direct evidence. `PARTIAL/CONDITIONAL` means useful implementation exists but one or more stated acceptance items remain open. `NOT RUN` means the order's essential implementation or operational exercise has not occurred. These labels do not alter the dependency graph or erase the original mission intent.

| OPORD | Disposition | Direct evidence | Open acceptance/release gates |
|---|---|---|---|
| 001 | LOCAL COMPLETE / CONDITIONAL | Five-tab event-centered IA, exact-ID routes, Back and reload; `1bc3421`, `89d8720`, configured browser proof | Ten-second first-time comprehension and moderated older-adult use `NOT RUN` |
| 002 | LOCAL COMPLETE / EXTERNAL CONDITIONAL | 320/390/430 no-overflow, >=48px controls, keyboard/landmark/reduced-motion fixes, semantic contrast regression, Lighthouse Accessibility 100, and persisted native 200% Chrome zoom | Physical Safari/Chrome, VoiceOver/TalkBack, and moderated-human validation `NOT RUN` |
| 003 | STAGING SMTP/DELIVERY PASS / EXTERNAL CONDITIONAL | Local Auth/recovery plus exact hosted redirect custody, custom Auth SMTP, and provider-delivered recovery dispatch to the approved owner | Gmail receipt, user-observed reset/replay, new-account confirmation, provider rate-limit characterization, physical browsers/AT `NOT RUN` |
| 004 | STAGING DELIVERY PASS / PRODUCTION CONDITIONAL | Hosted entitled family, email-bound invite acceptance, owner/member restrictions, outsider denial, owner-triggered provider delivery, exact delivered-link acceptance, zero residue | Gmail/new-account proof, separate `admin` role, additional real recipients, production proof `NOT RUN` |
| 005 | STAGING READINESS PASS / PRODUCTION CONDITIONAL | Runtime adapters, safe errors, no-secret availability, idempotent retry contracts, and readiness-aware Realtime/refetch pass on dedicated staging | Server-propagated version/correlation IDs, universal deadline/rate enforcement, and production readiness `NOT RUN` |
| 006 | STAGING SYNTHETIC COMPLETE / PRODUCTION CONDITIONAL | Seven hosted migrations through `20260716002122`, table RLS/private Storage/protected RPC grants, owner/member/outsider matrix, local query plans | Production-cardinality plans and production deployment `NOT RUN` |
| 007 | LOCAL COMPLETE / CONDITIONAL | Durable create/edit/cancel, exact-ID Home/Calendar/detail, RSVP/refetch/reload across users; configured browser proof | DST/locale matrix and physical/mobile-human checks `NOT RUN` |
| 008 | STAGING SYNTHETIC COMPLETE / DEVICE CONDITIONAL | Local reconnect proof plus hosted exact-event Realtime/comment/outsider-denial/cleanup matrix | Physical Safari/Chrome, AT, long-outage hosted behavior, real-account observation `NOT RUN` |
| 009 | STAGING SYNTHETIC COMPLETE / DEVICE CONDITIONAL | Hosted private upload/activate/member-read/outsider-deny/claim-delete-finalize and zero object residue | Physical camera/gallery and real-family media `NOT RUN` |
| 010 | STAGING SYNTHETIC COMPLETE / DEVICE CONDITIONAL | Hosted persisted reminder and seven recipient-scoped in-app notifications plus local outage/retry proof | Physical devices and real-account observation `NOT RUN`; push/email/SMS excluded |
| 011 | LOCAL COMPLETE / CONDITIONAL | Completed-event derived memories from exact event comments/media, empty/error/query states, browser proof | Physical-browser/human usability `NOT RUN` |
| 012 | LOCAL COMPLETE / EXTERNAL CONDITIONAL | Representative 20/100/100/50 capacity, configured outage/draft retry once, reload persistence, and corrected dependency-free warm 390px production-export gate: all three runs pass <=4,000 ms LCP, <=200 ms longest task, and exact-event <=1 second | Cold offline reload/queued writes remain unsupported product non-goals; hosted load/reconnect, physical devices/AT, and moderated use `NOT RUN` |
| 013 | STAGING OBSERVABILITY PASS / PRODUCTION CONDITIONAL | Hosted outsider denial, no-secret availability, bounded authenticated error ingestion, 30d/24h retention, and manually dispatched aggregate/controlled-alert proof | First hourly schedule observation, named production ownership/routing, and external assessment `NOT RUN` |
| 014 | LOCAL COMPLETE / EXTERNAL CONDITIONAL | Local integration matrices, 320/390/430/1280 Chrome, Lighthouse 100/100, keyboard/landmark/reduced-motion checks, and persisted native 200% Chrome zoom at effective 320/390/430 across real Auth roles | Physical iOS/Android, VoiceOver/TalkBack, physical software keyboards, and moderated older-adult study `NOT RUN` |
| 015 | HOSTED CLEAN COMPLETE / ENFORCEMENT CONDITIONAL | PR #4 exact GREEN plus independent GREEN; merge `2a4b259…` passed main run `29466733884` | Hosted seeded-failure proof and administrator-required private-repo checks `NOT RUN` |
| 016 | STAGING COMPLETE / PRODUCTION CONDITIONAL | Release `0.1.0-2721a98ce6fc`/deploy `6a591b138c9727a4b2ca6d48` on separate HTTPS Netlify staging, external config/CSP/cache, final synthetic/readiness gates, Auth SMTP/provider-delivered invitation acceptance, prior exact-deploy rollback/restoration | Gmail/new-account/password completion, physical devices/AT, native hosted 200% observation, separate production backend, custom domain, production approval/promotion `NOT RUN` |
| 017 | HOSTED BACKUP/RESTORE + RECOVERABLE GRACE/EXPORT PASS / PURGE PARTIAL | Dispatch `29465195044` restores logical data/metadata with reconstructed private-byte hashes and RLS. Synthetic lifecycle `lqa-mrni99q8-d25f64ff` and three-browser export `qa-mrniaqp3-c0cb2cea` pass exact scope, denial/recovery, integrity, outsider isolation, and zero residue. | First cron observation, managed PITR, replacement cutover, external restore-safe journal, permanent Postgres/Storage/Auth purge, retention-orphan apply, physical devices/AT `NOT RUN` |

Machine-readable adjacency list (the same `Depends on:` values appear in each order):

```text
OPORD-001: None
OPORD-002: OPORD-001
OPORD-003: OPORD-002, OPORD-005, OPORD-006
OPORD-004: OPORD-003, OPORD-006
OPORD-005: OPORD-002
OPORD-006: OPORD-005
OPORD-007: OPORD-004, OPORD-006
OPORD-008: OPORD-007
OPORD-009: OPORD-006, OPORD-007
OPORD-010: OPORD-006, OPORD-007
OPORD-011: OPORD-007, OPORD-008, OPORD-009
OPORD-012: OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011
OPORD-013: OPORD-005, OPORD-006, OPORD-012
OPORD-014: OPORD-001, OPORD-002, OPORD-003, OPORD-004, OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011, OPORD-012, OPORD-013
OPORD-015: OPORD-013, OPORD-014
OPORD-016: OPORD-015
OPORD-017: OPORD-006, OPORD-016
```

## Coverage matrix

| Required engineering domain | Governing OPORD(s) |
|---|---|
| Older-adult accessibility and cognitive simplicity | 001, 002, 014 |
| Frontend navigation, visual design, and forms | 001, 002, 003, 007 |
| Authentication, users, groups, and invitations | 003, 004 |
| API/server boundary and environment readiness | 005, 013 |
| Database, RLS, migrations, and indexes | 006, 015, 017 |
| Events, RSVP, and calendar | 007 |
| Chat and realtime | 008 |
| Images and private object storage | 009 |
| Reminders and notifications | 010 |
| Memories and recaps | 011 |
| Offline behavior, resilience, performance, and capacity | 012 |
| Security, privacy, observability, and incident response | 013 |
| Unit, integration, contract, mobile-web, accessibility, and usability tests | 014 |
| CI quality gates | 015 |
| Deployment, release, promotion, and rollback | 016 |
| Backup, restore, retention, export, and deletion | 017 |

## Live evidence matrix

Each execution updates this table by linking evidence rather than changing `Planned` based on intent.

| Capability | Repository definition | Local executable proof | Conditional staging/browser/human proof |
|---|---|---|---|
| Session/auth gate | Present | Local Auth, invite-bound signup/sign-in, restore/logout, protected-content gate, and full Mailpit recovery/reset pass | Hosted redirects, custom SMTP, and provider-delivered recovery pass; Gmail receipt, user-observed reset/replay, new-account confirmation, and physical-device/AT remain open |
| Groups/events/RSVP | Present | Four-session local creation/invite/transfer plus CRUD/RSVP/RLS pass | Hosted synthetic multi-user pass plus real owner trips/RSVP/comments/photos; real browser session and recipient delivery open |
| Event chat | Durable scoped comments and exact-event subscription present | Multi-user isolation/reload plus genuine Realtime outage, resubscribe/refetch convergence, route teardown, and cleanup pass | Hosted synthetic comments/exact-event delivery pass; long-outage, physical-device/AT, real-account observation open |
| Media | Hardened schema/adapter/UI present | Private Storage/RLS matrix plus URL and actual file upload pass | Hosted synthetic private lifecycle/outsider denial pass; physical camera/gallery and real-family media open |
| Notifications/reminders | In-app updates plus persisted fixed event preference present | Recipient isolation, exact-event navigation, mark/read/clear, two-user preference isolation/relogin, outsider denial, and configured retry pass | Hosted synthetic reminder/seven notifications pass; physical/real-account observation open; push/email/SMS excluded |
| Memories | Derived Query-backed presentation | Completed-event media/comment derivation and reload pass | Physical/mobile-human validation not run |
| Backup/restore/release | Immutable-artifact/rollback, encrypted backup, isolated restore, and current-user encrypted export tooling present | Local recovery and scoped exports pass | Hosted release/rollback and logical DB/private-object restore pass; scheduled run, managed PITR, replacement cutover, and deletion apply remain open |

## Campaign completion rule

The campaign is complete only when all 17 orders are `Complete`, each has a review-log entry with exact evidence, all always-local gates pass, every required conditional gate is either passed in a safe authorized environment or explicitly accepted as a release blocker, and no unresolved RED boundary is hidden by mock or fixture evidence.

## Command checkpoint — 2026-07-16

The latest staging release is source `2721a98ce6fc03a1263ebc5284d90ac936d2e571`, release `0.1.0-2721a98ce6fc`, application digest `3794214c24c33c82961fd9c96a66c9bf2fc9809e366bfb03f4ce31c138a4779a`, Netlify deploy `6a591b138c9727a4b2ca6d48`, and Supabase migration `20260716150236_invitation_email_delivery` on dedicated project `vkogznsfthirhxkqysza`. Prior deploy `6a58e22e48d42235e0ea40e0` is the rollback target; the previous exact-pair rollback/restoration passed without database reversal. Main CI `29518737936`, availability, telemetry, and post-migration backup/restore `29517385245` are GREEN.

Final synthetic core-loop run `qa-mrmw9a6b-dcce7de2` and hosted invitation-mail run `mailqa-mrnu92ro-be6d0bcc` pass with zero residue. The campaign is not production-complete: Gmail inbox/new-account/password completion, additional approved recipient addresses, a separate production Supabase plan/org/region and SMTP boundary, physical phone/assistive-technology checks, first cron observation, native hosted 200% observation, managed PITR, custom domain, and explicit production approval remain gates.
