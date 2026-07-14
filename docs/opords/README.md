# LoopedIn Engineering Campaign

## Campaign intent

These 17 operations orders sequence the work required to turn the current mobile prototype into an elegantly simple, dependable family coordination app that older adults can use without coaching. Each OPORD is a separately authorized, independently executable mission. The campaign preserves the event-centered wedge: plan, attend, discuss, and remember one shared event.

This index is planning authority only. It does not prove that a feature is deployed or grant permission to use credentials, change remote infrastructure, run destructive migrations, add dependencies, push, or release.

## Current evidence baseline

| Evidence | Current fact |
|---|---|
| Product foundation | Missions M1-M3 established session gating, Query-owned events/RSVPs, and an event-scoped thread (`tasks/completed.md`; `docs/architecture.md`). |
| Service contract | Mock and Supabase adapters exist in `app/src/services/`; adapter presence is not live proof. |
| Database definition | `supabase/migrations/20260705214111_loopedin_initial_infra.sql` defines tables, RLS, storage policies, and realtime publication. |
| Remote backend | Unverified; no production project, migration deployment, credentials, or live two-user RLS result is claimed. |
| Local backend | Docker is unavailable, so the local Supabase stack has not been exercised. |
| Automated checks | Root tests, app structural tests, TypeScript, and the harness exist. |
| Lint | `app/package.json` still defines a placeholder lint command; it is not substantive lint evidence. |
| Device/usability evidence | Prior 390x844 web smokes exist; native iOS/Android, screen-reader, reduced-motion, and moderated older-adult usability sessions have not been run. |

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
- UI missions use plain language, readable type, at least 48x48-point primary touch targets, screen-reader semantics, reduced-motion behavior, low cognitive load, and a visible recovery route.

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
| 014 | [Test pyramid, native accessibility, and usability](014-test-pyramid-native-accessibility-usability.md) | OPORD-001, OPORD-002, OPORD-003, OPORD-004, OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011, OPORD-012, OPORD-013 | Evidence across contracts, devices, and people |
| 015 | [CI quality gates](015-ci-quality-gates.md) | OPORD-013, OPORD-014 | Enforced lint, test, security, and migration gates |
| 016 | [Release, deployment, and rollback](016-release-deployment-rollback.md) | OPORD-015 | Controlled environment promotion and recovery |
| 017 | [Backup, restore, and data lifecycle](017-backup-restore-data-lifecycle.md) | OPORD-006, OPORD-016 | Proven restore, retention, export, and deletion lifecycle |

No later order may silently absorb an earlier order's unfinished acceptance criteria. The stable numeric registry does not override the dependency-safe execution order.

Canonical execution order: OPORD-001 -> OPORD-002 -> OPORD-005 -> OPORD-006 -> OPORD-003 -> OPORD-004 -> OPORD-007 -> OPORD-008 -> OPORD-009 -> OPORD-010 -> OPORD-011 -> OPORD-012 -> OPORD-013 -> OPORD-014 -> OPORD-015 -> OPORD-016 -> OPORD-017

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
| Unit, integration, contract, native, accessibility, and usability tests | 014 |
| CI quality gates | 015 |
| Deployment, release, promotion, and rollback | 016 |
| Backup, restore, retention, export, and deletion | 017 |

## Live evidence matrix

Each execution updates this table by linking evidence rather than changing `Planned` based on intent.

| Capability | Repository definition | Local executable proof | Conditional staging/native/human proof |
|---|---|---|---|
| Session/auth gate | Present | Mock/configured signed-out smoke exists | Live auth/recovery not run |
| Groups/events/RSVP | Contract and UI present | Mock tests and web smoke exist | Live CRUD/RLS not run |
| Event chat | Contract and UI present | Mock isolation/send tests exist | Live realtime/two-user not run |
| Media | Schema/adapter present | Not yet connected end-to-end | Native picker/storage policy proof not run |
| Notifications/reminders | Partial contract/schema | Not yet connected end-to-end | Delivery/device proof not run |
| Memories | Fixture presentation only | Fixture behavior only | Derived durable model not run |
| Backup/restore/release | Planning only | Not run | Staging restore/release rehearsal not run |

## Campaign completion rule

The campaign is complete only when all 17 orders are `Complete`, each has a review-log entry with exact evidence, all always-local gates pass, every required conditional gate is either passed in a safe authorized environment or explicitly accepted as a release blocker, and no unresolved RED boundary is hidden by mock or fixture evidence.
