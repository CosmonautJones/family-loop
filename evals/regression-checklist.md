# Regression Checklist

## OPORD campaign documentation

- [x] Exactly 15 numeric OPORDs are indexed in dependency order.
- [x] Every OPORD has the required mission, territory, usability, execution, acceptance, validation, stop, risk, and done sections.
- [x] Coverage includes all requested frontend, backend, server/database, security, quality, release, and operations domains.
- [x] Future orders do not claim authorization or live proof.
- [x] Existing M4-M6 persistent-data backlog entries remain and are mapped rather than deleted.
- [ ] Native-device, screen-reader, reduced-motion, and moderated older-adult validation — NOT RUN; future OPORD 014.
- [ ] Remote Supabase, deploy, backup, and restore validation — NOT RUN; safe authorized environment unavailable here.

## M3 event thread

- [x] Messages remain isolated by exact event ID.
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
- [x] Complete M2 mock phone loop verified at 390x844 through mutation/refetch; hard reload correctly documented as resetting process-local mock data.
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
