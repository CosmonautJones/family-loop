# OPORD 011 — Derived Memories and Recaps

## Status
LOCAL COMPLETE / CONDITIONAL — derived completed-event memories are implemented and browser-proven; physical/mobile-human validation remains open.

## Situation and evidence
Memories are Query-backed derived projections of completed events plus exact-event comments/media; no standalone memory records exist. The configured browser journey showed Lake Geneva with its persisted private photos and comments and routed back to the source event.

## Mission/objective
Derive a calm, read-only memory/recap from completed authorized events and their private media, preserving exact event identity and an honest empty state.

## Dependencies
Depends on: OPORD-007, OPORD-008, OPORD-009

Completed M1–M2 and accepted OPORD 009/M4 media; approved M6 manifest. Event completion semantics must be agreed without adding a speculative status model; default inference is `endsAt < now`.

## Non-goals
Free-floating posts, AI summaries, manual albums, public sharing, reactions, ranking, editing source history, or new retention mechanics.

## Authorized territory (files/systems)
Memory selectors/queries, existing Memories/Home surfaces, event/media read contracts if minimally necessary, focused tests, architecture/backlog/completed/checklist/review records.

## Forbidden territory
New memory tables unless separately approved, schema/RLS/deploy changes, media mutation, AI services, public feeds, notifications, dependencies, and auth changes.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Use event title and date as the primary anchor, plain copy, readable cards with 48x48-point actions, explicit “No photos yet” copy, and a simple recovery route back to the source event; avoid gesture-only carousels and dense mosaics. Provide screen-reader summaries and respect reduced motion.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O011-T1 | 1 | Data builder | Private / gpt-5.5 | memory selectors/queries, event/media read contracts, focused tests | Define deterministic completion/order rules and derive memories from event plus media records. | Tests cover timezone/invalid dates, stable ties, zero media, deleted media and group isolation. |
| O011-T2 | 2 | Mobile builder | Private / gpt-5.5 | Memories/Home surfaces, exact-event navigation | Replace fixtures with Query loading/error/empty/populated states and preserve source-event identity. | Only authorized completed events render; empty copy is honest; exact source event opens. |
| O011-T3 | 3 | QA/reviewer | Sergeant / gpt-5.3-instant | tests, docs/evals, review log | Run regression suite and phone smoke, then close out campaign evidence. | All checks pass; no free-floating records or fixture fallback remain; limitations are logged. |

## Acceptance criteria
- Only completed authorized events derive memories.
- Ordering is deterministic by parsed instant with stable tie-breaks.
- No photos produces useful honest copy; deleted media disappears after refetch.
- No fixture fallback or free-floating memory records remain on migrated surfaces.
- Source event remains identifiable and reachable.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Only completed authorized events derive memories | COMPLETE LOCALLY | `derivedHistory.ts` isolation tests and configured member/outsider browser proof. |
| Deterministic parsed-instant ordering/ties | COMPLETE | Pure selector tests. |
| Honest no-photo/deleted-media refetch | COMPLETE LOCALLY | Empty-state/query tests and service-owned media reads. |
| No fixture fallback/free-floating records | COMPLETE | Query-backed implementation and configured failure boundary. |
| Source event identifiable/reachable | COMPLETE | Browser memory card and exact-event route. |

Physical iOS/Android and moderated-human usability are `NOT RUN`.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also run focused selector/query tests, a 390x844 completed-event and empty-memory smoke, and configured signed-out smoke; label lint as placeholder.

### Conditional-staging/mobile-web/human
Live RLS and human/mobile-browser usability remain NOT RUN unless separately available and approved.

## Stop conditions/authorization limits
Stop if completion semantics require schema change, if media M4 is incomplete, or before AI, public sharing, remote migrations, credentials, new dependencies, or source-event mutation.

## Risks/follow-ups
Client-clock/timezone errors, broken media references, privacy leakage through cached URLs, and overdecorated recap UI. Explicit event closeout could be a later mission.

## Definition of done
Derived memories are deterministic, private, independently tested and phone-smoked; campaign records and review log are updated with honest limitations.
