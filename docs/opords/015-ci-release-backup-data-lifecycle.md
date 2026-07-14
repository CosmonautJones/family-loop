# OPORD 015 — CI, release, backup, and data lifecycle

## Status
Planning/gate-definition only. Deployment configuration, credentials, remote changes, backups, and releases are RED pending separate approval.

## Situation and evidence
The repository exposes local tests and harness commands (`docs/architecture.md:51-53`) but app lint is a placeholder (`app/package.json:11`). No CI workflow appears in the repository (inference from `rg --files`). Remote Supabase is unverified and Docker unavailable (`docs/architecture.md:41`). No backup/restore drill or data-retention policy is evidenced.

## Mission/objective
Define independently executable, approval-gated paths for CI quality checks, mobile release readiness, backup/restore proof, and private data lifecycle without performing remote deployment or destructive operations.

## Dependencies
Accepted product missions; repository owner decisions for CI provider, signing/release channels, recovery objectives, retention/deletion semantics, legal/privacy review, and safe disposable environments.

## Non-goals
Actual production deploy, app-store submission, credential creation/rotation, destructive migration, production restore, vendor selection, or continuous delivery.

## Authorized territory (files/systems)
Documentation, check manifests, non-secret local scripts/tests, and existing eval records only under this planning OPORD. Any workflow, deployment config, backup system, or remote environment requires a new explicit manifest.

## Forbidden territory
`.github/workflows` or other CI config changes, Expo/Supabase deployment configuration, secrets/signing keys, remote migrations, production data, backup creation/deletion/restore, store submission, push/PR, new dependencies, and destructive Git.

## Older-adult usability guardrail
Release gates must protect readable large text, 48x48-point actions, screen-reader and reduced-motion behavior, sign-in privacy, exact-event identity, low cognitive load, and recovery of family memories; lifecycle decisions must explain deletion and recovery in plain language.

## Execution
1. Define a CI check contract from existing commands and explicitly identify placeholder lint as a gap.
2. Draft release gates for versioning, native smoke, accessibility, signed-out privacy, rollback decision, and known-issue approval.
3. Inventory data classes and ownership; propose retention, export, deletion, tombstone, object cleanup, and legal-review questions.
4. Define backup scope, encryption/access expectations, RPO/RTO candidates, and a disposable restore-drill procedure.
5. Split implementation into separately approved missions: CI config; release pipeline; backup/restore; lifecycle/delete/export.
6. Perform no remote or credential-bearing step in this OPORD.

## Acceptance criteria
- CI plan runs root/app tests, TypeScript, harness, diff checks, and labels lint non-substantive until replaced.
- Release checklist blocks on native/accessibility/privacy evidence and names rollback authority.
- Data inventory maps database rows, auth/session data, and private objects to retention/deletion owners.
- Backup plan defines candidate RPO/RTO and a restore drill without claiming it ran.
- Every remote/destructive/credential action is isolated behind a separate approval.

## Validation commands/evidence
### Always-local
Validate the plan against `package.json`, `app/package.json`, `scripts/check-harness.ps1`, migration inventory, and regression checklist; run existing local commands only if this planning mission requests proof.

### Conditional-staging/native/human
CI execution, signed builds, store release, backup, restore, lifecycle deletion, and native/human tests: NOT RUN.

## Stop conditions/authorization limits
Stop before creating workflows, changing deployment files, accessing credentials, deploying, signing, publishing, backing up/restoring remote data, deleting data, or changing migrations. Escalate retention/export/deletion choices for product/legal approval.

## Risks/follow-ups
False green from placeholder lint, untested rollback, backups without restore proof, orphaned private objects, conflicting deletion/retention duties, and inaccessible recovery communication. Each implementation stream needs its own OPORD.

## Definition of done
Four approval-ready plans exist with owners, gates, evidence requirements, stop conditions, and NOT RUN status; no remote, credential, deployment, or destructive action occurred.
