# Mobile / Web SaaS Profile

Use this profile for more general web apps, mobile apps, SaaS ideas, consumer tools, dashboards, or workflow products.

## Target user

A specific user segment with a repeated problem.

Do not use "everyone" as the target user.

## Job-to-be-done

This app is for [specific user]
who is trying to [specific job]
but keeps struggling with [specific pain],
so this app helps them [specific transformation]
better than [current workaround].

## Product wedge

This app needs one clear reason to exist that is not "it has AI" or "it is easier."

Examples:

- fastest way to do one painful thing
- best workflow for a niche user
- opinionated alternative to bloated tools
- local/private version of a cloud workflow
- better first 60 seconds than existing apps

## Enemy

- generic SaaS dashboard
- auth before value
- feature checklist thinking
- trying to serve everyone
- fake metrics
- weak onboarding
- adding settings before the core loop works

## Core loop

```text
User has a specific problem
→ app helps them complete one valuable action
→ user sees or exports the result
→ user returns when the problem repeats
```

## Magic moment

TBD per app.

The magic moment must happen before complex setup.

## Should feel like

- specific
- fast
- trustworthy
- useful quickly
- focused
- less bloated than alternatives

## Should avoid

- generic landing pages
- dashboards with fake charts
- AI wrapper vibes
- unnecessary onboarding
- teams/billing/settings before value
- "coming soon" core features

## Must support eventually

Depends on app.

Possible future items:

- auth
- storage
- sharing
- export
- notifications
- billing
- integrations
- admin

But only add these after the core loop works.

## Not building yet

- auth unless required for first value
- billing
- teams
- admin
- full settings
- analytics dashboard
- mobile app if web proves the loop first

## Great first slice

A no-auth flow where the user completes the core action and receives useful output.

## Product rubric additions

Score:

- Can the user get value before signing up?
- Is the target user specific?
- Is the core loop obvious?
- Does this avoid generic SaaS bloat?
- Would someone return for this repeated job?

## Architecture notes

Good stack options:

- Next.js / React / Vue / Svelte
- Simple API backend
- SQLite/Postgres only when persistence is needed
- Start with local/mock data if possible
- Add auth late unless required
- Add billing last

## Suggested first current mission

Build a no-auth first-run flow that lets the target user complete the core action and see a useful result.
