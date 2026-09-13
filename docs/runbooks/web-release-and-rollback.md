# Web release and rollback

This runbook defines the repository-local release controls and records their hosted staging application. It creates immutable Expo web artifacts from exact Git commits, promotes them through a digest-addressed local release store, serves host-neutral security/cache/SPA behavior on loopback, and rehearses rollback. The dated staging checkpoint below records separately authorized Netlify/Supabase work; production/custom-domain work is not inferred.

CI now defines one exact-event-head artifact build/upload, and repository tooling can assemble those verified bytes into a target-neutral Netlify static publish envelope. The envelope path remains local/provider-neutral: no project is linked, no Function exists, and no deploy command or credential is used.

## Release model

Each artifact contains the Expo static export and `release-manifest.json`. The manifest has no wall-clock build time or environment identifier. It records the app version, exact 40-character source commit, commit epoch, runtime data mode, sorted file sizes and SHA-256 values, and a canonical artifact SHA-256. Environment IDs, backend URLs, and public keys live only in the external overlay and cannot change the artifact digest.

The build operates on `git archive` output for the requested commit, runs `npm ci`, sets `EXPO_NO_DOTENV=1` and `EXPO_PUBLIC_DATA_MODE=runtime`, removes all supported Supabase public variables from the child environment, and refuses non-example tracked `.env*` files. This rehearsal therefore cannot consume the repository's ignored `.env.local` or bake an environment endpoint/key into the artifact.

Before `App` renders or a service/client is created, the web root fetches `/runtime-config.json` with `no-store` and validates its exact schema. `local` accepts no backend fields. `supabase` requires an HTTPS URL (HTTP only for loopback) and a publishable/anonymous key; unknown fields, unsafe IDs/URLs, and secret/service-role-looking keys fail closed to an accessible unavailable state. The config is never logged. Native and local development retain their explicit compile-environment path.

The loopback server and Netlify envelope import the same dependency-free `web-release-policy.mjs`, so runtime validation and derived CSP cannot silently diverge. The envelope verifier separately checks the release manifest, sorted paths, byte counts, file hashes, canonical artifact digest, unsupported filesystem entries, public overlay, generated `_headers`/`_redirects` policy, and the overlay/policy digests before promotion.

## Build and verify

Use a clean, reviewed source commit. Build once; environments do not belong in this command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-web-release.ps1 `
  -OutputPath .codex/opord16/candidate `
  -SourceRevision <commit>
```

Scan the result for any known environment endpoint/project identifier without printing keys. Artifacts and overlays are disposable/ignored; tracked evidence records only non-secret IDs, commit, and digest.

## Static Netlify publish envelope (no deployment)

Download the CI artifact without rebuilding it, prepare one reviewed public `runtime-config.json`, then run:

```powershell
node scripts/build-netlify-deployment-envelope.mjs --artifact <downloaded-artifact> --runtime-config <reviewed-runtime-config> --output <new-empty-envelope-path> --expected-artifact-sha256 <trusted-ci-output> --expected-source-commit <trusted-ci-output>
node scripts/verify-netlify-deployment-envelope.mjs --envelope <new-envelope-path> --expected-artifact-sha256 <trusted-ci-output> --expected-source-commit <trusted-ci-output>
```

Take both expected values from the successful CI job/run, not from the downloaded manifest. The output contains the original artifact and release manifest, canonical public runtime config, synchronized `_headers` and `_redirects`, and `deployment-envelope.json` with source commit plus artifact/config/policy digests. `_headers` supplies the release/environment/security headers, browser and Netlify-CDN `no-store` runtime config, exact manifest-listed immutable content-addressed assets, and no-cache shell/manifests. LoopedIn routes use URL fragments, so `_redirects` intentionally has no catch-all rewrite: `/#/event/...` reloads `index.html` at `/`, while missing scripts, JSON, images, and static resources remain 404 rather than being masked by HTML.

The envelope is target-neutral: there is no team/site ID, Function, install/build command, provider token, or deployment action. Before an authorized upload, the release owner must create or name a dedicated LoopedIn staging site and upload the verified envelope directory directly as the publish directory without rebuilding it. Never link, relink, rename, or deploy over the existing personal-site project `travisjohnjones`. Stop if provider settings would run a build, alter the generated files, or add Functions/Edge Functions.

Changing runtime config or CSP creates a new envelope even when the application artifact digest is unchanged. A future authorized staging job must verify the envelope, deploy those exact files, and record the resulting deployment identity; it must not run the application build again.

Create two untracked public overlays. The key shown below is a placeholder, never a secret or service-role key:

```json
{"schemaVersion":1,"environmentId":"local-demo","dataMode":"local"}
```

```json
{"schemaVersion":1,"environmentId":"staging","dataMode":"supabase","supabaseUrl":"https://project.example.supabase.co","supabasePublishableKey":"sb_publishable_REPLACE_FROM_APPROVED_SOURCE"}
```

