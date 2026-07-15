# Full Local Jones Family E2E Runbook

This runbook reproduces the Wave 6 browser journey in default durable-local mode. It must not be used as evidence of Supabase, RLS, private object storage, authentication, multi-user synchronization, or deployment.

## Safe setup

1. In `app`, install existing dependencies if needed with `npm install` and start the app with `npm run web`.
2. Open the printed local URL in Chrome or Edge. Do not print, edit, or inspect `.env` values, and do not select an explicit Supabase data mode.
3. To start clean, use browser DevTools to clear site data for this local origin, then reload. This is a local, reversible reset; do not mutate a linked remote project.
4. Confirm the Jones Family has five members, Home/Calendar have three upcoming seed trips, and Memories includes completed Lake Geneva.

## Journey

1. Open Create and submit empty/invalid values; confirm visible validation and focus on the first invalid field.
2. Create Wisconsin Dells and Chicago trips with valid dates, times, and locations. Record each exact event route and confirm Back returns correctly.
3. Set one trip to Going and the other to Maybe. Add a distinct comment to each and confirm event isolation.
4. Add an attributed URL photo using an `images.unsplash.com` URL, caption, alt text, photographer name `Nathan Dumlao`, and creator-profile URL. Confirm the creator profile separately. The opaque Unsplash photo page was not independently verified in Wave 6, so do not claim that it was.
5. Exercise photo deletion once with Cancel and once with confirmation.
6. Select a small PNG from the browser file chooser (Wave 6 used a valid 68-byte PNG), then provide caption and alt text and confirm it appears on the intended event.
7. Hard reload. Stop and restart the local Expo/Metro process, reopen the same origin, and confirm the two events, RSVPs, comments, and retained media remain.
8. Confirm Home and Calendar show five upcoming events, Family shows five members, and Lake Geneva memory shows exactly three photos and one comment.

## Responsive and accessibility checks

- Exercise 320x844, 390x844, 430x932, and 1280px desktop widths. Confirm no horizontal overflow and interactive controls are at least 44px.
- Traverse all five tabs sequentially by keyboard and activate them with Enter. Confirm exactly one main landmark and one selected tab.
- Run Lighthouse accessibility and best-practices audits. Wave 6 recorded 100 for both; record fresh results rather than copying those scores.
- Check the console after the journey. Wave 6 ended with zero errors after the avatar fix; the known React Native Web warning is documented separately.

## Persistence failure checks

Only in disposable local site data, replace the local durable envelope with malformed JSON, then with a syntactically valid unsupported future version. Reload after each change and confirm the app shows a visible error without overwriting the stored value. Clear local site data deliberately to restore the canonical seed.

## Offline boundary

The local adapter is architecturally able to read and mutate browser storage after the bundle has loaded, but Wave 6 did **not** separately exercise an in-session offline mutation. Record that check as `NOT RUN` unless freshly tested. A cold offline reload is expected to fail with a browser network error because there is no service worker/offline shell. Record it as **FAIL/NOT MET**, not PASS; PWA/service-worker work is separately authorized scope.

## Verification commands

Run each command independently and retain its own summary:

```powershell
npm test
Push-Location app
npm test
npx tsc --noEmit
npm run lint
npx expo export --platform web
Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Wave 6 authoritative results were root 45/45 and app-local 34/34; TypeScript, harness, Expo export, and diff check passed. Lint exited 0 but was a placeholder warning. Re-run rather than mirroring these counts.

## Evidence not covered

Remote Supabase/RLS/private storage, authentication and multi-user behavior, physical iOS Safari/Android Chrome, VoiceOver/TalkBack or other screen readers, practical 200% zoom, deployment, backup, and restore were not run. They require a safe authorized environment or separate test gate.
