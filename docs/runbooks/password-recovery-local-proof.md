# Local password-recovery proof

This runbook proves configured recovery against loopback Supabase Auth and Mailpit. It never targets a hosted project, never prints token-bearing links, and creates one dedicated synthetic account that is deleted in `finally`.

## Preconditions

- Local Supabase is running and `npx supabase status -o env` succeeds.
- App dependencies are installed.
- Chrome is installed at the default Windows path or `CHROME_PATH` names it.
- The configured app export is served on the loopback origin named by `RECOVERY_APP_ORIGIN` (the browser harness defaults to `http://127.0.0.1:8086`).

Load `API_URL`, `ANON_KEY`, `PUBLISHABLE_KEY`, `SERVICE_ROLE_KEY`, and `INBUCKET_URL` from `supabase status` into process environment variables without echoing them. Build with `EXPO_PUBLIC_DATA_MODE=supabase`, the loopback `API_URL`, and the local `PUBLISHABLE_KEY`; do not allow dotenv to select a hosted endpoint.

## Service lifecycle

Run:

```powershell
node tests/supabase-password-recovery-e2e.mjs
```

The script requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `INBUCKET_URL`. It proves equal known/unknown request status/body, known-only local mail, approved recovery redirect, password replacement, old-password rejection, new-password sign-in, replay denial, malformed-link denial, and cleanup. Output contains only the verdict.

## Configured browser lifecycle

Serve the configured static export, then run:

```powershell
node tests/browser-password-recovery-smoke.mjs
```

This dependency-free harness starts an isolated headless Chrome profile at 390×844, requests recovery through the rendered UI, privately reads the local Mailpit link, and transfers the provider fragment to the configured app origin. The transfer is necessary on this workstation because the exact approved local Auth callback port 3000 is occupied by an unrelated process; the separate service lifecycle proves the exact callback itself.

The browser gate checks neutral copy, no overflow, one primary heading, 52px inputs/actions, password-manager metadata, mismatch validation, successful replacement, old/new sign-in, authenticated reload, replay/invalid recovery, and connection-specific offline copy. It does not log the URL fragment. Its `finally` block deletes the synthetic Auth user and Mailpit message, closes Chrome, and removes its temporary profile.

## Cleanup audit

After either run, use the local Auth admin endpoint and Mailpit message list to count addresses matching the synthetic `recovery-*` or `browser-recovery-*` test domains. Both counts must be zero. Re-run `scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1`; it is read-only and must retain the populated family counts.

## External gates

This proof does not certify production email delivery/templates, hosted redirect allowlists, hosted provider throttling, physical iOS Safari/Android Chrome, password-manager products, VoiceOver/TalkBack, or moderated older-adult use.
