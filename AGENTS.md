# AGENTS.md

This repo uses an agentic build harness.

## Operating principles

1. Do not expand scope.
2. Do not add generic SaaS bloat.
3. Preserve the product wedge.
4. Improve the core loop before adding secondary features.
5. Prefer small, reviewable diffs.
6. Add tests or smoke checks when practical.
7. Update docs when behavior or architecture changes.
8. Ask for clarification only when the mission cannot be safely completed.

## Required reading before work

Agents should read these files before implementing:

```text
docs/vision.md
docs/core-loop.md
docs/taste-bar.md
docs/anti-goals.md
docs/architecture.md
tasks/current-mission.md
evals/product-rubric.md
evals/code-rubric.md
evals/regression-checklist.md
```

## Do not touch unless explicitly asked

- Auth
- Billing
- Settings
- Teams
- Notifications
- Large rewrites
- Unrelated visual redesigns
- New dependencies
- Deployment configuration

## Definition of done

A task is done only when:

- The current mission acceptance criteria are met.
- Relevant checks were run or the reason they were not run is documented.
- The implementation is scoped and reviewable.
- The review log is updated.
- Any new risks or follow-up tasks are listed.
