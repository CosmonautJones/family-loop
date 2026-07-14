# CI quality gates

## Current boundary

The workflow and all local equivalents are implemented. No branch was pushed, no pull request was opened, and no GitHub repository setting was changed. Therefore the workflow is locally reviewed but not yet observed on a GitHub-hosted runner, and required-check enforcement remains `NOT RUN`.

## Stable checks

Require these exact check names after their first successful authorized pull-request run:

- `Application quality`
- `Security and dependencies`
- `Migration integrity`

The workflow grants only `contents: read`, cancels stale same-ref runs, uses bounded timeouts, references no repository secrets, and does not deploy or mutate a remote database. Root tests deliberately have no `npm ci` step because the repository root has no lockfile or runtime dependencies. App installation and caching use `app/package-lock.json`.

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

## Dependency policy

`npm audit --package-lock-only --audit-level=high` blocks high and critical findings without requiring a second dependency installation. Any exception at those severities requires a tracked record naming the affected package/path, rationale, mitigating control, repository-maintainer owner, and an expiry date; an expired or ownerless exception fails release review. There are currently no high/critical exceptions.

The current Expo SDK 53 tree reports 11 moderate transitive advisories in build/configuration tooling. Registry remediation proposes the breaking Expo 57 line, so repository maintainer owns review by 2026-08-14 or the next approved Expo upgrade, whichever comes first. This is an explicit time-bounded tooling risk, not a claim that the tree is vulnerability-free.

## Administrator activation

1. Authorize a push and draft pull request without deployment credentials.
2. Observe all three exact checks pass on GitHub-hosted runners.
3. On a disposable follow-up branch, reproduce the lint, test, secret, and migration failures without using a real secret; close or delete the branch afterward.
4. In the repository ruleset or branch-protection settings for the protected default branch, require a pull request and the three exact checks above. Require branches to be current before merge if that matches the repository’s merge policy.
5. Record the workflow URLs, commit SHA, administrator, activation time, and any exception owner/expiry in the review log.

Stop if a check name differs, a job requests secrets or write permission, a migration job reaches a non-loopback database, a dependency exception lacks owner/expiry, or a workflow change introduces deployment behavior.
