# Project Profiles

Project profiles are reusable overlays for different types of apps.

They help you make the harness specific without rewriting the whole harness every time.

Use them like this:

```text
Base Harness
+ Selected Project Profile
+ Your app-specific edits
= A focused build system for this project
```

## How to use a profile

1. Pick the closest profile.
2. Copy its guidance into the docs it references.
3. Modify the examples to your exact idea.
4. Run the Product Killer.
5. Rewrite your current mission.
6. Build one tiny excellent slice.

## Available profiles

| Profile | Use when building |
|---|---|
| `agentic-dev-tool.md` | Tools for Claude Code, Cursor, Codex, agent loops, developer productivity |
| `local-rag-app.md` | Local/private docs, codebase Q&A, grounded source-cited answers |
| `ai-video-tool.md` | AI-assisted video editing, clips, captions, shot lists, creative workflows |
| `game-dev-tool.md` | Game prototypes, NPC tools, asset generation, level design, modding workflows |
| `internal-work-automation.md` | Work dashboards, async tracking, reminders, Gmail/Calendar/GitHub/Jenkins/Monday flows |
| `ai-research-dashboard.md` | Daily briefings, research feeds, source tracking, trend monitoring |
| `mobile-web-saas.md` | General web/mobile SaaS-style products |
| `blank-profile-template.md` | Use when none of the above fit |

## What a profile should define

Each profile should help fill:

```text
docs/vision.md
docs/core-loop.md
docs/taste-bar.md
docs/anti-goals.md
docs/architecture.md
evals/product-rubric.md
tasks/current-mission.md
```

## The profile rule

The profile should make the app narrower, not broader.

If applying a profile causes you to add more features before the core loop works, you are using it wrong.
