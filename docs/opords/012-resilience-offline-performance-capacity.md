# OPORD 012 — Resilience, Offline, Performance, and Capacity

## Status
Planned hardening mission after the M1–M6 core loop; detailed targets below are inference pending measured baselines.

## Situation and evidence
The unconfigured adapter is process-local and not restart durability (`docs/architecture.md:22`); Supabase auth alone persists through AsyncStorage (`docs/architecture.md:41`). Query owns migrated server state, but no offline mutation queue or capacity evidence is documented. Native/human tests have not run.

## Mission/objective
Measure and harden the event loop for common disconnects, retries, large-but-realistic families, and slow phones/networks without creating a speculative synchronization platform.

## Dependencies
Depends on: OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011

Accepted core data missions; representative fixture volumes; explicit product decisions for offline read versus offline write guarantees; approved performance budgets.

## Non-goals
Full offline-first collaboration, conflict-free replication, infinite scale, desktop optimization, background sync, or infrastructure autoscaling.

## Authorized territory (files/systems)
Existing Query configuration, feature-level retry/error behavior, selectors/list rendering, deterministic fixtures/tests, measurement scripts using current dependencies, docs/evals.

## Forbidden territory
New caching/sync dependencies, schema/index/deploy changes, remote load tests, production traffic, auth changes, broad rewrites, and unsupported performance claims.

## Older-adult usability guardrail
Slow/offline states must preserve readable, plain-language event context, never discard typed text silently, provide one 48x48-point retry action, announce state to screen readers, respect reduced motion, and avoid flicker or rapidly shifting controls.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O012-T1 | 1 | Performance analyst | Private / gpt-5.5 | fixtures, measurement scripts, docs/evals | Record volumes and baselines for cold open, Event Detail, long lists and mutation recovery; define budgets and offline contract. | Reproducible commands, device/browser metadata, volumes and budgets exist before code changes. |
| O012-T2 | 2 | Resilience builder | Private / gpt-5.5 | Query config, feature retry/error seams, selectors/lists | Fix only measured failures; retain drafts and prevent retry duplicates; preserve identity after reconnect. | Deterministic disconnect/retry/capacity tests pass without new dependencies. |
| O012-T3 | 3 | QA/reviewer | Sergeant / gpt-5.3-instant | tests, regression checklist, review log | Run throttled phone smoke and compare measurements to budgets. | Budgets pass or blockers are explicit; unsupported offline actions and native gaps are documented. |

## Acceptance criteria
- Agreed budgets and volumes are recorded before optimization.
- Offline/slow states are explicit; failed writes retain user input and do not duplicate on retry.
- Event identity and ordering remain correct under reconnect and larger fixtures.
- Measurements demonstrate budget compliance without new dependencies or remote load.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also record focused retry/capacity tests, before/after timings with browser and fixture volume, and a 390x844 throttled-network smoke; label lint as placeholder.

### Conditional-staging/native/human
Native device, human usability, and production load are currently NOT RUN.

## Stop conditions/authorization limits
Stop until budgets/offline semantics are decided; stop before new packages, remote load tests, indexes/migrations, background sync, or infrastructure changes.

## Risks/follow-ups
Synthetic web timings may not predict native devices; retries can duplicate writes; cache persistence may expose private data on shared devices. Native profiling and secure cache policy require separate authorization.

## Definition of done
Measured targets pass, resilience behavior is executable and documented, no speculative platform is added, and review evidence names every untested environment.
