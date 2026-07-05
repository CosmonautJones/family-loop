# Backlog

## Candidate tasks

| Priority | Task | Why it matters | Notes |
|---|---|---|---|
| P0 | Make Calendar agenda items open Event Detail on mobile | Event Detail is the main mobile coordination surface and should be reachable from the second tab | Reuse the current shell bridge |
| P1 | Replace mock Add photo action with a scoped gallery upload/empty state | The Event Detail surface still shows a photo action without behavior | Keep fixture-first; no backend yet |
| P1 | Tighten mobile event creation flow | Creating a shared event is the next habit-forming phone action | Keep the first form short |
| P2 | Add notification/reminder copy states without push plumbing | Reminders are part of the product promise but should not imply live push yet | Keep this as UX state only |

## Product improvements

- Keep Event Detail as the mobile proof point before adding new top-level surfaces.
- Treat web as preview/companion until the iOS/Android loop feels strong.

## UX improvements

- Tighten lower-page spacing around Event pulse and Thread on phone viewports once real content density is higher.

## Code improvements

- Move the temporary shell surface bridge to a real mobile navigator when navigation requirements expand.

## Research tasks

- Compare private event apps and family organizers for first-run event creation patterns.
