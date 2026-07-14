# LoopedIn

A mobile-first web repo for a private, event-centered social app for families and friend groups.

## Purpose
This repository contains the product research and design artifacts plus a working Expo/React Native Web implementation of **LoopedIn** — a private, event-centered family app with authenticated family membership, trips, RSVPs, event comments, private photos, in-app updates, and derived memories.

The main product surface is the responsive web app in `app/`, optimized for iOS Safari and Android Chrome phone browsers with usable desktop web. Native apps and app-store delivery are future work unless separately authorized.

## Artifacts
- `docs/01-executive-summary.md`
- `docs/02-market-research.md`
- `docs/03-product-proposal.md`
- `docs/04-spec-roadmap.md`
- `docs/05-visual-direction.md`
- `docs/06-wireframe.html`
- `docs/07-product-prototype.html`
- `docs/08-brand-package.md`
- `docs/09-landing-page.html`
- `docs/10-loop-architecture-and-workflow.md`

## Developer quick start
### Repo docs and checks
```bash
npm test
```

### Preview concept docs locally
```bash
npm run preview:prototype
```

### Run the responsive web app
```bash
cd app
npm install
npm run web
```

The default data mode is reload-durable local browser storage. A configured Supabase mode is also implemented. The repository's loopback-only proof uses the local Supabase CLI stack and the scripts below; it never targets a hosted project:

```powershell
supabase start
./scripts/test-local-supabase-family.ps1
./scripts/test-local-supabase-media.ps1
./scripts/provision-local-supabase-browser.ps1 -RunMarker family-browser-v1
./scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

See `docs/runbooks/configured-local-family-browser-e2e.md` for the synthetic-account browser procedure and cleanup. Hosted deployment, production email/recovery, backup/restore, physical iOS/Android, VoiceOver/TalkBack, practical 200% zoom, reduced motion, and moderated older-adult testing are not proven.

See `docs/10-loop-architecture-and-workflow.md` for the originally proposed app structure, screen model, sample data strategy, and agent/subagent contribution workflow. The current platform stance is defined in `docs/vision.md` and `docs/architecture.md`.

## Concept summary
LoopedIn blends:
- a shared private calendar
- group chat and event conversation
- photo/memory sharing
- reminders and tagging
- premium motion, transitions, and modern touch-first web interactions

The goal is to create a product people actually use every day because it is both emotionally resonant and deeply practical.
