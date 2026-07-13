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
