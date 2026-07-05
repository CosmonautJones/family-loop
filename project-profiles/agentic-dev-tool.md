# Agentic Dev Tool Profile

Use this profile for apps that help developers work with Claude Code, Cursor, Codex, Copilot, local AI, RAG, agents, reviews, prompts, tasks, or build loops.

## Target user

A software developer using AI tools during real work.

Examples:

- Claude Code power user
- Cursor user
- developer building with Codex or Copilot agents
- engineer creating local RAG workflows
- developer who needs better agent prompts, reviews, and async tracking

## Job-to-be-done

This app is for a developer using AI coding tools
who is trying to ship useful software faster
but keeps struggling with vague prompts, context loss, shallow agent output, and hard-to-review changes,
so this app helps them turn messy work into scoped, reviewable, testable agent missions.

## Product wedge

This is not a generic productivity app.

It is a developer-native tool that makes agentic coding work more reliable, reviewable, and useful.

## Enemy

- vague prompts
- context loss
- AI slop
- unreviewable diffs
- generic generated apps
- forgotten agent work
- missing acceptance criteria
- weak test plans

## Core loop

```text
Developer gives rough task or idea
→ app sharpens it into an agent-ready mission
→ agent builds or reviews the mission
→ developer gets a reviewable diff, notes, and next action
→ future missions improve
```

## Magic moment

The developer pastes a messy idea and gets:

- a sharp mission
- anti-goals
- acceptance criteria
- likely files
- test plan
- builder prompt
- reviewer prompt

in under two minutes.

## Should feel like

- Linear
- Raycast
- Cursor
- Claude Code
- a sharp internal dev tool
- fast, serious, practical

## Should avoid

- chatbot-first UX unless chat is truly the product
- generic dashboards
- fake productivity analytics
- vague "AI assistant" branding
- too many settings
- agent actions without review logs
- adding features before the core loop works

## Must support eventually

- copyable agent prompts
- mission templates
- acceptance criteria
- test plans
- anti-goals
- review logs
- diff summaries
- agent role routing
- project memory
- maybe GitHub / local repo integration

## Not building yet

- teams
- billing
- marketplace
- full issue tracker
- plugin ecosystem
- complex permissions
- enterprise admin

## Great first slice

Build a single flow where the user pastes a rough task and receives an agent-ready mission pack.

## Product rubric additions

Score:

- Would I paste this output into Claude Code?
- Does it reduce vague agent work?
- Does it improve reviewability?
- Does it prevent generic output?
- Does it save time during a real workday?
- Does it preserve human ownership?

## Architecture notes

Good stack options:

- Next.js or React for the UI
- Local-first storage at first
- Markdown files for mission outputs
- Optional SQLite later
- AI provider abstraction if using multiple models
- Export to clipboard or files before adding integrations

## Suggested first current mission

Build the first-run screen where a user pastes a rough development idea and gets a copyable mission pack with sharp wedge, anti-goals, acceptance criteria, test plan, and Claude Code builder prompt.
