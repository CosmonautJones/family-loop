# Virtual family simulation

This repeatable exercise tests the real durable-local service and view selectors with a synthetic household. It is evidence of the behaviors asserted below, not a production-readiness certificate or a substitute for hosted-backend and device testing.

## Run it locally

From the repository root, using Node.js and the locked app dependencies:

```bash
npm --prefix app ci --ignore-scripts --no-audit --no-fund
npm run test:simulation
TZ=Asia/Tokyo npm run test:simulation
npm test
npm --prefix app run lint
cd app
npx tsc --noEmit
node scripts/ensure-metro-compat.cjs
EXPO_PUBLIC_DATA_MODE=local npx expo export --platform web --output-dir dist
```

The timezone/environment assignment syntax above is for a POSIX shell. On PowerShell use `$env:TZ = 'Asia/Tokyo'` and `$env:EXPO_PUBLIC_DATA_MODE = 'local'` before the relevant command. Clear those variables afterwards if needed. Dependency installation requires network access; the simulation itself does not. The test compiles production TypeScript into a disposable temporary directory and removes it after execution. No accounts, emails, remote databases, or GitHub Actions dispatches are required.

`npm test` discovers this suite automatically. No additional workflow or recurring schedule is introduced. Run locally during development; the existing CI remains the integration gate.

## Scenario and boundaries

Sam Organizer, Jamie Partner, and Casey Relative coordinate September 14–20, 2026. Taylor Outsider belongs to a different family. Seven plans cover school pickup, dinner, library, birthday planning, movie night, a picnic moved indoors, and Sunday lunch. All names, content, and the one-pixel photo are synthetic.

The actual `createDurableLocalLoopedInService` performs reads, writes, actor authorization, deduplication, and cleanup. Only persistence is replaced with a disposable Map-backed storage interface. Each actor uses a separate service instance and session. Reconstructing a service proves reads from the shared serialized snapshot; this is not an actual browser restart, disk durability test, multi-device synchronization test, or Supabase RLS proof. Concurrent promises run in one Node process. Injected storage failures model commit failure/lost acknowledgement, not a full network stack.

| Scenario | Assertions | September 13 result |
| --- | --- | --- |
| Seven-day family loop | Seven plans, RSVPs, comment/photo association, changed location, reconstructed state, completed history | PASS |
| Duplicate submissions and lost acknowledgement | Retrying a committed operation creates one event and one comment | PASS |
| Concurrent updates | All 18 messages retain unique IDs and the correct authors | PASS |
| Failed edit and retry | Failed write preserves original location; explicit retry persists the new one | PASS |
| Family boundaries | Outsider read/comment denied; member cannot delete owner event; RSVP identity derives from actor | PASS |
| Arriving after the start | Ongoing event remains on Home, is labeled ongoing, and disappears after its end | PASS after fix |
| Same month in another year | Next-year event does not highlight this year's calendar; agenda retains both | PASS after fix |
| Delete populated event | Local event and dependent RSVP/message/media/activity/history/operation records removed | PASS |

Source: [executable suite](../../tests/virtual-family-week.test.js). Recorded proof: [2026-09-13 evidence](../evidence/2026-09-13-virtual-family/README.md).

## Corrections demonstrated

1. Home previously removed an event as soon as its start time passed. The selector now retains it through its end time; the Home card and accessibility label say “Happening now” for an ongoing event.
2. Calendar highlights previously compared month alone. They now compare month and year, preventing an event next September from marking a day this September.
3. The baseline root suite exposed an outdated assertion for the former twice-hourly availability schedule after the preceding CI trim. The assertion now checks manual standalone availability and the combined hourly monitoring step. This corrects test/configuration drift; it is not a third app defect.

Test development also corrected an invalid expectation that a spoofed RSVP person ID must be rejected: the existing adapter safely ignores it and binds the actual actor. Independent review then identified a timezone-sensitive calendar fixture; local Date construction fixes that fixture, and all eight cases pass under Asia/Tokyo. Neither was an application bug.

## Remaining app-readiness gates

- Run authenticated, multi-account browser journeys on an isolated backend: sign-in, invite/confirmation/recovery, RSVP, comments, private media, refresh, expiry, and deletion.
- Exercise actual Supabase RLS and Storage isolation, real transport failures, cross-device updates, and backup restore on the exact candidate. Existing historical evidence does not certify this revision.
- Check the changed Home label visually and with assistive technology. Test iOS Safari and Android Chrome on physical phones, including zoom, keyboard, screen readers, and slow/offline transitions.
- Conduct a small moderated family pilot, including an older or less technical relative, and record task completion and confusion.
- Verify hosted CI/account runner access and the deployment artifact before release. This session's local export is not the immutable release-builder output.

The current hosted sign-in screen was observed only. Local browser navigation was blocked by the browser environment, so authenticated UI flows and the patched screens were not visually verified. No numeric usability or production-readiness grade is inferred from these tests. The evidence supports a tested local candidate with two corrected defects.
