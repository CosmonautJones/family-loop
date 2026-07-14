# OPORD 012 — Resilience, Offline, Performance, and Capacity

## Status
LOCAL COMPLETE / EXTERNAL CONDITIONAL — representative capacity, configured disconnect/retry, and throttled warm-web performance budgets pass locally; physical-device, assistive-technology, hosted-load, and human gates remain open.

## Situation and evidence
Default local mode uses a versioned AsyncStorage/browser-storage envelope with revisioned mutation coordination; hard reload and development-server restart durability passed. Configured loopback Supabase also persisted the full browser scenario across reloads. A cold disconnected reload still fails by design because no service worker/PWA shell exists, and configured writes are intentionally online-only with an explicit retry. The local representative baseline covers 20 members, 100 events, 100 comments, and 50 media records. A focused startup correction removed a decorative icon-font dependency from the already labeled tabs and made card surfaces static, reducing the production-web artifact from 6,177,881 to 981,256 bytes. Physical/mobile-human performance evidence does not exist.

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

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Budgets and representative volumes recorded before optimization | COMPLETE | `docs/runbooks/resilience-performance.md` records the approved 20-member/100-event/100-comment/50-media volume and phone-web budgets. |
| Explicit slow/offline states; input retention; retry dedupe | COMPLETE for supported contract | With loopback Supabase's API gateway stopped, the exact comment draft remained and the visible retry wrote it once after recovery; hard reload still showed exactly one copy. OPORD 013 subsequently replaced the raw transport error with calm recovery copy. Cold offline reload and queued writes remain explicitly unsupported product non-goals. |
| Identity/order after reconnect and larger fixtures | COMPLETE | The focused capacity test preserves exact event identity/order and exact counts through durable reconstruction. A configured browser reconnect retained the draft and persisted one exact comment; the disposable event was deleted and the baseline scenario verifier returned 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 3 objects, and zero outsider residue. |
| Measured budget compliance | COMPLETE locally | Chrome 150 dependency-free CDP measured three consecutive 390x844 warm production-export reloads under 500 kbps/400 ms RTT plus 4x CPU at 2,200/2,208/2,368 ms LCP, 170/110/91 ms longest tasks, CLS 0.057 each, and 390/390 document width. The already-loaded exact event reached its final heading and usable RSVP controls in 646 ms. Each run recorded zero configured-backend requests. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also record focused retry/capacity tests, before/after timings with browser and fixture volume, and a 390x844 throttled-network smoke; label lint as placeholder.

The executable performance gate is:

```powershell
node scripts/check-opord12-performance.mjs http://127.0.0.1:8093
```

It exits nonzero unless each of three warm runs meets the 4,000 ms LCP, 200 ms longest-task, and 390px no-overflow budgets and the final exact-event heading plus RSVP actions become usable within one second.

### Conditional-staging/mobile-web/human
Real-phone iOS Safari, Android Chrome, human usability, and production load are currently NOT RUN.

## Stop conditions/authorization limits
Stop until budgets/offline semantics are decided; stop before new packages, remote load tests, indexes/migrations, PWA/service-worker work, offline write queues, background sync, or infrastructure changes.

## Risks/follow-ups
Desktop synthetic timings may not predict mobile Safari/Chrome; browser cache/storage may expose private data on shared devices or be evicted unexpectedly. Persistent offline writes remain an explicit non-goal. The raw configured-network error was corrected under OPORD 013.

## Definition of done
Measured targets pass, resilience behavior is executable and documented, no speculative platform is added, and review evidence names every untested environment.
