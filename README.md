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

### Local linting without GitHub Actions minutes

From the repository root, with Node.js and PowerShell 7 installed:

```powershell
npm run lint:workflows  # Validate every GitHub Actions workflow
npm run lint            # Workflow validation plus the app's ESLint checks
```

App linting requires its dependencies (`npm --prefix app ci`). The workflow launcher downloads the free MIT-licensed actionlint 1.7.12 once from its official release, verifies its pinned SHA-256, and caches the archive under ignored `.cache/actionlint/`. Later runs use that archive offline and verify it again before extraction. The launcher supports x64 Windows and Linux; ShellCheck/Pyflakes integration is automatic when those optional tools are installed.

The same workflow command runs inside CI's existing Security and dependencies job, without an extra job or paid lint service. Local linting consumes no GitHub Actions minutes. Hosted checks still use the account's Actions allowance and cannot run while the account is capped. Workflow linting does not replace app tests, database integration, or hosted release verification.

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
