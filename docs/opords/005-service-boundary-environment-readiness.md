# OPORD 005 — Service boundary and environment readiness

## Status

PLANNED LOCAL SERVER/SERVICE MISSION — staging deploy, credentials, and remote mutation remain RED pending separate authorization.

## Situation and evidence

- `app/src/services/api.ts` defines auth, groups, events, RSVPs, activity, messages, media, and notification contracts, and adapter selection depends on Expo Supabase variables (`docs/architecture.md:50-56`).
- Unconfigured mode is deterministic/process-local; configured failures must remain visible (`docs/architecture.md:24-29,50-56`).
- Remote Supabase deployment is unverified, Docker is unavailable, and live event/RSVP CRUD is `NOT RUN — ENV unavailable` (`docs/architecture.md:57-61`).
- M1-M3 local foundations and checks exist, but code availability is not proof of remote tables, policies, buckets, or auth settings (`evals/review-log.md:3-13,35-48`).

## Mission/objective

Make the server/service boundary executable and diagnosable for the next approved mission: versioned requests, stable error envelopes and correlation IDs, bounded timeouts/retries, rate limits, explicit privileged-operation isolation, and connection/readiness probes—while separating local proof from conditional staging deployment.

## Dependencies

Depends on: OPORD-002

- Named next mission/capability so the audit stays narrow.
- Existing repository tests and environment-variable documentation.
- Optional safe non-production environment supplied by the owner; absence is an acceptable documented result.

## Non-goals

- Staging/production deployment, credential discovery, project creation, environment edits, dependencies, or remote mutation without separate approval.
- Claiming production readiness or auditing unused future capabilities.

## Authorized territory (files/systems)

- When this OPORD is activated, service adapters and existing in-repo server/edge runtime files named by the approved task manifest.
- Local non-secret commands, deterministic probes, contract tests, and mock-mode tests.
- If explicitly supplied, non-mutating metadata/connectivity checks against an approved safe environment.
- Documentation and review records named by the activated manifest. The current campaign-writing mission made no runtime changes; that historical limit does not remove this OPORD's future local implementation authority.

## Forbidden territory

- Runtime edits outside the activated task manifest; secrets/credential stores; `.env` creation or printing; remote writes; migrations; policy/bucket/auth setting changes; deployment; destructive commands; and new dependencies without separate RED authorization.

## Older-adult usability guardrail

Readiness must include the failure experience: configured outages, timeouts, rate limits, or missing data must produce plain, recoverable UI with a support-safe correlation ID and never silently show fixtures that could mislead a user about family plans.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O005-T1 | 1 | Service contract analyst | Private / gpt-5.3-instant | Service callers/adapters/server files (read-only), readiness matrix | Document request version, success shape, stable error envelope, correlation propagation, auth/privilege boundary, timeout, retry, rate limit, and connection assumptions. | Each capability separates repository, mock, configured, and live evidence; no secret is loaded or printed. |
| O005-T2 | 1 | Service test owner | Private / gpt-5.3-instant | Focused local service/probe tests | Add probes for readiness/liveness, malformed/version mismatch, errors/correlation, timeout, retry classes/bounds, rate limiting, connection loss, and privileged denial. | Tests need no remote credentials; retries cannot duplicate writes; privileged paths reject client identity. |
| O005-T3 | 2 | Service implementer | Private / gpt-5.3-instant | Separately approved existing service/server files | Implement smallest versioned boundary, error mapping, correlation ID, bounded timeout/retry, connection verification, rate-limit response, and server-only privileged seam. | Local probes and app contracts pass; configured failures stay visible; errors/logs expose no sensitive detail. |
| O005-T4 | 3 | Staging operator | Private / gpt-5.3-instant | Explicitly approved staging target only | RED until separately authorized: deploy exact artifact, configure supplied secrets out-of-repo, run connection/version/probe/rate/error checks, and capture rollback reference. | Approval, target, version, and transcript exist; otherwise `NOT RUN` with no live claim. |

## Acceptance criteria

- Every target capability has an evidence path and one of PASS/FAIL/NOT RUN/NOT APPLICABLE.
- Version mismatch, validation, authentication, authorization, rate limit, timeout, dependency, and unexpected failures use a stable non-sensitive error envelope with a correlation ID.
- Readiness verifies required connections; liveness does not depend on optional downstream systems.
- Retries are bounded and restricted to retryable/idempotent operations; writes cannot be duplicated.
- Privileged operations remain server-only and reject public/client credentials.
- Mock, configured-client, repository-infrastructure, and remote-live claims are never conflated.
- Environment variable names and adapter-selection behavior are documented without secret values.
- No environment or remote state changes.
- The next implementation order can name concrete prerequisites and stop conditions.

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
rg -n "health|ready|version|correlation|timeout|retry|rate|service_role|SUPABASE" app supabase tests
git diff --check
git status --short
```

- Report lint as placeholder unless changed; retain probe output with the readiness matrix.
- Docker: `NOT AVAILABLE` baseline unless newly proven.

### Conditional-staging/mobile-web/human

- Remote configured check: `NOT RUN — safe environment unavailable` by default.
- Mobile-web browser/human tests: not applicable to a read-only readiness audit unless failure UX is separately authorized.

## Stop conditions/authorization limits

Stop before credential prompts, secret output, environment edits, remote writes, staging deploy, migration, new dependency, or runtime files outside the approved local manifest. Staging deployment stays RED until target, artifact, secret handling, probes, and rollback verification are separately authorized.

## Risks/follow-ups

- Static parity can miss deployed drift.
- A reachable endpoint does not prove policy correctness or multi-user isolation.
- Placeholder lint and absent Docker limit assurance and must remain visible.

## Definition of done

The versioned local boundary and probes meet acceptance, the readiness matrix is source-cited, commands/results are honest, remote/Docker/mobile-browser limits are explicit, review log is updated, and no environment, credential, or remote state changed; staging remains separately authorized.
