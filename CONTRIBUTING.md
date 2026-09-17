# Contributing to LoopedIn

LoopedIn is a focused family coordination app. Changes should help people plan, attend, discuss, or remember an event.

## Before changing code

Read the [vision](docs/vision.md), [core loop](docs/core-loop.md), [architecture](docs/architecture.md), and repository [agent instructions](AGENTS.md). Use [Getting Started](GETTING_STARTED.md) for the local environment. Keep fixes narrow and preserve unrelated work.

## A useful change includes

- A clear user problem and the resulting behavior.
- Appropriate regression coverage for a behavioral change.
- Relevant local checks and an honest account of what was not tested.
- Documentation updates when setup, behavior, or operating assumptions change.

For interface changes, inspect a phone-sized browser view as well as desktop. Use synthetic records in screenshots. Do not include real family messages, invitations, email addresses, or photos in issues or commits.

For database changes, add a forward migration; do not rewrite historical migrations. Respect the separation between disposable local fixtures and hosted family data. Read the applicable runbook before running integration or operations tooling.

## Validation

```powershell
npm test
npm run lint
node app/node_modules/typescript/bin/tsc --project app/tsconfig.json --noEmit
npm run check:secrets
git diff --check
```

Record the checks you actually ran in the pull request. Local results, hosted CI, deployment, and live acceptance are different evidence; do not use one as proof of another. GitHub Actions is currently deferred, so local verification is the active development path.

## Reporting a problem

Include the screen, steps, expected and actual behavior, browser/device, and any visible error text. For photos, include file format and size. Remove personal content and credentials from screenshots. Never include passwords, access tokens, confirmation/recovery links, or private invitation URLs.
