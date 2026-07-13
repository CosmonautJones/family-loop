# Current Mission

Mission ID: `FAMILY-LOOP-DATA-001`

## Mission

Add the minimum session gate needed for trustworthy service-backed work: restore an existing configured Supabase session, present a small email/password sign-in surface when configured and signed out, keep configured authentication failures visible, and preserve deterministic unconfigured prototype operation. This mission establishes session state only; it does not migrate product data screens.

## Objective

Give the app one explicit, testable session boundary with four states—restoring, signed out, authenticated, and error—so M2 can access configured data only after authentication without ever falling back silently to fixtures.

## Non-goals

- Onboarding, sign-up, OAuth, magic links, password recovery, profiles, invitations, or no-group setup.
- Persisting events, RSVPs, messages, media, reminders, notifications, or memories.
- Migrating Home, Calendar, Create, Event Detail, Groups, or Memories to query-backed data.
- Navigation-library migration, settings, billing, teams, notification delivery, deployment, or schema changes.
- New dependencies, broad visual redesign, remote administration, or credential creation/mutation.

## Authorized manifest

Only these files and file families may be created or edited:

- `app/src/services/api.ts`
- `app/src/services/supabaseClient.ts`
- `app/src/services/supabaseAdapter.ts`
- `app/src/services/mockAdapter.ts`
- `app/src/services/mockData.ts`
- `app/src/services/index.ts`
- `app/src/app/queries.ts`
- `app/src/app/AppProviders.tsx`
- `app/src/navigation/AppShell.tsx`
- `app/src/navigation/useAppShellState.ts`
- `app/src/store/useLoopedInStore.ts`
- `app/src/features/auth/**` (new files permitted)
- `app/src/screens/AuthScreen.tsx` (new if chosen)
- `app/src/types/domain.ts`
- `tests/app-scaffold.test.js`
- `tasks/current-mission.md`
- `tasks/backlog.md`
- `tasks/completed.md`
- `docs/architecture.md`
- `evals/review-log.md`
- `evals/code-rubric.md`
- `evals/ux-rubric.md`
- `evals/regression-checklist.md`

Allowed systems are local repository read/write operations and the local checks listed below only.

## Ordered execution

### Wave 1 — Session foundation

Ownership: service/session owner has exclusive runtime ownership of `app/src/services/**`, `app/src/app/**`, `app/src/store/useLoopedInStore.ts`, `app/src/types/domain.ts`, and any new `app/src/features/auth/**` files. Mission-record ownership remains with `tasks/current-mission.md`.

1. Define the smallest session API/state needed to distinguish restoring, signed out, authenticated, and error states without exposing tokens in UI or logs.
2. Restore the existing Supabase session through the configured adapter/client and subscribe only if required to keep logout/login state accurate.
3. Make adapter mode explicit enough that the shell can apply the configured and unconfigured contracts below.
4. Preserve the deterministic mock adapter as the unconfigured/test path; do not make missing configuration an error and do not introduce a second server-state owner.
5. Add focused structural/behavior checks within `tests/app-scaffold.test.js` for the session boundary and fallback rules.

Wave 1 success criterion: session behavior can be exercised independently of product-data migration, configured failures cannot reach fixture UI as a fallback, and unconfigured local use remains deterministic.

### Wave 2 — Minimal session UI and closeout

Ownership: UI owner has exclusive runtime ownership of `app/src/navigation/**`, `app/src/screens/AuthScreen.tsx`, and UI files under `app/src/features/auth/**`. Test/review owner has exclusive ownership of the allowed test, task, documentation, and evaluation records other than this Wave 1 mission record.

1. Gate `AppShell` on the session boundary.
2. Render a calm phone-first restoring state while configured session restoration is pending.
3. Render a minimal email/password sign-in surface when configured and signed out; include pending/disabled behavior and a useful inline error. No sign-up or recovery affordance.
4. Render the existing product shell only after configured authentication succeeds, and provide only the minimum logout path required to prove the gate.
5. Keep unconfigured operation frictionless and clearly deterministic: it opens the existing mock-backed prototype without showing or requiring credentials.
6. Run the complete verification matrix, update the allowed architecture/task/evaluation records, list residual risks, and move the finished mission summary to `tasks/completed.md` only after acceptance is proven.

Wave 2 success criterion: the mock and configured-unauthenticated phone paths are visibly distinct and correct, the authenticated shell is unreachable while a configured session is absent or failing, and all required checks pass.

## Required behavior

### Unconfigured

- When both supported Supabase configuration values are not present, select the deterministic mock service.
- Open the existing fixture-backed prototype without a credential prompt.
- Do not imply that mock login, persistence, RLS, or a live backend has been verified.
- Keep this path usable by local development and tests.

### Configured

- When the Supabase URL and publishable/anonymous key are configured, select only the Supabase service.
- Restore an existing persisted session before rendering protected product UI.
- While restoration is pending, render a loading/restoring state rather than fixtures.
- With no valid session, render the minimal sign-in surface.
- On login or restoration failure, render an actionable error and remain outside the product shell; never fall back to the mock adapter or fixture shell.
- On successful authentication, render the existing shell without migrating its fixture-backed feature data in M1.
- On logout, clear the authenticated UI and return to the configured signed-out state.

