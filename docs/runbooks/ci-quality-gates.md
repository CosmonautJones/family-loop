# CI quality gates

## Current boundary

The workflow, local equivalents, and repeated clean GitHub-hosted pull-request runs are implemented and observed. Draft PR #1 run `29382987732` passed all four jobs on exact commit `9ef55479fb4089e6b610a9b06948399b5ca59362`; the downloaded release artifact independently matched that commit and its trusted internal digest. No GitHub repository setting, deployment, or hosted Supabase resource was changed, so required-check enforcement and hosted seeded-failure proofs remain `NOT RUN`.

## Stable checks

The first authorized pull-request run passed these exact check names; require them only after separate administrator approval:

- `Application quality`
- `Security and dependencies`
- `Migration integrity`

The workflow grants only `contents: read`, cancels stale same-ref runs, uses bounded timeouts, references no repository secrets, and does not deploy or mutate a remote database. Root tests deliberately have no `npm ci` step because the repository root has no lockfile or runtime dependencies. App installation and caching use `app/package-lock.json`.

All four jobs check out the exact pull-request head SHA (or push SHA). `Release artifact` waits for the application, security, and migration jobs to succeed, then runs `build-web-release.ps1` once, verifies the manifest's source commit, publishes only the commit/digest as job outputs, and uploads that directory for 14 days through immutable `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`. It has no secrets, provider CLI, migration command, deployment, or remote backend step. A later separately authorized deployment must download and verify these bytes against the trusted job outputs; it must not rebuild them.

## Pinned tool inventory

Official Git remotes were queried on 2026-07-14 before the workflow was accepted:

| Tool | Human-readable ref | Immutable workflow pin |
|---|---|---|
| `actions/checkout` | tag `v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5` |
| `actions/setup-node` | tag `v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `supabase/setup-cli` | branch `v1` | `ab058987d8d6c725971f6cf9d0b5c98467e30bd1` |

Node is pinned to major 22 so supported security patches remain available. Supabase CLI is separately pinned to exact version 2.109.0. ESLint is exact 9.39.5 and `eslint-config-expo` is exact 9.2.0. ESLint 9.25.1 was initially selected for Expo SDK 53 compatibility, then replaced before commit because the dependency audit identified a patched moderate advisory and 9.39.5 remains within the supported ESLint 9 line.

## Local clean gate

```powershell
npm test
Push-Location app
npm ci
npm run lint
npm test
npx tsc --noEmit
npm audit --package-lock-only --audit-level=high
Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
npm run check:secrets
npm run check:migrations
node scripts/check-migrations.mjs --base-ref HEAD
npx supabase db lint --local --level error
git diff --check
```

Do not run `supabase db reset` against the retained `family-loop` local stack. The workflow reset is safe only because each GitHub job starts with a fresh disposable stack. Use a separately named project and ports if a local clean-apply rehearsal is later required.

## Failure proof recorded on 2026-07-14

Each synthetic violation was added alone, the production-equivalent command was observed, and the seed was then removed. No credential or valid token was used.

| Gate | Synthetic violation | Observed result |
|---|---|---|
| Lint | Unused TypeScript constant under `app/src` | Exit 1, `@typescript-eslint/no-unused-vars`; zero-warning policy enforced |
| Test | One deliberately failing Node test | Exit 1 with one failed test |
| Secret scan | Harmless fake named-secret assignment | Exit 1; file and rule reported, value omitted |
| Migration immutability | Comment appended to an existing migration | Exit 1 for checksum mismatch and base-ref modification |
| Migration order | Earlier-timestamped new migration | Exit 1 for missing checksum and non-forward ordering |

The final clean secret and migration checks pass, and none of the seed filenames remains in the repository.

## GitHub-hosted clean proof recorded on 2026-07-14

Baseline run `29375486597` exposed two portability defects: the root scaffold test contained a Windows-only absolute path, and the disposable Supabase stack attempted to bind an occupied runner port. Commit `12f760d` derives the repository from `import.meta.url` and gives only the ephemeral CI checkout a unique project ID plus isolated `6542x` ports; checked-in local Supabase defaults are unchanged.

Replacement run `29376063946` completed successfully:

| Stable check | Job ID | Result | Direct evidence |
|---|---:|---|---|
| `Application quality` | `87229668121` | PASS, 4m19s | Install, zero-warning lint, root/app tests, TypeScript, and harness passed. |
| `Security and dependencies` | `87229668152` | PASS, 13s | Secret scan and high/critical dependency audit passed. |
| `Migration integrity` | `87229668163` | PASS, 4m14s | Order/checksum/history checks and disposable reset/apply/database lint passed. |

GitHub emitted a non-failing platform advisory: the pinned `actions/checkout@v4`, `actions/setup-node@v4`, and `supabase/setup-cli@v1` action runtimes target deprecated Node 20 and were force-run on Node 24. Application Node remains explicitly pinned to 22. Action-major upgrades require a separate reviewed maintenance change.

## Dependency policy

`npm audit --package-lock-only --audit-level=high` blocks high and critical findings without requiring a second dependency installation. Any exception at those severities requires a tracked record naming the affected package/path, rationale, mitigating control, repository-maintainer owner, and an expiry date; an expired or ownerless exception fails release review. There are currently no high/critical exceptions.

The current Expo SDK 53 tree reports 11 moderate transitive advisories in build/configuration tooling. Registry remediation proposes the breaking Expo 57 line, so repository maintainer owns review by 2026-08-14 or the next approved Expo upgrade, whichever comes first. This is an explicit time-bounded tooling risk, not a claim that the tree is vulnerability-free.

## Administrator activation

1. COMPLETE — authorized draft PR #1 contains no deployment credentials.
2. COMPLETE — all three exact checks passed in run `29376063946`.
3. On a separately authorized disposable follow-up branch, reproduce the lint, test, secret, and migration failures without using a real secret; close or delete the branch afterward.
4. In the repository ruleset or branch-protection settings for the protected default branch, require a pull request and the three exact checks above. Require branches to be current before merge if that matches the repository’s merge policy.
5. Record the administrator, activation time, and any exception owner/expiry in the review log when enforcement is enabled.

Stop if a check name differs, a job requests secrets or write permission, a migration job reaches a non-loopback database, a dependency exception lacks owner/expiry, or a workflow change introduces deployment behavior.
