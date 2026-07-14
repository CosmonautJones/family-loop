# LoopedIn Engineering Campaign

## Campaign intent

These 17 operations orders sequence the work required to turn the current Expo/React Native Web prototype into an elegantly simple, dependable responsive web app that older adults can use without coaching. Phone browsers are primary (iOS Safari and Android Chrome); desktop web is a secondary responsive target. Native binaries, app stores, and EAS are future non-goals. Each OPORD is a separately authorized, independently executable mission. The campaign preserves the event-centered wedge: plan, attend, discuss, and remember one shared event.

This index is planning authority only. It does not prove that a feature is deployed or grant permission to use credentials, change remote infrastructure, run destructive migrations, add dependencies, push, or release.

## Current evidence baseline

| Evidence | Current fact |
|---|---|
| Product foundation | Local Waves 0-6 and the configured local Supabase core loop are implemented. Query owns authenticated family, invitation, event, RSVP, comment, media, update, and memory data (`docs/architecture.md`; `evals/review-log.md`). |
| Service contract | Durable-local, memory-test, and Supabase adapters are executable. Configured failures do not fall back to fixtures. |
| Database definition | Four forward migrations define the baseline, hardened private-media lifecycle, family invitation lifecycle, and recipient-scoped update generation. |
| Remote backend | Unverified; no production project, migration deployment, credentials, or live two-user RLS result is claimed. |
| Local backend | Loopback Supabase migrations, database lint, Auth, four-session RLS, private Storage, and cleanup-safe lifecycle scripts pass. This is not hosted proof. |
| Automated checks | Root/app tests, substantive lint, TypeScript, Expo export, harness, local family/media E2E, database lint, scenario verification, secret scanning, dependency policy, migration validation, and diff checks pass locally. Hosted CI remains unobserved. |
| Lint | Exact ESLint 9 and Expo flat config run with zero warnings; clean and seeded-failure evidence is recorded under OPORD 015. |
| Browser/usability evidence | Configured Chrome at 320/390/430 CSS pixels passed no-overflow and >=48px visible-control checks; Back/deep-link/reload, reduced-motion emulation, and a full four-session scenario passed. Lighthouse Accessibility and Best Practices scored 100. Physical iOS/Android, screen readers, practical 200% zoom, and moderated older-adult sessions remain `NOT RUN`. |

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

## 2026-07-14 evidence disposition

`LOCAL COMPLETE` means every product acceptance item that can be proven in the loopback repository/runtime has direct evidence. `PARTIAL/CONDITIONAL` means useful implementation exists but one or more stated acceptance items remain open. `NOT RUN` means the order's essential implementation or operational exercise has not occurred. These labels do not alter the dependency graph or erase the original mission intent.

