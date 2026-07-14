# Regression Checklist

## Wave 0 durable local service

- [x] Default/unconfigured mode is reload-durable local AsyncStorage, not process-only memory.
- [x] Tests can explicitly select the isolated memory factory and reset/reseed without leaking state.
- [x] Version-1 persistence errors are visible and never trigger silent data replacement.
- [x] Jones Family seed identity, chronology, RSVPs, event comments, memories, and media metadata are internally consistent.
- [x] Supabase mode is explicit and cannot silently fall back when configuration is absent or the backend fails.
- [x] Unsplash demonstration URLs retain captions; private upload and formal attribution/domain handling remain later media work.
- [x] External Run 2 Wave 0 gate — AMBER / PROCEED-WARN, zero blockers; 40 adversarial mutations accepted as same-runtime coordinated-durability evidence (exact mix not supplied); fresh fix evidence root 29/29, app 18/18, TypeScript, harness, web export, and diff check pass.
- [ ] Substantive lint — placeholder command only.
- [ ] Actual browser hard-reload — NOT RUN; adapter reconstruction passed, but it is limited evidence.
- [ ] Browser durability does not prove remote/multi-user/RLS/private-media behavior; Safari/no-Web-Locks cross-tab atomicity is also unproven.
- [ ] Unsplash attribution/domain handling — follow-up in the private-media wave.

## Wave 1 family membership and navigation

- [x] `listGroupMembers(groupId)` returns the five Jones members and preserves group isolation across mock and durable reconstruction.
- [x] Family uses active-group, member, and event Query data with loading, error/retry, no-family, and no-members states; fixture onboarding and dead controls are absent.
- [x] Family is the fifth tab; one tablist/five tabs render, the active tab has a visible `Selected` marker, and Chrome AX exposed `Family Selected`.
- [x] Pure hash-route parser/formatter tests cover all tabs, exact encoded event IDs, return source, and unknown/invalid fallback to Home.
- [ ] Interactive browser Back and hard reload — NOT PROVEN; pure route tests do not establish browser-history behavior.
- [x] Exact CDP viewport proof at 320/390/430/1280: HTML/body `scrollWidth === clientWidth`; Family and Owner were present and all five tabs remained reachable.
- [ ] Remote Supabase membership/RLS and real-phone Safari/Chrome — NOT RUN.
- [ ] Substantive lint — placeholder command only; AMBER.
- [x] Independent Run 2 gate — RED on retained-v1 role migration; the blocker is addressed by `483e55e` below.
- [x] Retained pre-role v1 envelope migrates once to v2 on the same key; data/revision and valid roles survive, missing Jones roles receive deterministic owner/member values, and unsupported versions stay visible.
- [x] CDP 320 hard reload from retained v1: width 320, Alex Owner, custom trip visible, stored v2 revision 11, custom event/message/notification and owner + four members preserved.
- [ ] Independent Run 3 gate — pending; Run 2 migration blocker is fixed but not self-certified final GREEN.

## OPORD campaign documentation

- [x] Responsive-web correction accepted at external Run 3 AMBER / PROCEED-WARN with zero blockers.
- [x] Exactly 17 OPORDs and 60 task rows preserved after platform correction.

- [x] Exactly 17 numeric OPORDs are indexed with resolvable, acyclic dependencies.
- [x] The obsolete combined OPORD 015 is absent; CI, release/rollback, and backup/data lifecycle are separate executable orders 015-017.
- [x] Every OPORD has the required mission, territory, usability, execution, acceptance, validation, stop, risk, and done sections.
- [x] Coverage includes all requested frontend, backend, server/database, security, quality, release, and operations domains.
- [x] Future orders do not claim authorization or live proof.
- [x] Existing M4-M6 persistent-data backlog entries remain and are mapped rather than deleted.
- [ ] iOS Safari/Android Chrome, browser screen-reader, reduced-motion, and moderated older-adult validation — NOT RUN; future OPORD 014.
- [x] Responsive widths, touch targets, keyboard/history/reload, zoom/reflow, focus, and desktop-secondary gates are documented.
- [x] Native applications and app-store delivery are not active campaign blockers.
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
