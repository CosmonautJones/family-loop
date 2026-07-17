# Phase C — OPORD

## Situation

Current documentation contains stale claims that first scheduled cadence, hosted encrypted export, and hosted grace-state behavior remain unobserved. Five files already contain scoped documentation-only edits; three more require synchronized corrections.

## Mission

Reconcile operational documentation to authoritative hosted evidence without changing runtime code, configuration, providers, or production state.

## Execution

1. Preserve and inspect the five existing deltas; do not rewrite unrelated text.
2. Update OPORD 013 with scheduled telemetry run `29520494334`, retaining production ownership/routing as open.
3. Update OPORD 017 with scheduled backup `29480318427`, all-nine restore `29517385245`, fresh rotated-secret restore `29527751546`, hosted export, and hosted grace-state proof. Keep permanent purge, external journal, production restore/PITR, retention/orphan apply, and cutover open.
4. Append review-log evidence with exact scope limits and explicit no-mutation statement.
5. Reconcile all eight files so status and automated/manual/unproven classifications agree.

## Territory

One Documentation Sergeant owns exactly: `tasks/current-mission.md`; `docs/opords/README.md`; `docs/opords/013-security-observability-incident-response.md`; `docs/opords/017-backup-restore-data-lifecycle.md`; `docs/runbooks/hosted-operations-backup-monitoring.md`; `docs/runbooks/hosted-release-completion.md`; `evals/regression-checklist.md`; `evals/review-log.md`.

## Authority

Repository documentation and read-only evidence are GREEN. Provider/production mutation, secrets, recipients, Gmail, quarantined resources, DNS, billing, and physical-device claims are RED and out of scope.

## Verification

Run `git diff --check`, `npm run check:secrets`, targeted stale/evidence searches, exact eight-file diff review, and scoped status review. Stop on unexpected non-documentation deltas, secret-like output, or evidence contradiction. Fresh G3 review receives only acceptance criteria, diff, and required evidence.

## Rollback

This wave changes documentation only. Before merge, abandon the branch/PR if gates fail; after merge, revert the documentation commit without changing any provider or database state.

## Budget

One execution wave and at most one bounded correction wave. Runtime does not report model identity, tokens, or cost; no such values will be claimed.
