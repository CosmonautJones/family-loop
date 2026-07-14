# FAMILY-LOOP-OPORD-005 — Service boundary and environment readiness

## Status

PLANNED READ-ONLY AUDIT — no remote mutation, credentials, or deployment authorized.

## Situation and evidence

- `app/src/services/api.ts` defines auth, groups, events, RSVPs, activity, messages, media, and notification contracts, and adapter selection depends on Expo Supabase variables (`docs/architecture.md:50-56`).
- Unconfigured mode is deterministic/process-local; configured failures must remain visible (`docs/architecture.md:24-29,50-56`).
- Remote Supabase deployment is unverified, Docker is unavailable, and live event/RSVP CRUD is `NOT RUN — ENV unavailable` (`docs/architecture.md:57-61`).
- M1-M3 local foundations and checks exist, but code availability is not proof of remote tables, policies, buckets, or auth settings (`evals/review-log.md:3-13,35-48`).

## Mission/objective

Produce a truthful, reproducible readiness matrix for every service capability required by the next approved mission, separating repository contract, local mock proof, configured-client behavior, and live-environment proof.

## Dependencies

- Named next mission/capability so the audit stays narrow.
- Existing repository tests and environment-variable documentation.
- Optional safe non-production environment supplied by the owner; absence is an acceptable documented result.

## Non-goals

- Deploying Supabase, discovering credentials, creating projects, editing environment files, fixing runtime behavior, adding dependencies, or mutating remote data.
- Claiming production readiness or auditing unused future capabilities.

## Authorized territory (files/systems)

- Read-only repository inspection of service adapters, migrations/config docs, package scripts, tests, and architecture/evals.
- Local non-secret commands and mock-mode tests.
- If explicitly supplied, non-mutating metadata/connectivity checks against an approved safe environment.
- Documentation output and review log only.

## Forbidden territory

- Secrets/credential stores, `.env` creation or printing, remote writes, migrations, policy/bucket/auth setting changes, deployment, destructive commands, dependencies, and runtime edits.

## Older-adult usability guardrail

Readiness must include the failure experience: configured outages or missing data must produce plain, recoverable UI and never silently show fixtures that could mislead a user about family plans.

## Execution

1. Enumerate only the service methods used by the target mission and their callers/query keys.
2. For each capability, record: contract present, mock implementation/tested, Supabase adapter present, repository infrastructure present, configured failure truthful, live proof status.
3. Run local checks without loading or printing secrets.
4. Compare migration/table/policy/bucket names statically; mark this as repository intent, not deployment proof.
5. If a safe environment is explicitly provided, request separate authorization for exact non-mutating checks; otherwise mark live rows `NOT RUN`.
6. Publish blockers and the smallest follow-up authorization needed.

## Acceptance criteria

- Every target capability has an evidence path and one of PASS/FAIL/NOT RUN/NOT APPLICABLE.
- Mock, configured-client, repository-infrastructure, and remote-live claims are never conflated.
- Environment variable names and adapter-selection behavior are documented without secret values.
- No environment or remote state changes.
- The next implementation order can name concrete prerequisites and stop conditions.

## Validation commands/evidence

### Always-local

- `npm test`; `cd app; npm test`; `cd app; npx tsc --noEmit`; harness; placeholder-qualified lint.
- `git diff --check` and `git status --short` for documentation-only scope.
- Static `rg` evidence for target service methods, tables, policies, and buckets.
- Docker: `NOT AVAILABLE` baseline unless newly proven.

### Conditional-staging/native/human

- Remote configured check: `NOT RUN — safe environment unavailable` by default.
- Native/human tests: not applicable to a read-only readiness audit unless failure UX is separately authorized.

## Stop conditions/authorization limits

Stop before any prompt/login for credentials, secret output, environment edit, remote write, deployment, migration, or runtime correction. A failed readiness check creates a blocker/follow-up; it does not authorize repair.

## Risks/follow-ups

- Static parity can miss deployed drift.
- A reachable endpoint does not prove policy correctness or multi-user isolation.
- Placeholder lint and absent Docker limit assurance and must remain visible.

## Definition of done

The narrow matrix is complete and source-cited, all commands/results are honest, remote/Docker/native limits are explicit, review log is updated, and no runtime, environment, credential, or remote state changed.
