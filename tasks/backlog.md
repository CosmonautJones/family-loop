# Backlog

## Candidate tasks

| Priority | Task | Why it matters | Notes |
|---|---|---|---|
| P1 | Replace mock Add photo action with a scoped gallery upload/empty state | The Event Detail surface still shows a photo action without behavior | Keep fixture-first; no backend yet |
| P1 | Make Calendar agenda items open Event Detail | The core event surface should be reachable from more than Home | Reuse the current shell bridge |
| P2 | Add notification/reminder copy states without push plumbing | Reminders are part of the product promise but should not imply live push yet | Keep this as UX state only |

## Product improvements

- Keep Event Detail as the proof point before adding new top-level surfaces.

## UX improvements

- Tighten lower-page spacing around Event pulse and Thread once real content density is higher.

## Code improvements

- Move the temporary shell surface bridge to a real navigator when navigation requirements expand.

## Research tasks

- Compare private event apps and family organizers for first-run event creation patterns.
