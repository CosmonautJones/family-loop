# Configured local family browser E2E

This runbook starts a real configured-Supabase browser journey from the smallest trusted state. The harness creates only an email-confirmed initial-owner Auth account/profile, one unconsumed private family-creation entitlement, and optionally one outsider. The browser must create the family, invitations, invitee accounts, events, RSVPs, comments, photos, and in-app updates.

The scripts refuse non-loopback Supabase URLs. They do not print service keys, passwords, access tokens, or invitation tokens. Never use these synthetic credentials outside the local stack.

## Deterministic local identities

Default run marker: `family-browser-v1`

- Owner: `browser-owner-family-browser-v1@loopedin.test`
- Optional outsider: `browser-outsider-family-browser-v1@loopedin.test`
- Browser-created invitees should use `browser-<name>-family-browser-v1@loopedin.test` so cleanup can find them.
- Local-only password for every browser account: `Local-browser-proof-42!`

Use a different lowercase marker when parallel local runs are needed. Keep it 3-40 characters using letters, numbers, and hyphens; substitute it in every browser-created email.

## Provision and verify

From the repository root with local Supabase running:

```powershell
./scripts/provision-local-supabase-browser.ps1 -RunMarker family-browser-v1 -IncludeOutsider
./scripts/provision-local-supabase-browser.ps1 -RunMarker family-browser-v1 -IncludeOutsider -VerifyOnly
```

An immediate rerun is idempotent. If the marker already owns a family or membership, provision stops and tells you to clean the completed/in-progress run instead of silently deleting browser evidence.

Start the configured web app in another terminal without displaying the local anon key:

```powershell
$values = @{}
supabase status -o env 2>$null | ForEach-Object { if ($_ -match '^([A-Z_]+)="?([^"\s]+)"?$') { $values[$matches[1]] = $matches[2] } }
$env:EXPO_PUBLIC_DATA_MODE = 'supabase'
$env:EXPO_PUBLIC_SUPABASE_URL = $values['API_URL']
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $values['ANON_KEY']
npm --prefix app run web -- --port 8081
```

Open `http://127.0.0.1:8081`. The expected state is signed out with no family. Sign in as the owner; onboarding should offer family creation because the one entitlement is ready.

## Browser-owned proof journey

Use the UI for every product mutation:

1. Sign in as the owner and create one private family.
2. Invite at least two marker-suffix invitee emails.
3. In separate signed-out/incognito sessions, create those accounts and accept their invitations.
4. Create several plans/trips, including one completed plan suitable for Memories.
5. Add distinct RSVPs and comments from multiple accounts.
6. Upload real local JPEG/PNG/WebP photos and confirm they render after reload.
7. Confirm non-actors receive the expected in-app updates and actors do not receive their own update.
8. Sign in as the outsider and confirm the family, events, media, and updates are absent.
9. Reload the owner and invitee sessions and verify the same persisted records remain.

Record browser screenshots, URLs, account/session used, actions, and visible outcomes. Do not record passwords, keys, access tokens, or invitation tokens.

## Cleanup and zero-residue assertion

Close browser sessions, then run:

```powershell
./scripts/cleanup-local-supabase-browser.ps1 -RunMarker family-browser-v1
```

Cleanup is marker-scoped. It removes exact Storage objects and media metadata associated with marked users or their groups, marker-owned groups, marker invitations, and every marker-suffix Auth account. It then asserts zero Auth users, profiles, groups, marker invitations, media rows, and Storage objects remain. Running cleanup again is safe and must still report zero residue.

To hand the browser a fresh state after cleanup:

```powershell
./scripts/provision-local-supabase-browser.ps1 -RunMarker family-browser-v1 -IncludeOutsider
```
