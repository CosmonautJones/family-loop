# Code Rubric

## Scope control

- Did the implementation stay inside the mission?
- Were unrelated changes avoided?

## Maintainability

- Is the code easy to read?
- Are names clear?
- Are modules focused?

## Testability

- Can the core behavior be tested?
- Were tests added or updated where practical?

## Risk

- Any fragile assumptions?
- Any risky dependencies?
- Any hidden state?

## Agent accountability

- Did the agent explain what changed?
- Did it update the review log?
- Did it list follow-ups?

## Code verdict

PASS (M1 implementation) — The change uses one React session context, additive adapter methods, the existing Query client, and explicit configured/unconfigured branches. Query cache resets on session identity changes and configured group resolution is Query-owned. No dependency, schema, polling, or fallback framework was added. Structural tests and TypeScript pass; phone smoke remains an explicit final gate.
