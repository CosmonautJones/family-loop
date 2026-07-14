# Current Mission

Mission ID: `FAMILY-LOOP-FULL-001`

Status: `IN PROGRESS — WAVE 0 RUN 1 FIX COMPLETE — EXTERNAL RE-REVIEW PENDING`

Decision charter: **Correctness > Safety > Scope discipline > Speed.**

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
- Internal Run 1 fix gate: **AMBER / PROCEED-WARN, ZERO BLOCKERS**. Wave 0 is ready for external re-review; external GREEN and final Wave 0 completion are not claimed.
- Fix acceptance requires: a revisioned persistence envelope; same-runtime, per-key serialization; a latest-state re-read followed by replay or a visible conflict so acknowledged data is preserved; rollback across stringify, storage-write, and validation failures; and multi-instance regression tests.
- Coordination must be described honestly: use `navigator.locks` when available with an explicit module-level fallback, and document that the fallback cannot guarantee cross-tab serialization on Safari where Web Locks is unavailable. Cross-tab durability beyond the exercised mechanism must not be inferred.
- Campaign status remains **IN PROGRESS**. Wave 0 reopening does not change the prohibition on claiming remote persistence, multi-user server behavior, RLS, private media, later UX waves, or the full application.

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

Current truth: **The Wave 0 Run 1 fix is complete with an internal AMBER / PROCEED-WARN, zero-blocker gate; external re-review is pending. The broader campaign remains in progress. No external GREEN, later wave, or remote/live capability is claimed complete.**