## Local promotion and rollback rehearsal

Build a baseline from the prior known-good commit and a candidate from the reviewed commit. They must have different artifact digests.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rehearse-web-release.ps1 `
  -BaselineArtifact .codex/opord16/baseline `
  -CandidateArtifact .codex/opord16/candidate `
  -WorkPath .codex/opord16/rehearsal `
  -PrimaryRuntimeConfig .codex/opord16/local.json `
  -SecondaryRuntimeConfig .codex/opord16/staging.json `
  -Port 8087
```

The rehearsal verifies both manifests before copying them into `releases/<artifact-sha256>`, atomically moves the `stable` alias, opens an isolated Chrome profile, checks 320/390/430/1280 widths, reduced motion, sequential navigation, one main landmark, 200% page-scale proxy, Create validation focus, exact-event deep link, browser Back, and reload, then restores the baseline alias. It also verifies:

- non-asset and SPA-fallback responses use `Cache-Control: no-cache`;
- content-addressed Expo assets use `public, max-age=31536000, immutable`;
- a hashed asset path never changes bytes across the two artifacts;
- CSP, frame, MIME-sniffing, referrer, permissions, and opener policies are consistent across promotion and rollback;
- `X-LoopedIn-Release` changes to the candidate and returns to the baseline;
- `runtime-config.json` is external to the digest and always `no-store`;
- `X-LoopedIn-Environment` and CSP follow the validated overlay while release bytes stay fixed;
- a rejected service-role-looking overlay exposes no environment/backend and renders the accessible unavailable state;
- rollback restores both the baseline artifact and primary overlay.

Rollback changes only the frontend alias. Database migrations remain forward-only; never run a destructive down migration as part of frontend rollback.

## Host policy to implement before staging

The loopback server is an executable policy reference, not production hosting configuration. A named host owner must translate and verify these rules:

| Surface | Required policy |
|---|---|
| TLS | HTTPS only; valid chain/name/renewal; redirect HTTP; add HSTS only after HTTPS and subdomain ownership are proven. |
| CSP | Derive `connect-src` only from the validated exact runtime backend origin and its WebSocket equivalent. `img-src` intentionally retains broad `https:` for user-entered attributed HTTPS media; adding the validated backend origin is materially restrictive only for loopback HTTP and is otherwise redundant with `https:`. Never add a wildcard or an unrelated HTTP origin. |
| Runtime config | Serve `/runtime-config.json` outside the immutable artifact with `no-store`; protect changes with the same review/approval as promotion. It contains public client configuration only. |
| HTML/manifest | `no-cache` so aliases and entrypoints revalidate after promotion or rollback. |
| Hashed JS/fonts/assets | One year plus `immutable`; filenames must be content addressed. |
| SPA routing | LoopedIn uses fragment routes, so `/#/...` requests the no-cache root shell and reloads without a rewrite. Do not add a catch-all; unknown paths and missing assets must stay 404. |
| Promotion | One reviewed digest is promoted unchanged; a named human records environment, operator, source commit, release ID, digest, approval, and timestamp. |
| Rollback | A named release authority swaps the alias to the last compatible digest; validate core loop and cache behavior; keep database recovery forward-only. |

Before any hosted action, name dev/staging/production identifiers, host/DNS/TLS owners, secret custodian, Supabase project per environment, release operator, rollback authority, maintenance window, observability destination, and frontend/backend compatibility rule. Obtain separate authorization for staging mutation and another manual approval for production.

## Remaining external gates

- Required-check enforcement and seeded hosted CI failures; clean hosted CI and exact artifact upload already pass for the candidate.
- Production/custom-domain alias, DNS ownership, named long-term release/rollback operators, and maintenance window.
- Real-account configured core loop, monitoring, custom mail/invitation delivery, and hosted backups/restore.
- Physical iOS Safari and Android Chrome, VoiceOver/TalkBack, practical 200% zoom, and moderated older-adult use.

No production approval is implied by the local rehearsal.

## 2026-07-14 Netlify draft transport evidence

- Dedicated site `loopedin-family` has ID `50ae6d6b-28ad-49c0-9654-c3a54899fcb5`. Draft deploy `6a56f0408614647fe35cf968` serves only at `https://6a56f0408614647fe35cf968--loopedin-family.netlify.app`; the production alias, custom domain, and Git link are absent.

## 2026-07-15 hosted staging and rollback evidence

