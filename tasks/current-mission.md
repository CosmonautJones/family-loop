# Current Mission

## Mission

Align the harness and repo docs around LoopedIn as a mobile-first product.

## Business / product reason

Future work should judge product decisions against the iOS/Android app first. Without that clarity, the repo can drift into a generic web/social/dashboard product.

## User story

As a product builder, I want the harness docs to make mobile the primary surface so every next slice improves phone-first coordination.

## Acceptance criteria

- [x] Vision, core loop, taste bar, and anti-goals state mobile as the main product surface.
- [x] Architecture and README files clarify iOS/Android first, web preview/companion second.
- [x] Product rubric includes mobile-specific checks.
- [x] Backlog prioritizes mobile slices over web/admin surfaces.

## Files or modules likely involved

- docs/vision.md
- docs/core-loop.md
- docs/taste-bar.md
- docs/anti-goals.md
- docs/10-loop-architecture-and-workflow.md
- evals/product-rubric.md
- README.md
- app/README.md
- tasks/backlog.md

## Required checks

- [x] powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
- [x] npm test
- [x] rg "mobile-first|iOS|Android|web preview|companion" docs README.md app/README.md tasks evals

## Do not touch

- App runtime code.
- Backend or auth scaffolding.
- Broad navigation structure.

## Risks

- Overcorrecting into mobile-only language that hides the usefulness of web preview.
- Editing old research artifacts more than needed.

## Definition of done

- [x] Acceptance criteria met
- [x] Relevant checks run
- [x] Review log updated
- [x] Follow-up tasks listed
