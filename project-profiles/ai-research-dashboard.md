# AI Research Dashboard Profile

Use this profile for daily briefings, trend dashboards, research feeds, source tracking, paper/report monitoring, AI news, tool radar, and technical intelligence.

## Target user

A developer or builder who wants useful signal from fast-moving AI/tooling information.

## Job-to-be-done

This app is for a builder tracking AI and technical developments
who is trying to find practical ideas worth using
but keeps drowning in news, hype, papers, and tool announcements,
so this app helps turn scattered sources into a ranked, actionable briefing.

## Product wedge

This is not a news reader.

It is an actionable intelligence briefing for builders.

## Enemy

- hype
- duplicate stories
- source spam
- shallow summaries
- no practical takeaway
- missing "what can I use?"
- trend chasing without judgment

## Core loop

```text
App collects or receives sources
→ filters for relevance
→ ranks what matters
→ explains why it matters
→ suggests practical experiments
→ user saves or tries ideas
```

## Magic moment

The user gets a briefing that says:

- what changed
- why it matters
- what to try
- what to ignore
- what could fit their workflow

## Should feel like

- sharp
- practical
- builder-focused
- source-grounded
- not clickbait
- not academic fluff
- quick scan plus one deeper dive

## Should avoid

- long generic summaries
- dumping links
- no citations
- no action items
- hype without skepticism
- repeating every announcement

## Must support eventually

- source tracking
- ranking
- topic filters
- saved items
- tool/repo/API radar
- daily briefing
- one deeper dive
- "try today / try later / skip" actions

## Not building yet

- full social feed
- broad news aggregator
- comment system
- recommendation algorithm before manual taste works

## Great first slice

Paste 5-10 links or notes and generate a builder briefing with a 60-second scan, practical takeaways, tool radar, one deeper dive, and try/skip actions.

## Product rubric additions

Score:

- Is it useful in under 2 minutes?
- Does it prioritize practical value?
- Does it avoid hype?
- Are sources clear?
- Does it recommend what to try and what to ignore?

## Architecture notes

Good stack options:

- Start with manual link/note input
- Add web/RSS/API ingestion later
- Store source metadata
- De-duplicate stories
- Keep ranking rules explicit
- Allow user topic profile

## Suggested first current mission

Build a manual research briefing generator where the user pastes links or notes and receives a 60-second scan, use-at-work section, tool radar, one deeper dive, and try/skip actions.
