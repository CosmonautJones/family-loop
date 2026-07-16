# OPORD 005 — Service boundary and environment readiness

## Status

STAGING READINESS PASS / PRODUCTION CONDITIONAL — the adapter boundary, safe error categories, hosted availability, and readiness-aware Realtime/refetch behavior are executable and observed on dedicated staging. A general request-version/correlation-ID/deadline/rate-limit contract and production readiness remain `NOT RUN`.

## Situation and evidence

- `app/src/services/api.ts` defines auth, groups, events, RSVPs, activity, messages, media, and notification contracts. Development/native selection uses Expo variables; immutable web releases validate a public runtime overlay before lazy adapter/client creation.
- Default local mode is versioned and reload-durable; memory mode is explicit test-only; Supabase mode is explicit and never falls back on configured failures.
- Loopback Supabase is available and exercised through migration, database lint, family/media E2E, and a configured four-session browser scenario. Dedicated staging availability/readiness now passes; production remains unverified.

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

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| PASS/FAIL/NOT RUN path per capability | COMPLETE | Campaign/index and runbooks separate durable-local, loopback Supabase, browser, and hosted evidence. |
| Stable non-sensitive error envelope/correlation ID for all classes | PARTIAL | Every configured adapter rejection is centrally mapped to a stable safe recovery category; no server-propagated request version or correlation ID exists. |
| Readiness/liveness connection semantics | PARTIAL | Loopback startup/migration/lint/E2E prove readiness; no general application health endpoints. |
| Bounded idempotent retries/no duplicate writes | COMPLETE LOCALLY | Query reads retry once and mutations never auto-retry. Event/comment drafts retain UUID operation keys across unchanged manual retries; private actor/entity/key operation maps replay the same authoritative row in durable-local and loopback Supabase. Distinct operations and cross-user key collisions remain distinct. Universal request deadlines remain a hosted/server policy gap. |
| Privileged operations server-only | COMPLETE LOCALLY | Narrow security-definer RPCs and local RLS tests; service role is not shipped to client. |
| Evidence modes never conflated | COMPLETE | Architecture, review log, and runbooks explicitly distinguish them. |
| Environment names/adapter selection documented | COMPLETE | `docs/architecture.md`, strict runtime-config validator, lazy service/client selector, and release runbook. The exact artifact ran with local and loopback-Supabase overlays and failed closed on an invalid overlay. |
| No remote state changes | COMPLETE | Local-only audit trail. |
| Concrete next-order prerequisites | COMPLETE | Dependency registry and per-order external gates. |

The executable matrix and the no-action rationale for client-only correlation IDs/general write timeouts are in `docs/runbooks/local-service-readiness-and-query-plans.md`.

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
- Local Docker/Supabase response-loss harness: PASS; retained populated scenario remained exact and the harness cleaned its private operation mappings.

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

## Superseding staging disposition — 2026-07-16

- Dedicated staging availability run `29466990331` is GREEN for the HTTPS shell, no-store runtime configuration, exact backend identity, Auth health, release metadata, and missing-asset behavior.
- Cold run `qa-mrmuexxo-586c4751` was RED when an insert immediately after `SUBSCRIBED` exposed that transport subscription was not yet reliable Postgres-change readiness. The scoped fix adds a system-event refetch plus cancellation/refetch query regression coverage. Cold/warm runs `qa-mrmvkrsu-77c50f7e` and `qa-mrmvneb6-75962463`, then final run `qa-mrmw9a6b-dcce7de2`, were GREEN.
- Staging release `0.1.0-08006e5e83a8` and Supabase migration history through `20260716002122` are compatible in the final hosted checks. The older conditional-staging command language above remains the authorization baseline for future environments, not a claim that production is ready.
- Still open: server-propagated request/correlation IDs, universal deadlines/gateway rate enforcement, real SMTP/password completion, physical devices/assistive technology, and a separate production environment.
