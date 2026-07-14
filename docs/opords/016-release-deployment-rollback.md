# OPORD 016 — Release, Deployment, and Rollback

## Status
Planned implementation mission. Credentials, environment creation, builds, deploys, store submissions, production promotion, and rollback are RED until separately activated and approved.

## Situation and evidence
The product targets iOS and Android while web is secondary (`docs/vision.md`). Repository evidence does not show a release workflow or verified remote Supabase deployment (inference; `docs/architecture.md:41`). OPORD 015 supplies required CI gates before promotion.

## Mission/objective
Implement a controlled dev-to-staging-to-production release path with reproducible mobile builds, environment separation, migration/app compatibility gates, manual production approval, observable verification, and a rehearsed rollback procedure.

## Dependencies
Depends on: OPORD-015

CI must be green and required. Release owner, environment inventory, signing custody, maintenance window, rollback authority, and migration compatibility decision must be named before execution.

## Non-goals
Feature work, automatic production deployment, credential generation in source, destructive/down migrations, backup policy implementation, or bypassing app-store review.

## Authorized territory (files/systems)
After explicit activation: release workflows, Expo/EAS and environment-specific deployment configuration, version metadata, non-secret scripts, staging environment, approved build/store systems, release docs/evidence. Production actions require a distinct manual approval gate.

## Forbidden territory
Secrets in repository/logs, shared credentials across environments, direct production-from-laptop deploys, destructive migrations, unapproved production access, automatic prod promotion, unrelated runtime changes, or rollback that destroys user data.

## Older-adult usability guardrail
Every candidate must pass large-text, accessibility, sign-in privacy, and core event-loop smoke before production; rollback communication must use plain language and never strand users behind an unexplained state.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O016-T1 | 1 | Release engineer | Private / gpt-5.5 | environment inventory, release/build configuration, secret references | Define isolated dev/staging/prod identifiers and secret custody; make versioned reproducible iOS/Android builds from a green commit. | Builds identify commit/version/environment; no value or credential crosses environments or appears in logs. |
| O016-T2 | 2 | Deployment engineer | Private / gpt-5.5 | staging app/backend, migration runner, release workflow | Promote the exact artifact to staging; apply only reviewed forward-compatible migrations; run health and configured core-loop smoke. | Staging migration/app versions match manifest; smoke passes; failed migration halts before production. |
| O016-T3 | 3 | Release owner | Sergeant / gpt-5.3-instant | production approval environment, store/deploy systems | Present evidence and require named manual production approval; promote the immutable artifact in the approved window. | No automatic production path exists; approval, artifact digest, versions, timestamps and operator are recorded. |
| O016-T4 | 4 | Incident/release reviewer | Sergeant / gpt-5.3-instant | rollback runbook, staging rehearsal, release log | Rehearse app rollback and forward database recovery in staging; verify post-release and define trigger/authority. | Rehearsal meets recovery target without destructive down migration; production rollback is executable by named authority. |

## Acceptance criteria
- Dev, staging and production use distinct identifiers and secret scopes.
- The same versioned artifact is promoted; build provenance ties to a green CI commit.
- Staging proves migration compatibility and configured core loop before manual production approval.
- Production has no automatic promotion; release evidence records approver/operator/artifact/environment/time.
- Rollback rehearsal restores compatible app service without destructive database reversal.

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

Review configuration for environment identifiers and secret references without printing secret values. Record the immutable commit/version manifest.

### Conditional-staging/native/human
With explicit authorization, build iOS/Android artifacts, deploy the exact artifact to staging, run native/accessibility/core-loop smoke, rehearse rollback, then request a separate manual production approval. Store submission, production deployment, and rollback are NOT RUN until approved.

## Stop conditions/authorization limits
Stop on red CI, dirty/unreviewed artifact, missing approval/owner, secret exposure, environment overlap, migration incompatibility, failed staging/native smoke, unavailable rollback, or any destructive migration. Never infer production authority from staging approval.

## Risks/follow-ups
App-store propagation, schema/app version skew, secret leakage, irreversible data change, and stale clients. Backup/data lifecycle is OPORD 017; emergency hotfixes need the same gates with an explicitly documented exception.

## Definition of done
Environment separation, reproducible builds, staging promotion, manual production gate, release evidence, and a successful staging rollback rehearsal are implemented; production is changed only under separately recorded approval.
