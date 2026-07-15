# Local realtime convergence proof

This gate proves the smallest event-thread realtime contract against loopback Supabase. It does not authorize or describe a hosted project.

## Preconditions

- Local Supabase is running and the retained `family-browser-v1` scenario verifies.
- Build/run the web app with `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_DATA_MODE=supabase`, and only the loopback URL/publishable key returned by `npx supabase status -o env`.
- Use separate Chrome profiles for owner, Maya, and outsider. The reusable browser harness connects to their CDP ports 9331–9333 and never stores credentials.

Load `API_URL` and `PUBLISHABLE_KEY` from `supabase status -o env` into process variables without echoing them, then run:

```powershell
$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_PUBLISHABLE_KEY = $values['PUBLISHABLE_KEY']
$env:LOOPEDIN_LOCAL_PASSWORD = '<local synthetic browser password>'
$env:LOOPEDIN_RUN_MARKER = 'family-browser-v1'
node tests/supabase-realtime-e2e.mjs
node tests/browser-realtime-e2e.mjs
```

The service harness creates one disposable event, subscribes Maya, the outsider, and an unrelated-event channel, sends through the owner, proves exact delivery/RLS isolation, simulates a missed interval through unsubscribe/resubscribe, verifies stable-ID server convergence, removes every channel, and deletes the event in `finally`.

The browser harness creates a separate disposable event and drives the rendered app in three isolated authenticated profiles. It proves no-reload arrival once, unrelated-event isolation, route-switch cleanup, a real Realtime-container outage/restart with one missed-comment convergence, and outsider isolation. It always restores the Realtime container and deletes the disposable event in `finally`.

## Closeout

```powershell
./scripts/verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
docker exec supabase_db_family-loop psql -U postgres -d postgres -Atc "select count(*) from realtime.subscription;"
```

Expected retained baseline: 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media, 38 notifications, 3 Storage objects, zero outsider residue, and zero subscriptions after the isolated browsers close.

Hosted Realtime, physical phones, assistive technology, and human usability remain `NOT RUN`.
