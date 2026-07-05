# Getting Started

## The short version

```text
Pick a profile
→ customize the docs
→ define one tiny mission
→ run Product Killer
→ build only that mission
→ review
→ polish
→ repeat
```

## 1. Pick a project profile

Open:

```text
project-profiles/README.md
```

Choose the closest profile:

```text
agentic-dev-tool.md
local-rag-app.md
ai-video-tool.md
game-dev-tool.md
internal-work-automation.md
ai-research-dashboard.md
mobile-web-saas.md
```

The profile gives you default thinking for that kind of app.

## 2. Fill the core docs

Open and customize:

```text
docs/vision.md
docs/core-loop.md
docs/taste-bar.md
docs/anti-goals.md
docs/architecture.md
```

Do not try to make these perfect. Make them specific.

## 3. Define the current mission

Open:

```text
tasks/current-mission.md
```

Write the smallest version of the app that can create a real "oh, that's useful" moment.

Bad mission:

```text
Build the app.
```

Good mission:

```text
Build the first-run flow that turns one rough app idea into a clean agent-ready build mission with acceptance criteria, anti-goals, and a test plan.
```

## 4. Run the Product Killer

Use:

```text
prompts/product-killer.md
```

The goal is to find what is generic, weak, or unfocused before code exists.

## 5. Rewrite the mission

After Product Killer feedback, rewrite:

```text
tasks/current-mission.md
```

Make it smaller and sharper.

## 6. Build only the current mission

Use:

```text
prompts/builder.md
```

The Builder is not allowed to expand scope.

## 7. Review brutally

Use:

```text
prompts/ux-taste-reviewer.md
prompts/qa-regression.md
prompts/architect-reviewer.md
prompts/polish-pass.md
```

Only fix the highest-value issues.

## 8. Archive and repeat

Move completed work to:

```text
tasks/completed.md
```

Update:

```text
docs/agent-review-log.md
docs/roadmap.md
tasks/backlog.md
```

Then choose the next tiny slice.

---

# The important mindset

The profile makes the app specific.

The mission makes the work safe.

The rubrics make the output better.

The review loop keeps the app from becoming generic.