- Exact-head run `29451842237` produced source `3cf45367dc858e5c58bf8b72ae28e263b310c6b4`, release `0.1.0-3cf45367dc85`, and artifact digest `7a18b2f52097697de2b25edd6b49a6454626a1375502637504539e9919fc3c8c`. The downloaded artifact and deployment envelope reverified before upload.
- Immutable deploy `6a57fc726b558b21faf57459` is published at `https://loopedin-family.netlify.app` with external `loopedin-staging` Supabase config, exact-origin CSP, runtime `no-store`, immutable hashed assets, and no Netlify build/Function/Edge Function/Git link.
- Rollback restored prior fixed deploy `6a57f034c398b8ce7dbe3fc8` and release `0.1.0-e52be53165a5`, then restored `6a57fc726b558b21faf57459` and release `0.1.0-3cf45367dc85`; HTTP 200 was verified after each alias change and no database reversal occurred.
- Custom domain, production, real-account completion, telemetry, custom mail, backup/restore, and physical-device evidence remain open. The personal site was not changed.
- The draft used exact source `5b957c51ddf127b30e6515c8b3d44fa20e46e1ce` and artifact `a6b6b282affa349de88ef25916577ea2c41de62da2b4c7433eec4e6a6eabb0a3` without a provider rebuild.
- HTTPS, root shell, runtime config, browser/CDN `no-store`, exact configured-origin CSP, manifest-verified immutable hashed asset, missing-asset 404, release/environment headers, fragment-route reload, and signed-out Chrome console/network checks passed.
- This is transport-only evidence. The draft did not prove hosted Supabase migrations, authenticated backend compatibility, family/trip/comment/photo/reminder/realtime/recovery flows, mail, backups/restore, telemetry, staging rollback, physical devices/assistive technology, production publication, or custom-domain behavior.
- Protected personal site `travisjohnjones` retained exact ID `519f3aa3-c723-4b2a-b9dd-4761e7b0a8bf` and was unchanged.

## 2026-07-16 hosted staging and rollback evidence

- Source `08006e5e83a8dd85cfeb30f6fb26f8df103fa619` produced release `0.1.0-08006e5e83a8` and immutable app digest `e41dd1727d11888e0259a97c442f13e815243472dfcd437334c00c53b9ee0d38`. The runtime overlay/CSP remained a separate environment-specific envelope, per advisor review.
- Verified deploy `6a58428caebae3fadaf3906b` is published at `https://loopedin-family.netlify.app`. Dedicated staging uses seven migrations through `20260716002122`; release/backend compatibility, final availability run `29466990331`, and final synthetic run `qa-mrmw9a6b-dcce7de2` are GREEN.
- Rollback selected prior deploy `6a583390d6997d709c864c56` and returned HTTP 200. Restoration selected candidate deploy `6a58428caebae3fadaf3906b` and returned HTTP 200. The database remained forward-only; no migration reversal was attempted.
- Hosted signed-out views at exact 320, 390, and 430 CSS-pixel widths were observed. Local native browser-zoom evidence remains dated local evidence; native hosted 200% zoom, physical iPhone/Android, VoiceOver/TalkBack, physical keyboard, and moderated checks are not complete.
- Production/custom domain remains gated by a separate isolated production Supabase project and redirect configuration, exact-artifact approval, real SMTP/password completion, approved family recipients, physical-device checks, and explicit production authorization. The personal Netlify site remains outside scope.

### Lifecycle candidate supersession

Exact CI artifact source `a45838479634e61aedec0ceb210f79b21f58d225`, release `0.1.0-a45838479634`, and application digest `aceefccf1a794f93fc145cb412db20ccf0d92c51a6a8b87549679e81065f95e6` were assembled with the reviewed staging overlay and uploaded without a Netlify rebuild. Deploy `6a5863f6aebae3714ef3906c` is the current staging alias.

Rollback selected `6a58428caebae3fadaf3906b`/`0.1.0-08006e5e83a8`, then restoration selected `6a5863f6aebae3714ef3906c`/`0.1.0-a45838479634`; HTTPS and availability passed after restoration and no database reversal occurred.

### Invitation-mail release supersession

Exact main source `2721a98ce6fc03a1263ebc5284d90ac936d2e571`, release `0.1.0-2721a98ce6fc`, and application digest `3794214c24c33c82961fd9c96a66c9bf2fc9809e366bfb03f4ce31c138a4779a` were downloaded from GREEN CI run `29518737936`, wrapped with the unchanged staging overlay, and verified before upload. Immutable deploy `6a591b138c9727a4b2ca6d48` was initially published unchanged to `https://loopedin-family.netlify.app` at `2026-07-16T18:19:21.898Z`. Exact rollback selected `6a58e22e48d42235e0ea40e0` and verified release `0.1.0-ce4b0c56d30b`; restoration selected `6a591b138c9727a4b2ca6d48` at `2026-07-16T18:55:26.407Z` and verified `0.1.0-2721a98ce6fc`/`loopedin-staging`. The database remained forward-only, and the personal site, custom domain, Git link, production backend, and production alias were unchanged.

