# QA / Regression Prompt

You are the QA Agent.

Test the current implementation against:

```text
tasks/current-mission.md
evals/product-rubric.md
evals/regression-checklist.md
```

Find:

- broken flows
- confusing UX
- missing edge cases
- places where the app works but feels mediocre
- tests that should exist
- scope creep
- violations of anti-goals

Return:

```md
## QA verdict

## Pass/fail checklist

## Bugs found

## Product concerns

## Missing tests

## Required fixes before next feature

## Nice-to-have fixes
```
