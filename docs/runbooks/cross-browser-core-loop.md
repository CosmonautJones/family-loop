# Cross-browser configured core loop

This proof runs the same read-only configured family journey in installed Microsoft Edge and stock Mozilla Firefox. Edge uses its native DevTools endpoint; Firefox uses its native WebDriver BiDi endpoint. No Playwright browser download, driver, dependency, remote deployment, or Supabase mutation is required.

## Boundary

- Build and promote an exact clean commit with `scripts/build-web-release.ps1` and `scripts/promote-web-release.ps1`.
- Serve that immutable artifact with a separate ignored runtime overlay targeting only loopback Supabase.
- Use the retained `family-browser-v1` owner, member, and outsider identities. The harness signs in and reads; it does not change RSVPs, comments, photos, reminders, invitations, notifications, or membership.
- Browser evidence JSON and screenshots belong under ignored `.codex/evidence/cross-browser/`. Failure URLs and console URLs are reduced to origin plus pathname before they can enter evidence or assertion output.
- Run the retained verifier before and after. Its exact counts must not change.

## Run

The runtime overlay contains only public client configuration and must never contain a service-role or secret key. Do not commit it or print its key.

```powershell
$env:LOOPEDIN_LOCAL_PASSWORD = 'Local-browser-proof-42!'
$env:LOOPEDIN_BACKEND_URL = 'http://127.0.0.1:54321'
$env:LOOPEDIN_RUN_MARKER = 'family-browser-v1'

node scripts/check-cross-browser-core-loop.mjs edge `
  http://127.0.0.1:8091 .codex/evidence/cross-browser/edge

node scripts/check-cross-browser-core-loop.mjs firefox `
  http://127.0.0.1:8091 .codex/evidence/cross-browser/firefox

.\scripts\verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

The harness defaults to these installed paths and accepts `EDGE_PATH` or `FIREFOX_PATH` overrides:

- `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- `C:\Program Files\Mozilla Firefox\firefox.exe`

## Acceptance matrix

Each browser must pass:

- signed-out authentication validation, focused error relationship, and password-recovery entry;
- owner session restore, Today updates, Calendar, exact Event Detail RSVP/thread/gallery/reminder/edit access, Memories with a completed private signed image, Family invite/export controls, Back, deep link, and reload;
- member Today, role-safe Family controls, and an event where RSVP/thread/reminder remain available but another creator's edit control does not;
- outsider no-family state and denial on the retained exact event route;
- 390px role matrices and a 430px owner regression with no horizontal overflow, no clipped controls, controls at least 48px in both dimensions, and exactly five tabs/one selected tab/one main landmark wherever the authenticated shell is present;
- zero console warnings/errors, failed requests, or app/backend HTTP errors.

Screenshots are a browser-specific regression comparison, not formal visual or accessibility certification. Physical iOS Safari, Android Chrome, VoiceOver/TalkBack, physical software keyboards, and moderated older-adult use remain separate gates.

## Exact evidence — 2026-07-14

- Source commit: `31c74466e6faba2e9824cc5c7046c2fbfad5c269`
- Artifact release: `0.1.0-31c74466e6fa`
- Artifact SHA-256: `a8c41774b3cb4bbedc8cc53eb14af95a3f23227d9627e9778df58b568c0ef740` across three files
- Browsers: Edge `150.0.4078.65` and Firefox `151.0.1`
- Result: five matrices per browser passed across owner, member, outsider, and signed-out states at 390/430 with zero overflow, console events, failed requests, or app/backend HTTP errors.
- Retained scenario after both runs: 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media rows, 38 notifications, 0 reminders, 3 Storage objects, and zero outsider residue.

Independent review ran three RED fix loops covering diagnostic token redaction, authenticated-shell assertions, truthful precommit evidence identity, and stale artifact cleanup. The final verdict was **GREEN**. Generated browser profiles, matrices, screenshots, runtime overlay, and artifact store are reproducible ignored evidence and are removed after the recorded gate.
