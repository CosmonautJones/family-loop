# Run LoopedIn locally

Start with the browser-local demo to explore the product. Use the Supabase integration environment when you need to exercise real authentication, access policies, Storage, or Realtime.

## 1. Install and run

Prerequisites: repository access, Git, Node.js 22, and npm. Run these commands in PowerShell from a directory where you keep projects:

```powershell
git clone https://github.com/CosmonautJones/family-loop.git
cd family-loop
npm --prefix app ci
npm --prefix app run web
```

Open the address Expo prints. Choose a synthetic family profile to explore plans, RSVPs, conversations, and memories. No backend credentials are needed for the default mode. Fixed demo event dates may appear in history as time passes; create a new local event to try the upcoming-plan flow.

The local adapter saves data in browser storage. It survives reloads but does not synchronize between browsers or devices, and clearing site data removes it. Demo profiles do not provide real authentication.

If this checkout already has `EXPO_PUBLIC_DATA_MODE` or an `app/.env` file configured, inspect it before running: an explicit `supabase` mode connects to that backend instead of the demo.

## 2. Run the checks

From the repository root:

```powershell
npm test
npm run lint
node app/node_modules/typescript/bin/tsc --project app/tsconfig.json --noEmit
npm run check:secrets
```

`npm run lint` includes app ESLint and workflow validation. Its workflow launcher requires PowerShell 7 (`pwsh`), downloads a pinned, checksum-verified actionlint archive on first use, then reuses the verified local cache. The launcher supports x64 Windows and Linux. To run only the application linter:

```powershell
npm --prefix app run lint
```

Local checks do not consume GitHub Actions minutes. Database integration and browser acceptance are separate checks, not implied by a passing unit suite.

## 3. Exercise a local Supabase backend

Install Docker and the Supabase CLI, start Docker, and follow the [configured browser runbook](docs/runbooks/configured-local-family-browser-e2e.md). From the repository root, its principal commands are:

```powershell
supabase start
./scripts/test-local-supabase-family.ps1
./scripts/test-local-supabase-media.ps1
./scripts/provision-local-supabase-browser.ps1 -RunMarker family-browser-v1
./scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

These integration runners are intended for a disposable loopback stack. Read their setup and cleanup instructions first; do not point local test or reset tooling at a hosted family database.

For explicit development configuration, create your own ignored `app/.env` with a project you control:

```dotenv
EXPO_PUBLIC_DATA_MODE=supabase
EXPO_PUBLIC_ENVIRONMENT_ID=development
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Use only a publishable client key. Service-role keys and other secrets must never go in `EXPO_PUBLIC_*` variables or a client bundle. Hosted releases use separately validated runtime configuration; see [web release and rollback](docs/runbooks/web-release-and-rollback.md).

Public family creation also requires the forward onboarding migration, email signup enabled, and email confirmation required. Follow the [onboarding runbook](docs/runbooks/public-family-onboarding.md) before deploying that configuration.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `pwsh` is not recognized | Install PowerShell 7, or run the app-only linter while you finish setup. |
| No upcoming demo events | Demo records have fixed dates. Browse Memories or create a new local event. |
| The configured backend is unavailable | Confirm the selected data mode and project configuration. Backend failures deliberately do not fall back to demo data. |
| A photo is rejected | Choose JPEG, PNG, or WebP, at most 1 MiB, and supply the caption and image description. Automatic resizing is not implemented. |
| Shared changes do not appear on another device | Local mode is browser-local. Cross-device collaboration requires Supabase mode and membership in the same family. |

[Back to the project](README.md) · [Documentation guide](docs/README.md)