## 2026-07-14 runtime-config evidence

- Exact source `522aed7217ea` produced release `0.1.0-522aed7217ea`: three files, one 986,099-byte JavaScript bundle, digest `12925c40f8068afbaa58b3dd5a7b132ed405e9e510adc90310945e72ca27f38d`.
- The artifact contains neither the loopback endpoint/publishable key nor the previously configured hosted project identifier.
- The same candidate passed `runtime-local-demo` and `runtime-loopback-supabase` overlays. The latter targets the same local Supabase stack used by the retained configured scenario; this proves target switching, not two independent database instances or hosted compatibility.
- Local mode passed 320/390/430/1280 widths, landmarks/tabs, reduced motion, sequential focus, 200% scale proxy, exact-event deep link, Back/reload, and invalid-form focus. The loopback-Supabase overlay rendered its correct environment and configured sign-in state.
- An invalid service-role-looking overlay returned 503/no-store, omitted environment/backend CSP, and rendered `LoopedIn is unavailable`. Baseline/local artifact+config rollback passed.
- Retained performance budgets still pass under the approved profile: LCP 3,252/2,712/2,668 ms; longest tasks 178/115/94 ms; exact-event route 648 ms; width 390/390; backend requests zero.

## 2026-07-14 local evidence

- Candidate source: `3cec45bf861d228d701722ff4998cbb077e2083f` (`0.1.0-3cec45bf861d-local-rehearsal`). Two independent `npm ci` plus Expo exports each produced 22 identical files and the byte-identical canonical digest `ef793a72101bb80a5c8f6fe40bd6425fcec7630e04fd1b32c1e25ea4b11117dd`.
- Baseline source: `74e7e2b05b9695b839e82f3b2b102ddef88c0a7d` (`0.1.0-74e7e2b05b96-local-rehearsal`), digest `e9cec97ac684069c1b8b3c8cb9493b5c185dfac0d64429bcdcba3a53f8b8493d`. Its JS bundle has a different content-addressed filename from the candidate.
- Rehearsal: baseline → candidate → baseline passed manifest verification, atomic alias changes, extensionless deep-link fallback, CSP/security headers, revalidated entrypoints, immutable hashed assets, and security-policy consistency after rollback.
- Promoted-candidate Chrome: 320/390/430/1280 had exact document widths, one main, five tabs, and one selected tab. Reduced motion, sequential focus, 200% page-scale proxy, exact-event route, Back, hard reload, and reduced-height invalid-form focus all passed.
- Isolation: the build used durable-local mode from a Git archive with dotenv disabled. No hosted endpoint, database, Auth account, Storage object, DNS, TLS, or deployment was accessed or changed. The populated loopback Supabase scenario was preserved.


## Authorized local staging release alternative — 2026-09-13

The owner approved this alternative when GitHub runners cannot start. For the frontend-only LoopedIn staging fixes in PR #19, the existing exact-source builder may run locally instead of obtaining a CI artifact. This supersedes CI-origin requirements for that scoped release; it does not weaken source/hash verification or imply production/backend authorization.

1. Resolve and verify the exact remote commit and clean source tree. Run repository tests (including `test:simulation`), app lint/type checks, workflow lint, harness, secret scan, dependency audit at the existing high threshold, and migration checksum validation. Record unavailable platform/backend checks and all findings honestly.
2. Run the unchanged `scripts/build-web-release.ps1 -SourceRevision <exact-commit> -OutputPath <new-artifact-directory>` with PowerShell 7. It uses a source archive, clean lockfile installation, and external runtime configuration. Record Node/npm/PowerShell versions, the builder's source identity, and its emitted artifact digest as trusted local build output.
3. Build and verify the existing Netlify deployment envelope against that source/digest and the reviewed public staging overlay. Preserve the verified package unchanged; do not rebuild in the provider. Keep the last known published deploy ID for rollback.
4. Directly upload the envelope to site `50ae6d6b-28ad-49c0-9654-c3a54899fcb5` only. When direct-upload CLI authentication is available, use `netlify deploy --dir <envelope> --site 50ae6d6b-28ad-49c0-9654-c3a54899fcb5 --no-build` for a preview and, after verification, add `--prod` to update the staging site's published alias. Here `--prod` names Netlify's alias context, not a separate application production environment. Do not use a connector that rebuilds source to represent an unchanged-artifact promotion.
5. Verify the deployed release manifest/source/digest, all manifest-listed bytes, exact staging runtime backend, security/cache headers, missing-asset 404, and the hosted family flow. Record actual pass/fail/not-run results and deployment identity in the repository. A local PASS is not a hosted PASS.

This exception introduces no recurring Actions schedule and does not authorize disabling checks globally. [The local candidate evidence](../evidence/2026-09-13-local-release/README.md) records the prepared package and outstanding hosted gates.
