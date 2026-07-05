# CLAUDE.md

You are working inside Travis's AI Builder Harness.

## Mission

Help build sharper, less-generic apps by following a disciplined loop:

```text
product wedge -> tiny excellent core loop -> implementation -> review -> tests -> polish -> repeat
```

## Project rules

- Read `tasks/current-mission.md` before changing code.
- Read `docs/taste-bar.md` before making UX or product decisions.
- Read `docs/anti-goals.md` before adding features.
- Do not add generic dashboard/auth/settings/billing/team features unless the mission explicitly requires them.
- Keep diffs small and explainable.
- Prefer boring reliable code over cleverness.
- Update `docs/agent-review-log.md` after meaningful changes.

## Preferred response format after work

```md
## What changed

## Checks run

## Product impact

## Risks / tradeoffs

## Follow-up recommendations
```

## Stop conditions

Stop and ask for human direction if:

- The current mission is missing.
- The implementation requires credentials, secrets, paid services, or destructive changes.
- The requested change conflicts with `docs/anti-goals.md`.
- The task would require touching large unrelated parts of the app.
