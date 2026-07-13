# Current Mission

Mission ID: `FAMILY-LOOP-DATA-000`

## Mission

Baseline the persistent-data campaign before runtime changes: verify repository state, adopt the data/session boundary, and sequence the smallest core-loop missions.

## Acceptance criteria

- [x] Current capabilities and proof limits are recorded without claiming a live backend.
- [x] ADR 001 defines source-of-truth, fallback, server-state, and transient-state boundaries.
- [x] M1-M6 are ordered with dependencies and narrow non-goals.
- [x] Sergeant verifies documentation against the repository and runs required checks.
- [x] Review log records the verification result.

## Campaign sequence

1. **M0 — Baseline and decision:** capability matrix, ADR 001, campaign order.
2. **M1 — Session gate:** minimum session/loading/error boundary for authenticated service access.
3. **M2 — Persistent event loop:** active-group event reads, Create persistence, same-ID detail, and durable RSVP.
4. **M3 — Event thread:** event-scoped message history and send.
5. **M4 — Event media:** private event-image upload, list, access, and delete.
6. **M5 — Reminders and notifications:** durable event reminder preferences and useful in-app updates.
7. **M6 — Derived memories and closeout:** completed-event memories plus full campaign hardening.

Missions are sequential; later entries are sequencing, not authorization to implement them early.

## M0 execution manifest

Allowed files:

- `tasks/current-mission.md` — mission scope, acceptance, campaign sequencing, and verification record.
- `tasks/backlog.md` — ordered M1-M6 dependencies and non-goals.
- `docs/architecture.md` — adopted boundary in current architecture.
- `docs/adr/001-data-source-and-session-boundary.md` — data/session source-of-truth decision.
- `evals/review-log.md` — verification and gate record.
- `tests/spec-docs.test.js` — portable ADR artifact/convention checks.

Allowed systems: repository documentation and read-only repository inspection; local checks named under Required checks.

Ordered M0 tasks and ownership boundaries:

1. **M0.1 — Baseline:** mission owner records capability evidence and proof limits in `tasks/current-mission.md`.
2. **M0.2 — Decision:** ADR owner records the data/session boundary in `docs/adr/001-data-source-and-session-boundary.md`; architecture owner links the adopted boundary in `docs/architecture.md`.
3. **M0.3 — Sequence:** campaign-record owner records M1-M6 dependencies/non-goals in `tasks/backlog.md` and the summary order in `tasks/current-mission.md`.
4. **M0.4 — Guard:** test owner adds only portable ADR artifact/convention assertions in `tests/spec-docs.test.js`.
5. **M0.5 — Verify:** Sergeant runs the listed read-only checks; review owner records results in `evals/review-log.md`.

Stop immediately on any required runtime-code, Auth UI, migration, deployment, dependency, secret/environment, or M1-M6 feature change; any destructive/irreversible operation; any edit outside the allowed files; or any failed required check that cannot be resolved within this documentation-only M0. Escalate rather than expanding scope. M0 completion does not authorize M1.

## Current-state verification matrix

| Capability | Repository evidence | Rendered behavior | Status |
|---|---|---|---|
| Users/sessions | Auth contract and persisted Supabase client session | No authenticated session gate | Defined; remote unverified |
| Groups/memberships | Schema and service methods | Fixture-derived screens | Defined; remote unverified |
| Events | Mock/Supabase methods and query hooks | Fixture-first Home/Calendar/Detail | Not rendered source of truth |
| RSVPs | Service methods plus local overrides | Zustand-local interaction | Durability unverified |
| Messages | Event-scoped schema/service methods | Fixture/read-only thread | Durability unverified |
| Images/media | Private-bucket definitions and adapter methods | Staged local counts | Deployment/upload unverified |
| Notifications/reminders | Partial schema/service and local drafts | No delivery; local drafts | Partial foundation |
| Memories/recaps | Fixture presentation | No dedicated durable record | Not durably implemented |

Docker is unavailable, so the local Supabase stack is unproven. Remote deployment is unverified. No migration, bucket, RLS, or live-service claim is made.

## Required checks

- [x] Sergeant documentation review
- [x] `powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1`
- [x] `npm test`
- [x] `cd app; npm test`
- [x] `cd app; npx tsc --noEmit`
- [x] `git diff --check`

## Do not touch

- Runtime code, Auth UI, migrations, deployment, dependencies, secrets/environment inspection, or M1-M6 features.
- Billing, settings, teams, notification delivery, onboarding, or unrelated visual work.

## Risks and follow-ups

- Repository definitions are not deployment proof.
- M1 needs explicit authorization for its narrow Auth-area change.
- RLS/private storage require an available safe environment before live verification.

## Definition of done

- [x] Documentation drafted
- [x] Sergeant verification complete
- [x] Checks pass and review log is finalized
