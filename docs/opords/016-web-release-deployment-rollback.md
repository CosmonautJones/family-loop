# OPORD 016 — Web Release, Deployment, and Rollback

## Status
PARTIAL/CONDITIONAL — reproducible immutable local artifacts, digest-addressed promotion, host-neutral security/cache/SPA policy, mobile-web candidate smoke, and artifact rollback are implemented and rehearsed on loopback. Hosted environment separation, TLS, configured backend compatibility, staging/production promotion, and manual production approval remain `NOT RUN`.

## Situation and evidence
The product is a responsive Expo/React Native Web app: mobile Safari and Chrome are primary and desktop browsers secondary. OPORD 015 now supplies substantive local quality gates but hosted CI remains unobserved. Repository tooling now builds an exact Git archive twice into the same canonical manifest, promotes verified digest-addressed artifacts through an atomic local alias, serves executable CSP/security/cache/SPA policy, and rehearses rollback. It does not show a hosted workflow, remote Supabase deployment, TLS, or production approval. Expo public backend variables are currently compiled into the bundle, so promoting one identical artifact across isolated hosted backends still requires an approved runtime-configuration design.

## Mission/objective
Implement a controlled dev-to-staging-to-production web release path with reproducible immutable artifacts, environment separation, frontend/backend compatibility gates, TLS/security headers, observable verification, and rehearsed artifact rollback.

## Dependencies
Depends on: OPORD-015

CI must be green and required. Release owner, web host, environment inventory, DNS/TLS ownership, secret custody, maintenance window, rollback authority, and database compatibility decision must be named.

## Non-goals
Native builds, EAS, app stores, feature work, automatic production deployment, credentials in source, destructive/down migrations, or backup-policy implementation.

## Authorized territory (files/systems)
After explicit activation: web build/release workflows, hosting and environment configuration, CSP/security headers, cache policy, SPA fallback/deep-link rules, version metadata, non-secret scripts, staging frontend/backend, and release evidence. Production actions require a distinct manual approval.

## Forbidden territory
Secrets in repository/logs, shared credentials, direct production-from-laptop deploys, destructive migrations, unapproved production access, automatic production promotion, unrelated runtime changes, or rollback that destroys user data.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Every candidate passes the 320/390/430 CSS-pixel mobile-web matrix, 200% zoom/reflow, keyboard/focus and screen-reader basics, reduced motion, browser Back/history, deep links/reload, and core loop in iOS Safari/Android Chrome when available. Desktop remains a secondary regression target.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O016-T1 | 1 | Release engineer | Private / gpt-5.5 | environment inventory, web build/hosting configuration, secret references | Define isolated dev/staging/prod identifiers and secret custody; produce a versioned immutable web artifact from a green commit; configure TLS, CSP/security headers, cache rules, and SPA fallback. | Artifact identifies commit/version/environment; deep links reload safely; secrets do not cross environments or appear in logs. |
| O016-T2 | 2 | Deployment engineer | Private / gpt-5.5 | staging web app/backend, migration runner, release workflow | Promote the exact artifact to staging; apply reviewed forward-compatible migrations; verify frontend/backend compatibility and configured core-loop smoke. | Staging app/database versions match manifest; TLS/headers/cache/fallback checks and mobile-web smoke pass; failure halts production. |
| O016-T3 | 3 | Release owner | Sergeant / gpt-5.3-instant | production approval environment, hosting/deploy systems | Present evidence and require named manual production approval; promote the immutable artifact in the approved window. | No automatic production path exists; approval, artifact digest, versions, timestamps and operator are recorded. |
| O016-T4 | 4 | Incident/release reviewer | Sergeant / gpt-5.3-instant | rollback runbook, staging rehearsal, release log | Rehearse immutable frontend artifact rollback and forward database recovery in staging; verify cache invalidation and define trigger/authority. | Rehearsal meets recovery target without destructive down migration or stale mixed assets; rollback is executable by named authority. |

## Acceptance criteria
- Dev, staging, and production use distinct identifiers and secret scopes.
- The same immutable web artifact is promoted and tied to a green CI commit.
- TLS, CSP/security headers, cache policy, SPA fallback/deep-link reload, and backend compatibility are verified.
- Staging passes 320/390/430 CSS px, conditional Safari/Chrome, desktop secondary, accessibility, and configured core-loop gates before manual production approval.
- Rollback restores a compatible artifact without destructive database reversal or stale asset mixing.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Distinct dev/staging/production identities/secrets | PARTIAL/CONDITIONAL | The manifest requires an environment identifier and the runbook defines distinct scopes/custody. No hosted environments are named; compiled Expo backend variables block identical cross-backend artifact promotion. |
| Same immutable artifact from green CI | LOCAL COMPLETE / CONDITIONAL | Two clean exact-commit exports produced identical canonical manifests/digests; local promotion verifies every file before storing by digest. GitHub-hosted CI and staging promotion remain `NOT RUN`. |
| TLS/headers/cache/SPA/backend compatibility | PARTIAL/CONDITIONAL | Loopback CSP/security headers, immutable hashed assets, revalidated entrypoints, extensionless SPA fallback, exact-event reload, and cache-path consistency pass. TLS, hosted policy, and configured-backend compatibility remain `NOT RUN`. |
| Staging mobile/accessibility/core-loop gate | PARTIAL/CONDITIONAL | The promoted local candidate passes 320/390/430/1280, reduced motion, navigation, focus, deep-link/Back/reload, and 200% scale-proxy checks. This is not staging, physical-device, screen-reader, or moderated-human evidence. |
| Rollback without destructive DB reversal | LOCAL COMPLETE / CONDITIONAL | The local alias moved baseline → candidate → baseline, with release header, fallback, cache, and CSP checks after rollback. No database reversal occurred. Staging rehearsal and named rollback authority remain `NOT RUN`. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm run lint; npm test; npx tsc --noEmit; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git rev-parse HEAD
git status --short
```

Build twice from the same green commit where tooling permits and compare manifests; inspect environment references without printing secrets; verify SPA fallback and cache/header configuration.

Repository-local commands and the exact evidence procedure are in `docs/runbooks/web-release-and-rollback.md`.

### Conditional-staging/mobile-web/human
With explicit authorization, deploy the immutable artifact to staging, verify TLS/headers/cache/fallback/backend compatibility, run real-phone iOS Safari and Android Chrome plus desktop smoke, rehearse rollback, then request separate production approval. Native builds, app stores, and EAS are out of scope.

## Stop conditions/authorization limits
Stop on red CI, dirty/unreviewed artifact, missing approval/owner, secret exposure, environment overlap, backend incompatibility, failed staging/browser smoke, broken deep-link reload, unavailable rollback, or destructive migration.

## Risks/follow-ups
CDN cache skew, schema/app version skew, secret leakage, irreversible data change, broken SPA fallback, and stale browser assets. Backup/data lifecycle is OPORD 017; hotfixes use the same gates with a documented exception.

## Definition of done
Environment separation, reproducible immutable web artifacts, secure hosting, staging promotion, manual production gate, release evidence, and successful staging artifact rollback are implemented; production changes only under separately recorded approval. The repository-local artifact and rollback slice is complete, but this full definition remains unmet until the named hosted gates pass.
