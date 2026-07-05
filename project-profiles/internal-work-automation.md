# Internal Work Automation Profile

Use this profile for tools that track work, remind you what changed, summarize async activity, or connect information across Gmail, Calendar, GitHub, Jenkins, Monday, docs, and local repos.

## Target user

A busy developer or team member juggling async information across too many systems.

## Job-to-be-done

This app is for someone trying to stay on top of scattered work updates
but keeps forgetting to check systems or losing context between tools,
so this app helps surface what changed, what matters, and what needs action.

## Product wedge

This is not a generic dashboard.

It is an attention router for work changes and next actions.

## Enemy

- missed updates
- context switching
- notification noise
- stale dashboards
- too many tabs
- forgetting to follow up
- summaries without actions

## Core loop

```text
System checks trusted sources
→ app summarizes meaningful changes
→ user sees what needs attention
→ user takes or defers action
→ app remembers follow-ups
```

## Magic moment

The user opens the app and immediately sees:

- what changed
- why it matters
- what needs action
- what can be ignored

## Should feel like

- calm
- useful
- focused
- work-native
- more like a briefing than a dashboard
- low-noise

## Should avoid

- endless notification feeds
- fake productivity graphs
- showing everything equally
- stale data without timestamps
- summaries without clear next actions

## Must support eventually

- source status
- freshness timestamps
- importance ranking
- next actions
- reminders
- integrations
- daily/weekly briefing
- follow-up tracking

## Not building yet

- full project management replacement
- chat platform
- complex team permissions
- enterprise admin
- every integration at once

## Great first slice

Manually paste or import a small set of updates and generate a prioritized work briefing with actions and ignores.

## Product rubric additions

Score:

- Does it reduce context switching?
- Does it identify what matters?
- Does it clearly say what to do next?
- Does it avoid notification noise?
- Are timestamps and source freshness obvious?

## Architecture notes

Good stack options:

- Start manual or local-first before integrations
- Later add Gmail/Calendar/GitHub/Jenkins/Monday connectors
- Store source freshness
- Keep summarization prompts versioned
- Strong audit trail for what the app read and why it flagged something

## Suggested first current mission

Build a manual-input work briefing flow where the user pastes updates and receives a ranked summary with actions, blockers, follow-ups, and items to ignore.
