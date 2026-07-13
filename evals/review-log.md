# Review Log

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
