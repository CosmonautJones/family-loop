# OPORD 016 — Web Release, Deployment, and Rollback

## Status
PARTIAL/CONDITIONAL — reproducible environment-neutral artifacts, external validated runtime configuration, digest-addressed promotion, host-neutral security/cache/hash-route policy, a Netlify publish-envelope builder/verifier, mobile-web candidate smoke, invalid-config fail-closed behavior, and artifact/config rollback are implemented. A unique-URL Netlify draft deploy now proves exact-artifact static transport, HTTPS, headers/cache/CSP, missing-asset 404, hash reload, and signed-out Chrome delivery. It is not published staging, configured backend/core-loop, rollback, production, or custom-domain evidence.

## Situation and evidence
The product is a responsive Expo/React Native Web app: mobile Safari and Chrome are primary and desktop browsers secondary. GitHub run `29383816628` passed application/security/migration/artifact jobs on exact source `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce`; its artifact digest is `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3`. The verified envelope was uploaded as draft deploy `6a56f0408614647fe35cf968` to dedicated site `loopedin-family` (`50ae6d6b-28ad-49c0-9654-c3a54899fcb5`) at `https://6a56f0408614647fe35cf968--loopedin-family.netlify.app`. The production alias, custom domain, and Git link are absent. Personal site `travisjohnjones` (`519f3aa3-c723-4b2a-b9dd-4761e7b0a8bf`) retained the same exact identity and was not changed.

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
| O016-T1 | 1 | Release engineer | Private / gpt-5.5 | environment inventory, web build/hosting configuration, secret references | Define isolated dev/staging/prod identifiers and secret custody; produce a versioned immutable web artifact from a green commit; configure TLS, CSP/security headers, cache rules, and SPA fallback. | Artifact identifies commit/version; the separately validated overlay identifies environment; deep links reload safely; secrets do not cross environments or appear in logs. |
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
| Distinct dev/staging/production identities/secrets | PARTIAL/CONDITIONAL | The draft uses dedicated Netlify site `loopedin-family`; production alias/custom domain/Git link are absent, and the existing personal site retains exact ID `519f3aa3-c723-4b2a-b9dd-4761e7b0a8bf`. Hosted Supabase environment separation, custodians, and production identity remain `NOT RUN`. |
| Same immutable artifact from green CI | DRAFT TRANSPORT PASS / PUBLISHED PROMOTION NOT RUN | Run `29383816628` produced exact source `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce` and artifact `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3`; draft deploy `6a56f0408614647fe35cf968` served that release identity at its unique URL. No production alias or rebuild was used. |
| TLS/headers/cache/SPA/backend compatibility | TRANSPORT PASS / BACKEND NOT RUN | The unique draft URL passed HTTPS, root and runtime delivery, runtime `no-store`, exact configured-origin CSP, immutable hashed asset, missing-asset 404, release/environment headers, and hash reload. Hosted Supabase migrations, authenticated API compatibility, and configured core-loop behavior remain `NOT RUN`. |
| Staging mobile/accessibility/core-loop gate | TRANSPORT-ONLY PARTIAL | Signed-out Chrome loaded the unique draft URL with clean console and network evidence. Local 320/390/430/1280, reduced-motion, focus, deep-link/Back/reload, and 200% checks remain valid, but the draft did not prove configured sign-in/family flows, physical devices, assistive technology, or moderated use. |
| Rollback without destructive DB reversal | LOCAL COMPLETE / CONDITIONAL | The local alias and overlay moved baseline/local → candidate/local → candidate/loopback → invalid/fail-closed → baseline/local. Release/environment headers and policy were restored; no database reversal occurred. Staging authority remains `NOT RUN`. |

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

Build and validate a provider-neutral static deployment envelope only from a downloaded/verified artifact and a separately reviewed public overlay:

```powershell
node scripts/build-netlify-deployment-envelope.mjs --artifact <artifact-path> --runtime-config <runtime-config-path> --output <new-envelope-path> --expected-artifact-sha256 <trusted-ci-output> --expected-source-commit <trusted-ci-output>
node scripts/verify-netlify-deployment-envelope.mjs --envelope <new-envelope-path> --expected-artifact-sha256 <trusted-ci-output> --expected-source-commit <trusted-ci-output>
```

These commands do not link or deploy a Netlify site. The expected digest and commit must come from the successful CI job/run, never from the downloaded manifest alone. Promotion must consume this verified envelope without rebuilding application bytes. Before any Netlify upload, verify a fresh approved LoopedIn site receives the envelope directly as its publish directory with no build or Function; the existing `travisjohnjones` personal site is a stop condition and must not be touched.

### Conditional-staging/mobile-web/human
With explicit authorization, deploy the immutable artifact to staging, verify TLS/headers/cache/fallback/backend compatibility, run real-phone iOS Safari and Android Chrome plus desktop smoke, rehearse rollback, then request separate production approval. Native builds, app stores, and EAS are out of scope.

## Stop conditions/authorization limits
Stop on red CI, dirty/unreviewed artifact, missing approval/owner, secret exposure, environment overlap, backend incompatibility, failed staging/browser smoke, broken deep-link reload, unavailable rollback, or destructive migration.

## Risks/follow-ups
CDN cache skew, schema/app version skew, secret leakage, irreversible data change, broken SPA fallback, and stale browser assets. Backup/data lifecycle is OPORD 017; hotfixes use the same gates with a documented exception.

## Definition of done
Environment separation, reproducible immutable web artifacts, secure hosting, staging promotion, manual production gate, release evidence, and successful staging artifact rollback are implemented; production changes only under separately recorded approval. The repository-local artifact and rollback slice is complete, but this full definition remains unmet until the named hosted gates pass.
