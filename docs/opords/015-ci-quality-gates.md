# OPORD 015 — CI Quality Gates

## Status
NOT RUN — local commands pass, but substantive lint, repository CI, seeded-failure proof, and required branch checks are not implemented.

## Situation and evidence
Root/app tests, TypeScript, harness, Expo export, loopback database lint, and integration scripts pass locally. `app/package.json` still runs only `echo 'lint placeholder'`, and no `.github/workflows/ci.yml` exists. Loopback migration checks do not substitute for CI observed-pass/failure evidence.

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
| Substantive reproducible lint | NOT IMPLEMENTED | Script remains `lint placeholder`. |
| CI install/test/type/lint/harness/secret/dependency/migration jobs | NOT IMPLEMENTED | No workflow exists. |
| Least permissions/pinned tools/deterministic caches/no secrets | NOT RUN | Requires workflow implementation/review. |
| Seeded violations fail stable required checks | NOT RUN | No CI or disposable-branch failure matrix. |
| No unauthorized release/remote/branch mutation | COMPLETE | Campaign remained local; this is a safety result, not CI completion. |

## Validation commands/evidence
### Always-local
```powershell
npm ci
npm test
Push-Location app; npm ci; npm run lint; npm test; npx tsc --noEmit; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
rg -n "service_role|SUPABASE_SERVICE|BEGIN (RSA|OPENSSH) PRIVATE KEY" .github scripts app/src tests
Get-ChildItem supabase/migrations -File | Sort-Object Name | ForEach-Object Name
```

Capture intentional-failure evidence on a disposable branch for lint, tests, secret scanning, and migration immutability; remove seeded violations before completion.

### Conditional-staging/mobile-web/human
Trigger the workflow on an approved draft PR and have an administrator enable required checks only after stable names pass. Mobile-web browser/human checks inherit OPORD 014 and are not rerun unless CI gains those jobs.

## Stop conditions/authorization limits
Stop before adding lint dependencies without approval, using secrets, editing runtime code outside focused lint corrections, mutating branch protection, opening/pushing a PR, or running remote migration/deploy commands.

## Risks/follow-ups
Supply-chain risk, noisy audit findings, platform-specific scripts, workflow permission excess, and false confidence from structural migration checks. Release work belongs to OPORD 016.

## Definition of done
Substantive lint and all CI gates have observed pass/fail evidence, workflow permissions are reviewed, required-check instructions and exceptions are documented, and the review log is updated.
