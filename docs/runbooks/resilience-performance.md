# Resilience and representative-capacity proof

## Scope and budgets

This proof is local-only. It does not touch a hosted Supabase project, shared infrastructure, production traffic, deployment configuration, or real family data.

The approved representative volume and phone-web budgets are:

- 20 family members;
- 100 family events;
- 100 comments and 50 media metadata records on one exact event;
- warm production-web LCP at 390×844 under Slow 3G plus 4× CPU throttling: at most 4 seconds;
- an already-loaded event route becomes usable within 1 second after its data is available;
- no measured UI main-thread task longer than 200 ms;
- document `scrollWidth` equals `clientWidth` at 390 CSS pixels.

These are product acceptance budgets for this mission, not production-scale guarantees.

## Supported resilience contract

- **Warm durable-local session:** supported after the web bundle is loaded. The default local adapter reads and mutates its versioned browser-storage envelope, and successful records survive adapter reconstruction and reload.
- **Configured Supabase writes:** online-only. A failed comment or event mutation shows a calm recoverable error and keeps the typed draft, but the app does not queue the write. The user explicitly retries after connectivity returns.
- **Cold disconnected reload:** unsupported. There is no service worker, installable PWA shell, background sync, or offline write queue. A browser that cannot fetch the app bundle cannot cold-start LoopedIn.

The app deliberately does not claim conflict-free offline collaboration or eventual delivery of a write that failed while disconnected.

## Deterministic representative-volume check

Run from the repository root:

```powershell
node --test --test-name-pattern="representative family capacity" tests/app-scaffold.test.js
```

The test builds one authorized family with the approved volume, reads its member/event/comment/media collections, projects Home and exact Event Detail state, then reconstructs the current version-7 durable-local adapter from the serialized envelope. It asserts exact counts, chronological/exact-event identity, 99 later Home events after the hero, a 20-person RSVP summary, parallel local reads at or below 250 ms, and selector processing at or below 200 ms.

Measured on Windows/Node 22 on 2026-07-14:

- parallel local service reads: 121.3 ms;
- Home plus Event Detail selectors: 51.0 ms;
- durable-local initialization, exact reads, and reconstruction: 518.0 ms;
- exact retained counts: 20 members, 100 events, 100 comments, and 50 media records.

The focused test emits its fresh timing diagnostic; small machine-to-machine timing variation is expected.

## Configured disconnect/retry procedure

Use an already-authenticated owner tab against loopback Supabase only:

1. Create a uniquely named disposable future event and open its exact Event Detail route.
2. Type a unique comment without sending it.
3. Stop only the loopback Supabase API gateway, send once, and verify a plain-language alert plus a retry action appear while the textarea retains the exact draft. Do not set Chrome fully Offline because that also makes the loopback web bundle unavailable and tests the unsupported cold-shell case instead.
4. Restore network connectivity and invoke the visible retry once.
5. Verify the comment appears exactly once, hard reload, and verify it still appears exactly once.
6. Delete the disposable event and confirm it remains absent after reload.

This proves explicit user-driven recovery. It does not prove or introduce an offline queue.

## Browser measurement procedure

Use a production Expo web export served from loopback, not Metro development timing. Seed the representative envelope on an isolated origin, select the local owner profile, and use Chrome DevTools with a 390×844 mobile/touch viewport:

1. Enable Slow 3G and 4× CPU throttling.
2. Record a warm reload performance trace and capture LCP and the longest main-thread task.
3. Check `document.documentElement.clientWidth` and `scrollWidth`.
4. Restore normal connectivity/CPU, open the exact 100-comment/50-media event from already-loaded Home data, and measure from route activation to the correct Event Detail heading/usable controls.
5. Check the exact Event Detail counts and document width, then clear the isolated origin.

## Browser results

At 390x844, the representative Home rendered 12 upcoming plans at a time without horizontal overflow. Opening the exact 100-comment/50-media event from already-loaded data took 333.8 ms and retained 390/390 document width. A warm production-export reload under Slow 3G plus 4x CPU recorded 6,528 ms LCP and a 673 ms long task, failing the 4,000 ms and 200 ms budgets. The trace attributed 2,050 ms of the text LCP delay to the icon font and found only 148 DOM elements, so a future fix should stay focused on startup/font delivery instead of speculative list virtualization.

With the loopback Supabase API gateway stopped, the configured comment draft remained and a visible retry persisted it exactly once after the gateway returned. The first failure exposed raw `Failed to fetch`, which fails the plain-language error requirement and is assigned to OPORD 013. After deleting the disposable event, the read-only verifier returned the original scenario counts with zero outsider residue.

## Conditional gaps

- Physical iOS Safari and Android Chrome: `NOT RUN`.
- VoiceOver, TalkBack, reduced motion, practical 200% zoom, and moderated older-adult use: `NOT RUN`.
- Cold offline reload: unsupported by product decision.
- Configured offline write queue/background sync: not implemented by product decision.
- Hosted load, hosted reconnect, and production monitoring evidence: `NOT RUN`; no remote authorization was granted.