| OPORD | Disposition | Direct evidence | Open acceptance/release gates |
|---|---|---|---|
| 001 | LOCAL COMPLETE / CONDITIONAL | Five-tab event-centered IA, exact-ID routes, Back and reload; `1bc3421`, `89d8720`, configured browser proof | Ten-second first-time comprehension and moderated older-adult use `NOT RUN` |
| 002 | PARTIAL/CONDITIONAL | 320/390/430 no-overflow, >=48px controls, keyboard/landmark/reduced-motion fixes, Lighthouse Accessibility 100; `1bc3421`, `8703582`, `74e7e2b` | Measured full contrast worksheet, practical 200% zoom, VoiceOver/TalkBack `NOT RUN` |
| 003 | PARTIAL/CONDITIONAL | Invite-bound signup/sign-in, neutral invite errors, session restore/logout, protected-content gate; `3ebb0a0`..`e68d615` | Password recovery/reset and production email delivery `NOT IMPLEMENTED/NOT RUN`; physical-browser autofill/deep-link checks `NOT RUN` |
| 004 | LOCAL COMPLETE / CONDITIONAL | Atomic entitled family creation; email-bound invite accept/decline/revoke; remove/leave/transfer; four-session RLS; `a1faa25`..`de5b68d`, `079e4e6`..`40b2dec` | Hosted policy state and production invite delivery `NOT RUN` |
| 005 | PARTIAL/CONDITIONAL | Three runtime adapters, visible configured failures, loopback readiness, migration/lint/E2E scripts | General version/error-envelope/correlation-ID/rate-limit contract and hosted readiness probe incomplete |
| 006 | PARTIAL/CONDITIONAL | Forward migrations, FK/uniqueness/RLS/direct-ID matrices, local database lint | Representative-volume query-plan/index evidence and hosted migration state `NOT RUN` |
| 007 | LOCAL COMPLETE / CONDITIONAL | Durable create/edit/cancel, exact-ID Home/Calendar/detail, RSVP/refetch/reload across users; configured browser proof | DST/locale matrix and physical/mobile-human checks `NOT RUN` |
| 008 | PARTIAL | Durable event-isolated comments and multi-session reload pass | Realtime subscription, reconnect convergence, and cleanup lifecycle `NOT IMPLEMENTED/NOT RUN` |
| 009 | LOCAL COMPLETE / CONDITIONAL | Pending/active/deleting lifecycle, signed private reads, upload/list/delete, RLS/Storage attacks, actual browser file selection; `a9769ec`, `c6ee2b2` | Physical Safari/Chrome camera/gallery and hosted Storage `NOT RUN` |
| 010 | PARTIAL | Recipient-scoped in-app updates, exact-event navigation, read/clear persistence; `c612a75` | Persisted reminder preference is not implemented; production delivery is excluded and `NOT RUN` |
| 011 | LOCAL COMPLETE / CONDITIONAL | Completed-event derived memories from exact event comments/media, empty/error/query states, browser proof | Physical-browser/human usability `NOT RUN` |
| 012 | PARTIAL | Representative 20/100/100/50 capacity, reload/server-restart persistence, exact-once retry/draft protections, throttled-browser metrics, reduced motion, and no-overflow proof | Warm Slow-3G LCP and long-task budgets fail; cold offline, hosted load, and physical-device tests remain unsupported or `NOT RUN` |
| 013 | PARTIAL | Local owner/member/outsider RLS and Storage attack matrices; privacy-safe errors; incident runbook/tabletop | Production telemetry, named hosted ownership, external assessment, and hosted enforcement `NOT RUN` |
| 014 | PARTIAL/CONDITIONAL | Local integration matrices, 320/390/430/1280 Chrome, Lighthouse 100/100, keyboard/landmark/reduced-motion checks, and 200% scale proxy | Physical iOS/Android, VoiceOver/TalkBack, practical 200% browser zoom, and moderated older-adult study `NOT RUN` |
| 015 | PARTIAL/CONDITIONAL | Substantive pinned lint; three least-privilege CI jobs; secret/audit/migration validators; local clean and five seeded-failure proofs | GitHub-hosted runs, disposable-PR failure proof, and administrator-required checks `NOT RUN` |
| 016 | PARTIAL/CONDITIONAL | Exact-commit canonical artifacts, digest verification/store, local alias promotion/rollback, executable CSP/security/cache/SPA policy, and mobile-web candidate smoke | Hosted environment separation/runtime config, GitHub-hosted green commit, DNS/TLS, configured staging backend, physical devices, deployment, and production approval `NOT RUN` |
| 017 | NOT RUN | Private row/object lifecycle and cleanup-safe local tests exist | Backup/PITR, isolated restore, export/deletion, retention, orphan-reconciliation drill, RPO/RTO `NOT RUN` |

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
| Session/auth gate | Present | Local Auth, invite-bound signup/sign-in, restore/logout, protected-content gate pass | Recovery email/reset and hosted Auth not run |
| Groups/events/RSVP | Present | Four-session local creation/invite/transfer plus CRUD/RSVP/RLS pass | Hosted CRUD/RLS not run |
| Event chat | Durable scoped comments present | Multi-user isolation and reload pass | Realtime subscription/reconnect not implemented |
| Media | Hardened schema/adapter/UI present | Private Storage/RLS matrix plus URL and actual file upload pass | Physical Safari/Chrome camera/gallery and hosted Storage not run |
| Notifications/reminders | In-app updates present; reminder preference absent | Recipient isolation, exact-event navigation, mark/read/clear pass | Reminder preference incomplete; production delivery deferred |
| Memories | Derived Query-backed presentation | Completed-event media/comment derivation and reload pass | Physical/mobile-human validation not run |
| Backup/restore/release | Local immutable-artifact and rollback tooling present | Loopback promotion/cache/header/SPA/mobile smoke and rollback pass | Hosted staging release and restore rehearsal not run |

## Campaign completion rule

The campaign is complete only when all 17 orders are `Complete`, each has a review-log entry with exact evidence, all always-local gates pass, every required conditional gate is either passed in a safe authorized environment or explicitly accepted as a release blocker, and no unresolved RED boundary is hidden by mock or fixture evidence.
