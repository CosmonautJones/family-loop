# OPORD 012 — Resilience, offline, performance, and capacity

## Status
Planned hardening mission after the M1–M6 core loop; detailed targets below are inference pending measured baselines.

## Situation and evidence
The unconfigured adapter is process-local and not restart durability (`docs/architecture.md:22`); Supabase auth alone persists through AsyncStorage (`docs/architecture.md:41`). Query owns migrated server state, but no offline mutation queue or capacity evidence is documented. Native/human tests have not run.

## Mission/objective
Measure and harden the event loop for common disconnects, retries, large-but-realistic families, and slow phones/networks without creating a speculative synchronization platform.

## Dependencies
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
1. Establish measured baselines for cold open, Event Detail, long thread/media lists, and mutation recovery at agreed fixture volumes.
2. Define a narrow offline contract: cached viewing and draft retention separately from writes.
3. Fix only measured regressions using existing Query/cache and rendering seams.
4. Add deterministic disconnect/retry and capacity tests; verify session/event isolation after reconnect.
5. Run low-network phone smoke and document unsupported offline actions.

## Acceptance criteria
- Agreed budgets and volumes are recorded before optimization.
- Offline/slow states are explicit; failed writes retain user input and do not duplicate on retry.
- Event identity and ordering remain correct under reconnect and larger fixtures.
- Measurements demonstrate budget compliance without new dependencies or remote load.

## Validation commands/evidence
### Always-local
Run standard root/app/type/harness/diff checks; placeholder lint labeled; focused retry/capacity tests; before/after timings with browser and fixture volume recorded; and 390x844 throttled-network smoke.

### Conditional-staging/native/human
Native device, human usability, and production load are currently NOT RUN.

## Stop conditions/authorization limits
Stop until budgets/offline semantics are decided; stop before new packages, remote load tests, indexes/migrations, background sync, or infrastructure changes.

## Risks/follow-ups
Synthetic web timings may not predict native devices; retries can duplicate writes; cache persistence may expose private data on shared devices. Native profiling and secure cache policy require separate authorization.

## Definition of done
Measured targets pass, resilience behavior is executable and documented, no speculative platform is added, and review evidence names every untested environment.
