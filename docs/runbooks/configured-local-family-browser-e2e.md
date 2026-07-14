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

## Recorded proof — 2026-07-14

This journey was completed against the loopback Supabase stack with `EXPO_PUBLIC_DATA_MODE=supabase`. It was not a mock-adapter run and did not touch a hosted project.

### Family and account lifecycle

- The entitled initial owner signed in and created **Jones Family** through the no-family onboarding UI.
- The owner created two invitation links. Maya and Jordan opened them in isolated browser contexts, created invitation-bound accounts with the exact invited emails, accepted, and joined the same family.
- The final family had exactly three members: one owner and two members. A separate authenticated outsider remained in the no-family state.
- Owner-only invite, revoke, remove, and ownership controls were present for the owner. Maya saw member-safe controls, including Leave family, without owner administration actions.
- The outsider saw no Jones Family content. Direct navigation to a Jones event URL still rendered no-family onboarding rather than event data.
- Owner and member hard reloads preserved their independent authenticated sessions, active family, and shared records. A real-browser defect that left Home waiting during the active-family transition was reproduced and corrected in `89d8720`; a focused two-case regression plus the full suites passed afterward.

### Shared family scenario

- Three plans were created through the UI: future **Door County Cabin Weekend**, future **Yellowstone Road Trip**, and completed **Lake Geneva Family Reunion**.
- Avery, Maya, and Jordan submitted distinct Going/Maybe responses and event-scoped comments. Reloaded Event Detail, Home, Calendar, and Memories views retained the same records and identities.
- Three private photos were shared on the completed Lake Geneva event and rendered from signed access after reload. Two used Unsplash source links with creator attribution; the third exercised actual browser file selection and upload with the caption `Sunset from the porch` and descriptive alt text.
- The completed Lake Geneva event appeared in Memories with its shared photos and comments. Photo deletion controls remained uploader/owner scoped: members did not receive another member's delete action, while the owner could manage family media.
- Database-generated in-app updates appeared only for other current family members. The owner observed 14 unread updates after the shared activity, used **Mark all read**, and the unread state cleared. Invitees also received their own recipient-scoped counts; actors did not receive their own generated update.
- Browser Back from an exact event returned to Home, and repeated reloads preserved plans, RSVPs, comments, photos, notifications, and the active family.

### Mobile-web and quality evidence

- Exact 320, 390, and 430 CSS-pixel viewport checks found no document-width overflow. The 320 checks found one main landmark, one primary heading, and no visible actionable control below 48×48 CSS pixels.
- Screenshots at those widths showed readable cards, intact fixed five-tab navigation, and no horizontal clipping. Evidence files are kept in the ignored local `.codex/evidence/configured-browser/` directory rather than committed as product assets.
- A mobile Lighthouse snapshot of authenticated Home scored **100 Accessibility** and **100 Best Practices**. SEO scored 67 and agentic browsing scored 50; those secondary scores are not represented as passes.
- The browser console had no application errors. The only observed message was the existing React Native Web shadow-style deprecation warning.

### Evidence boundary

This proves the configured app against local Supabase Auth, Postgres/RLS, and private Storage with multiple real browser sessions. It does **not** prove a hosted deployment, hosted-project migration/backup/restore, production email delivery, physical iOS Safari or Android Chrome, VoiceOver/TalkBack, moderated older-adult use, or practical browser 200% zoom. Those checks remain `NOT RUN` pending the appropriate environment, authorization, devices, or participants.

## Read-only integrity verification

Before cleanup, verify the canonical populated scenario without changing it:

```powershell
./scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

The verifier hard-refuses non-loopback Supabase and opens a read-only SQL transaction. It checks the four synthetic identities, three-member Jones Family, three trips, multi-user comments and RSVPs, three active photos, generated notifications, private Storage-object ownership/path parity, and zero outsider-associated family data. This proves database associations; the separate lifecycle and media E2E suites remain the authority for RLS denial behavior.

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
