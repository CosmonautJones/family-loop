# OPORD 012 — Resilience, Offline, Performance, and Capacity

## Status
Planned hardening mission after the M1–M6 core loop; detailed targets below are inference pending measured baselines.

## Situation and evidence
The unconfigured adapter is process-local and not reload durability (`docs/architecture.md:22`). Query owns migrated server state, but browser cache/storage behavior across reloads, tabs, private browsing, and storage eviction is undocumented. No offline mutation queue or capacity evidence exists; mobile-browser/human tests have not run.

## Mission/objective
Measure and harden the event loop for common disconnects, retries, large-but-realistic families, and slow phones/networks without creating a speculative synchronization platform.

## Dependencies
Depends on: OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011

Accepted core data missions; representative fixture volumes; explicit product decisions for offline read versus offline write guarantees; approved performance budgets.

## Non-goals
Full offline-first collaboration, conflict-free replication, infinite scale, PWA installation, service workers, offline write queues, background sync, or infrastructure autoscaling. Desktop receives secondary regression coverage, not primary optimization.

## Authorized territory (files/systems)
Existing Query configuration, feature-level retry/error behavior, selectors/list rendering, deterministic fixtures/tests, measurement scripts using current dependencies, docs/evals.

## Forbidden territory
New caching/sync dependencies, schema/index/deploy changes, remote load tests, production traffic, auth changes, broad rewrites, and unsupported performance claims.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Slow/offline states must preserve readable, plain-language event context, never discard typed text silently, provide one 48x48 CSS-pixel retry action, announce state to screen readers, respect reduced motion, and avoid flicker or rapidly shifting controls.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O012-T1 | 1 | Performance analyst | Private / gpt-5.5 | fixtures, measurement scripts, docs/evals | Record volumes and baselines for cold open, Event Detail, long lists and mutation recovery; define budgets and offline contract. | Reproducible commands, device/browser metadata, volumes and budgets exist before code changes. |
| O012-T2 | 2 | Resilience builder | Private / gpt-5.5 | Query config, feature retry/error seams, selectors/lists | Fix only measured failures; retain drafts and prevent retry duplicates; preserve identity after reconnect. | Deterministic disconnect/retry/capacity tests pass without new dependencies. |
| O012-T3 | 3 | QA/reviewer | Sergeant / gpt-5.3-instant | tests, regression checklist, review log | Run throttled 320/390/430 phone-browser smoke, tab/reload/cache/storage scenarios, and desktop secondary regression. | Budgets pass or blockers are explicit; unsupported offline writes and browser gaps are documented. |

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

### Conditional-staging/mobile-web/human
Real-phone iOS Safari, Android Chrome, human usability, and production load are currently NOT RUN.

## Stop conditions/authorization limits
Stop until budgets/offline semantics are decided; stop before new packages, remote load tests, indexes/migrations, PWA/service-worker work, offline write queues, background sync, or infrastructure changes.

## Risks/follow-ups
Desktop synthetic timings may not predict mobile Safari/Chrome; retries can duplicate writes; browser cache/storage may expose private data on shared devices or be evicted unexpectedly. Persistent offline writes remain an explicit non-goal.

## Definition of done
Measured targets pass, resilience behavior is executable and documented, no speculative platform is added, and review evidence names every untested environment.
