# OPORD 015 — CI Quality Gates

## Status
HOSTED CLEAN COMPLETE / ENFORCEMENT CONDITIONAL — PR #4 passed exact-head checks and independent GREEN review; default-branch run `29466733884` is GREEN after merge `2a4b259…`. Hosted seeded-failure proofs and administrator-required private-repository checks remain `NOT RUN`.

## Situation and evidence
Root/app tests, TypeScript, substantive Expo/TypeScript lint, harness, Expo export, loopback database lint, integration scripts, repository secret scanning, dependency policy, and deterministic migration checks pass locally. PR #1 run `29451842237` proves all four jobs on `3cf45367…`, including disposable migration reset/apply/lint and exact artifact retention. Branch enforcement is not configured or inferred from that run.

## Mission/objective
Implement a required pull-request CI workflow with substantive lint, root/app tests, TypeScript, harness, secret/dependency checks, and deterministic migration validation before code can merge.

## Dependencies
Depends on: OPORD-013, OPORD-014

OPORD 013 defines security handling; OPORD 014 defines the quality matrix. Repository administrator approval is required to enable protected required checks.

## Non-goals
Application deployment, signed builds, production credentials, remote migrations, dependency auto-upgrades, or release promotion.

## Authorized territory (files/systems)
`package.json`, `app/package.json`, lockfiles, narrowly selected lint configuration, `.github/workflows/ci.yml`, non-secret validation scripts, tests, and CI/review documentation. A lint dependency is authorized only in the separately activated implementation mission after explicit dependency approval.

## Forbidden territory
Application runtime/features, secrets, remote Supabase, deploy/store configuration, branch-protection mutation without administrator approval, destructive migrations, broad formatting churn, and dependency updates unrelated to substantive lint.

## Older-adult usability guardrail
CI must preserve the accessibility and large-text regressions defined by OPORD 014; quality gates may not be weakened to ship a release that breaks core older-adult flows.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O015-T1 | 1 | Tooling builder | Private / gpt-5.5 | app lint config/script, package manifests/lockfiles | Replace placeholder lint with a pinned substantive TypeScript/React lint command; limit initial fixes to mission-owned violations. | `npm run lint` analyzes source and fails on an injected known violation; lockfile is deterministic; dependency approval is recorded. |
| O015-T2 | 2 | CI builder | Private / gpt-5.5 | `.github/workflows/ci.yml`, validation scripts | Add pinned-runtime PR/push jobs for install, lint, root/app tests, TypeScript, harness, secret scan, dependency audit and migration checks; use least permissions and concurrency cancellation. | A clean PR passes; seeded test/lint/secret/migration failures each fail the intended job; no secret is required. |
| O015-T3 | 3 | Security/data reviewer | Sergeant / gpt-5.3-instant | migration validator, CI evidence, branch-gate docs | Validate SQL parse/order/immutability locally; classify audit results; document required checks and administrator enablement. | Existing applied migrations cannot be silently edited; new migrations are ordered; high-severity exceptions need recorded owner/expiry. |
| O015-T4 | 4 | QA/reviewer | Sergeant / gpt-5.3-instant | CI run evidence, regression/review log | Run clean and intentional-failure matrices, review workflow permissions/cache keys, and update evidence. | Every gate has one observed pass and failure; required-check names are stable and copyable into protection settings. |

## Acceptance criteria
- Placeholder lint is replaced by a substantive, reproducible command.
- CI performs clean install, root/app tests, TypeScript, lint, harness, secret/dependency checks, and migration validation.
- Jobs use least permissions, pinned runtime/tool versions, deterministic lockfiles, cache keys from lockfiles, and no repository secrets.
- Seeded violations prove each critical gate fails; administrators can require the stable checks.
- No release, deploy, remote migration, or branch-protection mutation occurs without separate authorization.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Substantive reproducible lint | COMPLETE LOCALLY | Exact `eslint@9.39.5` and `eslint-config-expo@9.2.0`; flat config; zero-warning command; clean pass plus seeded unused-value exit 1. User explicitly approved the dependencies. |
| CI install/test/type/lint/harness/secret/dependency/migration jobs | HOSTED PASS | PR #1 run `29451842237` passed application, security/dependency, migration integrity, and release artifact jobs on exact commit `3cf45367…`. |
| Least permissions/pinned tools/deterministic caches/no secrets | COMPLETE BY STATIC/LOCAL REVIEW | `contents: read`, concurrency cancellation, Node 22, exact Supabase CLI 2.109.0, immutable action SHAs, app-lock cache key, no secret references, and bounded timeouts. |
| Seeded violations fail stable required checks | COMPLETE LOCALLY / HOSTED NOT RUN | Lint, test, synthetic secret assignment, historical migration edit, and out-of-order migration each exited 1; every seed was removed and clean reruns passed. No disposable hosted failure branch was created. |
| No unauthorized release/remote/branch mutation | COMPLETE | Subsequent hosted Supabase/Netlify work was explicitly authorized, exact-target bounded, and recorded; branch protection and unrelated provider resources remain unchanged. |
| Exact-head release artifact is built once and retained for promotion | HOSTED PASS | Run `29451842237` built artifact `loopedin-web-3cf45367dc858e5c58bf8b72ae28e263b310c6b4`; downloaded source and internal digest `7a18b2f52097697de2b25edd6b49a6454626a1375502637504539e9919fc3c8c` reverified before immutable staging upload. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm ci; npm run lint; npm test; npx tsc --noEmit; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
npm run check:secrets
npm run check:migrations
node scripts/check-migrations.mjs --base-ref HEAD
Push-Location app; npm audit --package-lock-only --audit-level=high; Pop-Location
npx supabase db lint --local --level error
git diff --check
```

The current populated loopback browser scenario must not be reset for this mission. CI performs reset/apply/lint only inside its fresh disposable runner. Local intentional-failure evidence and removal details are recorded in `docs/runbooks/ci-quality-gates.md`.

### Conditional-staging/mobile-web/human
The approved draft PR clean run is complete. A repository administrator may enable the three stable required checks only after separately authorizing any hosted seeded-failure proof and reviewing the recorded run. Mobile-web browser/human checks inherit OPORD 014 and are not rerun unless CI gains those jobs.

## Stop conditions/authorization limits
Stop before adding lint dependencies without approval, using secrets, editing runtime code outside focused lint corrections, mutating branch protection, opening/pushing a PR without explicit authorization, or running remote migration/deploy commands.

## Risks/follow-ups
Supply-chain risk, noisy audit findings, platform-specific scripts, workflow permission excess, and false confidence from structural migration checks. Release work belongs to OPORD 016.

## Definition of done
Local implementation and one authorized GitHub-hosted clean pass are complete. Full OPORD completion additionally requires hosted seeded disposable-PR failures and administrator enforcement of the three stable required checks.

## Superseding hosted proof — 2026-07-16

PR #4 was exact-head GREEN and received independent GREEN review before merge. Merge commit `2a4b259…` then passed default-branch CI run `29466733884`. The deployed application artifact remains tied to its immutable source `08006e5e83a8dd85cfeb30f6fb26f8df103fa619` and digest `e41dd1727d11888e0259a97c442f13e815243472dfcd437334c00c53b9ee0d38`; the merge-run result is recorded separately and does not relabel rebuilt bytes as the staging artifact. Private-repository required-check enforcement and disposable hosted seeded-failure PRs remain unproven.
