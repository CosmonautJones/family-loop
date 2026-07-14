# Web release and rollback

This runbook proves the repository-local part of OPORD 016. It creates immutable Expo web artifacts from exact Git commits, promotes them through a digest-addressed local release store, serves host-neutral security/cache/SPA behavior on loopback, and rehearses rollback. It does not deploy, configure DNS/TLS, touch hosted Supabase, or claim staging/production evidence.

## Release model

Each artifact contains the Expo static export and `release-manifest.json`. The manifest has no wall-clock build time. It records the app version, environment identifier, exact 40-character source commit, commit epoch, local data mode, sorted file sizes and SHA-256 values, and a canonical artifact SHA-256. Rebuilding the same commit for the same environment must produce the same manifest and digest.

The build operates on `git archive` output for the requested commit, runs `npm ci`, sets `EXPO_NO_DOTENV=1` and `EXPO_PUBLIC_DATA_MODE=local`, removes all supported Supabase public variables from the child environment, and refuses non-example tracked `.env*` files. This rehearsal therefore cannot consume the repository's ignored `.env.local` and cannot contact a hosted backend. Public Supabase SDK example domains can exist inside dependency code; their presence is not evidence of configured backend access.

The current Supabase client configuration is compiled into Expo public variables. A real dev/staging/production release cannot honestly promote one identical artifact across distinct backend endpoints until either the host injects a narrowly validated runtime config or those environments deliberately share a backend (which is forbidden by the separation policy). Do not work around this by rebuilding an artifact under the same release ID.

## Build and verify

Use a clean, reviewed source commit and an environment identifier that names the artifact's intended scope:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-web-release.ps1 `
  -EnvironmentId local-rehearsal `
  -OutputPath .codex/opord16/build-a `
  -SourceRevision <commit>

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-web-release.ps1 `
  -EnvironmentId local-rehearsal `
  -OutputPath .codex/opord16/build-b `
  -SourceRevision <same-commit>

Compare-Object `
  (Get-Content -Raw .codex/opord16/build-a/release-manifest.json) `
  (Get-Content -Raw .codex/opord16/build-b/release-manifest.json)
```

`Compare-Object` must return no difference. Artifacts are disposable/ignored; release evidence records only non-secret IDs, commit, and digest.

## Local promotion and rollback rehearsal

Build a baseline from the prior known-good commit and a candidate from the reviewed commit. They must have different artifact digests.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rehearse-web-release.ps1 `
  -BaselineArtifact .codex/opord16/baseline `
  -CandidateArtifact .codex/opord16/candidate `
  -WorkPath .codex/opord16/rehearsal `
  -Port 8087
```

The rehearsal verifies both manifests before copying them into `releases/<artifact-sha256>`, atomically moves the `stable` alias, opens an isolated Chrome profile, checks 320/390/430/1280 widths, reduced motion, sequential navigation, one main landmark, 200% page-scale proxy, Create validation focus, exact-event deep link, browser Back, and reload, then restores the baseline alias. It also verifies:

- non-asset and SPA-fallback responses use `Cache-Control: no-cache`;
- content-addressed Expo assets use `public, max-age=31536000, immutable`;
- a hashed asset path never changes bytes across the two artifacts;
- CSP, frame, MIME-sniffing, referrer, permissions, and opener policies are consistent across promotion and rollback;
- `X-LoopedIn-Release` changes to the candidate and returns to the baseline.

Rollback changes only the frontend alias. Database migrations remain forward-only; never run a destructive down migration as part of frontend rollback.

## Host policy to implement before staging

The loopback server is an executable policy reference, not production hosting configuration. A named host owner must translate and verify these rules:

| Surface | Required policy |
|---|---|
| TLS | HTTPS only; valid chain/name/renewal; redirect HTTP; add HSTS only after HTTPS and subdomain ownership are proven. |
| CSP | Start from the local policy. Add only the exact staged API/Storage origins to `connect-src` and required image origins to `img-src`; never use a wildcard for backend access. |
| HTML/manifest | `no-cache` so aliases and entrypoints revalidate after promotion or rollback. |
| Hashed JS/fonts/assets | One year plus `immutable`; filenames must be content addressed. |
| SPA fallback | Extensionless routes return `index.html`; missing files with extensions stay 404. Hash deep links remain supported. |
| Promotion | One reviewed digest is promoted unchanged; a named human records environment, operator, source commit, release ID, digest, approval, and timestamp. |
| Rollback | A named release authority swaps the alias to the last compatible digest; validate core loop and cache behavior; keep database recovery forward-only. |

Before any hosted action, name dev/staging/production identifiers, host/DNS/TLS owners, secret custodian, Supabase project per environment, release operator, rollback authority, maintenance window, observability destination, and frontend/backend compatibility rule. Obtain separate authorization for staging mutation and another manual approval for production.

## Remaining external gates

- GitHub-hosted green required checks tied to the candidate commit.
- A runtime configuration decision that permits the same immutable artifact across isolated backend environments.
- Named host, staging/production endpoints, DNS/TLS ownership, secret custody, release/rollback operators, and maintenance window.
- Hosted header/TLS/cache/SPA verification, configured backend compatibility, monitoring, and a real staging promotion/rollback.
- Physical iOS Safari and Android Chrome, VoiceOver/TalkBack, practical 200% zoom, and moderated older-adult use.

No production approval is implied by the local rehearsal.

## 2026-07-14 local evidence

- Candidate source: `3cec45bf861d228d701722ff4998cbb077e2083f` (`0.1.0-3cec45bf861d-local-rehearsal`). Two independent `npm ci` plus Expo exports each produced 22 identical files and the byte-identical canonical digest `ef793a72101bb80a5c8f6fe40bd6425fcec7630e04fd1b32c1e25ea4b11117dd`.
- Baseline source: `74e7e2b05b9695b839e82f3b2b102ddef88c0a7d` (`0.1.0-74e7e2b05b96-local-rehearsal`), digest `e9cec97ac684069c1b8b3c8cb9493b5c185dfac0d64429bcdcba3a53f8b8493d`. Its JS bundle has a different content-addressed filename from the candidate.
- Rehearsal: baseline → candidate → baseline passed manifest verification, atomic alias changes, extensionless deep-link fallback, CSP/security headers, revalidated entrypoints, immutable hashed assets, and security-policy consistency after rollback.
- Promoted-candidate Chrome: 320/390/430/1280 had exact document widths, one main, five tabs, and one selected tab. Reduced motion, sequential focus, 200% page-scale proxy, exact-event route, Back, hard reload, and reduced-height invalid-form focus all passed.
- Isolation: the build used durable-local mode from a Git archive with dotenv disabled. No hosted endpoint, database, Auth account, Storage object, DNS, TLS, or deployment was accessed or changed. The populated loopback Supabase scenario was preserved.
