# Optional Hooks

This folder is intentionally lightweight because every repo has different commands.

Good hook ideas for this harness:

- On session start: print current mission and anti-goals.
- Before tool use: block destructive commands.
- After file edit: run formatter for touched file types.
- On stop: require update to `docs/agent-review-log.md`.
- On stop: print changed files and suggested checks.

Claude Code hook docs change over time, so treat these as patterns, not a plug-and-play config.