## Acceptance criteria

- [ ] The implementation changes only files in the authorized manifest and adds no dependency, migration, deployment, or environment file.
- [ ] Unconfigured startup opens the deterministic mock-backed prototype without requesting credentials.
- [ ] Configured startup blocks the product shell until session restoration resolves.
- [ ] Configured signed-out startup presents only the minimum email/password sign-in flow.
- [ ] Configured login pending, login error, restore error, authenticated, and logout transitions are explicit and testable.
- [ ] A configured auth failure remains visible and does not select or render the mock fallback.
- [ ] Session/server state has one owner consistent with ADR 001; Zustand remains limited to transient UI state.
- [ ] No secret, access token, password, or environment value is read, printed, recorded, or committed.
- [ ] Existing Home-to-Event Detail and other fixture-backed product behavior remains intact after the session gate.
- [ ] Focused tests cover adapter selection and the configured/unconfigured session-gate invariants at the strongest practical local boundary.
- [ ] Mock phone smoke confirms the prototype opens and the core shell remains usable.
- [ ] Configured-unauthenticated phone smoke confirms the sign-in boundary appears without credential mutation and protected UI does not.
- [ ] Conditional live-auth verification follows the rule below and is recorded accurately.
- [ ] Required checks pass, architecture and evaluation records reflect actual behavior, the review log is updated, and residual risks/follow-ups are listed.

## Verification commands

Run from the repository root unless a directory change is included:

```powershell
npm test
cd app
npm test
npx tsc --noEmit
npm run lint
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
git diff --check
```

Phone web smoke is required at a phone viewport for both modes:

1. Mock/unconfigured: start the app with Supabase configuration absent, verify the prototype shell opens without credential input, and exercise the existing Home-to-Event Detail route.
2. Configured/unauthenticated: use non-secret placeholder configuration sufficient to exercise the configured boundary without attempting credential mutation; verify the restoring/signed-out boundary prevents protected shell rendering and that failure remains visible rather than falling back to mock data.

Record the exact local smoke method and result in `evals/review-log.md`.

## Conditional live-auth rule

Live sign-in, session restore, and logout may be tested only when safe existing credentials are already available to the running environment without reading, revealing, copying, or reporting their values and without creating, resetting, or otherwise mutating credentials. If that condition is not already satisfied, record exactly:

`NOT RUN — ENV unavailable`

This conditional result does not fail M1 when all non-live acceptance evidence passes. It forbids inspecting environment files, secret stores, shell values, dashboards, logs, or remote configuration to discover credentials.

## Stop conditions and authorization limits

Stop immediately and return RED to the Sergeant on any of the following:

- Any need to read, print, transmit, create, reset, or mutate a secret, credential, token, or environment value.
- Any remote mutation, deployment operation, database migration, RLS/storage-policy change, schema change, or incompatible service/API change.
- Any new dependency or edit outside the authorized manifest.
- Any requirement to implement M2-M6 behavior, onboarding, sign-up, recovery, profiles, invitations, settings, billing, teams, or notifications.
- Any destructive or irreversible operation.
- Any required check failure that cannot be corrected surgically inside the authorized manifest.
- Any evidence that the configured path can silently render mock/fixture content as an authentication fallback.

The Sergeant owns commits, integration, wave transitions, and final acceptance. Subordinate owners must not run Git mutations or broaden their territory.

## Limits

- Two ordered waves only; Wave 2 begins after the Sergeant accepts Wave 1.
- Keep the Auth surface to email, password, submit/pending/error behavior, and the minimum logout proof.
- Reuse installed Supabase, TanStack Query, Zustand, and React Native capabilities; add no package.
- Do not claim remote backend, schema, RLS, or storage readiness from local session-gate evidence.
- M1 establishes the gate but leaves feature screens fixture-backed by design; M2 owns data migration.

## Risks and follow-ups

- Docker/local Supabase and remote deployment remain unverified, so live session behavior may remain conditionally untested.
- The current auth contract centers on refresh rather than an explicit non-mutating session read; implementation must preserve API compatibility or stop for a Sergeant decision.
- Mock mode intentionally bypasses credential UI, so tests must prove it cannot be selected after configured auth errors.
- The product shell remains fixture-backed after M1; users authenticated against a configured service will not see persisted event data until M2.
- Sign-up, recovery, invitations, and no-group onboarding remain separately authorized follow-ups.

## Definition of done

- [ ] Both waves are accepted in order by the Sergeant.
- [ ] Every acceptance criterion has direct evidence or the permitted conditional live-auth result.
- [ ] All required commands and both phone smoke paths are recorded with results.
- [ ] Review log, architecture, task history, code rubric, UX rubric, and regression checklist are current and truthful.
- [ ] Risks and follow-ups are recorded without absorbing later missions.
- [ ] Sergeant commits the scoped, reviewable mission result.
