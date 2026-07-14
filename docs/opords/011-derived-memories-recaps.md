# OPORD 011 — Derived memories and recaps

## Status
Planned as M6 after M2 and M4.

## Situation and evidence
Memories are still fixture-backed (`docs/architecture.md:17,30`), while the product requires memories derived from completed events (`docs/architecture.md:47`; `docs/anti-goals.md`). M6 calls for derived memories and closeout, excluding free-floating posts and AI recaps (`tasks/backlog.md:13`).

## Mission/objective
Derive a calm, read-only memory/recap from completed authorized events and their private media, preserving exact event identity and an honest empty state.

## Dependencies
Completed M1–M2 and accepted OPORD 009/M4 media; approved M6 manifest. Event completion semantics must be agreed without adding a speculative status model; default inference is `endsAt < now`.

## Non-goals
Free-floating posts, AI summaries, manual albums, public sharing, reactions, ranking, editing source history, or new retention mechanics.

## Authorized territory (files/systems)
Memory selectors/queries, existing Memories/Home surfaces, event/media read contracts if minimally necessary, focused tests, architecture/backlog/completed/checklist/review records.

## Forbidden territory
New memory tables unless separately approved, schema/RLS/deploy changes, media mutation, AI services, public feeds, notifications, dependencies, and auth changes.

## Older-adult usability guardrail
Use event title and date as the primary anchor, plain copy, readable cards with 48x48-point actions, explicit “No photos yet” copy, and a simple recovery route back to the source event; avoid gesture-only carousels and dense mosaics. Provide screen-reader summaries and respect reduced motion.

## Execution
1. Specify deterministic completion and ordering rules, including timezone and invalid-date behavior.
2. Derive memories from authorized event plus media records rather than copying them into a parallel durable store.
3. Replace fixture memory reads with Query-owned loading/error/empty/populated states.
4. Preserve privacy and exact-event navigation; do not show completed events from another group.
5. Test zero-media, multiple-media, invalid time, deleted media, and group isolation.
6. Phone-smoke the completed-event-to-memory path and close out campaign documentation.

## Acceptance criteria
- Only completed authorized events derive memories.
- Ordering is deterministic by parsed instant with stable tie-breaks.
- No photos produces useful honest copy; deleted media disappears after refetch.
- No fixture fallback or free-floating memory records remain on migrated surfaces.
- Source event remains identifiable and reachable.

## Validation commands/evidence
### Always-local
Run root/app tests, TypeScript, placeholder lint labeled, harness, diff check, focused selector/query tests, 390x844 completed-event and empty-memory smoke, and configured signed-out smoke.

### Conditional-staging/native/human
Live RLS and human/native usability remain NOT RUN unless separately available and approved.

## Stop conditions/authorization limits
Stop if completion semantics require schema change, if media M4 is incomplete, or before AI, public sharing, remote migrations, credentials, new dependencies, or source-event mutation.

## Risks/follow-ups
Client-clock/timezone errors, broken media references, privacy leakage through cached URLs, and overdecorated recap UI. Explicit event closeout could be a later mission.

## Definition of done
Derived memories are deterministic, private, independently tested and phone-smoked; campaign records and review log are updated with honest limitations.
