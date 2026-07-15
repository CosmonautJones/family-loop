# Final configured browser feature matrix

Recorded 2026-07-14 from commit `769ae49` plus the two browser-discovered fix loops described below. The application was exported with dotenv disabled and explicit loopback Supabase values. Bundle inspection found `127.0.0.1:54321` and did not find the hosted-project domain. No hosted request or mutation was made.

## Clean browser journey

The disposable marker `family-final-v1` began at zero residue with one entitled owner and one outsider. Four isolated Chrome profiles drove product mutations through the rendered UI. The run ended with marker-scoped cleanup and a zero-residue assertion.

| Area | Rendered evidence | Result |
| --- | --- | --- |
| Signed-out boundary | Family/event content absent before authentication | PASS |
| Family lifecycle | Avery created Final Family; invite created/revoked; Maya accepted; Jordan created an account, declined, then accepted a fresh same-tab invite | PASS |
| Roles and membership | Ownership Avery → Maya → Avery; owner removed/reinvited Jordan; Maya left/rejoined | PASS |
| Plans | Future and completed plans created; completed notes edited; throwaway plan created, confirmed canceled, and absent from Calendar | PASS |
| RSVP and conversation | Avery Going, Maya Maybe, Jordan Can't go; each added an exact-event comment | PASS |
| Realtime | Separate browser harness proved one live arrival, unrelated-route isolation, inert cleanup, actual Realtime-container outage/restart convergence once, and outsider none | PASS |
| Photos | Attributed Unsplash URL add/reload; real local JPEG chooser add/reload; member lacked another uploader's delete control; owner removed the member file | PASS |
| Reminders | Preference enabled and retained after reload; dedicated browser gate proved failed-write intent and retry after local gateway recovery | PASS |
| Updates | Owner observed five unread, opened one update, then marked all remaining updates read | PASS |
| Memories and routes | Completed recap contained comments/photo; exact event deep link, browser Back, hard reload, Home and Calendar routing retained truth | PASS |
| Session and recovery | Sign out/sign in/session restore; reset request, validation, replacement, old/new password behavior, reload, replay denial, actionable offline copy | PASS |
| Isolation | Outsider remained in no-family state and direct event-ID navigation exposed no family/event content | PASS |
| Responsive web | 320×844, 390×844, 430×932, and 1280×900 each had exact document width, one main, five tabs, one selected tab, and visible actions at least 48px | PASS |
| Motion and interaction | Reduced-motion emulation passed; no role controls were hidden/hover-only; zero browser console events | PASS |

The final all-in-one result reported the exact flags above, three event IDs with the throwaway canceled, all three RSVP states, three comments, URL and file media lifecycle, unread/read behavior, four viewport records, reduced motion, and zero console events. Dedicated local family, private-media, reminder, service-realtime, browser-realtime, browser-reminder, and browser-recovery harnesses independently passed.

## Fix loops found by the replay

1. A signed-in user opening a fresh same-origin invitation hash in the same tab remained on onboarding. `AuthSessionProvider` read the hash only at initial mount. It now listens for valid `hashchange` routes and removes the listener on unmount. The clean decline → reinvite → accept browser path passes.
2. A safe network error was sanitized twice during offline password reset, changing actionable network copy to generic unknown copy. The sanitizer is now idempotent for `LoopedInServiceError:*`; the complete browser recovery flow passes, including offline guidance.
3. The palette review exposed hidden-state contrast failures not present in the earlier happy-state Lighthouse snapshot: coral text was 2.68–2.93:1 and sage text was 1.70–1.85:1 on light surfaces. Semantic error/emphasis text now uses berry (5.03–5.49:1) and success text uses plum (8.07–8.79:1). Decorative coral and sage surfaces remain unchanged; a source regression prevents their reuse as small semantic screen text.

## Evidence boundary

- The prior authenticated Lighthouse run scored 100 Accessibility and 100 Best Practices. The final static palette inventory supplements it for error/success states that were not visible in that snapshot; neither is represented as formal WCAG certification.
- The historical CDP page-scale proxy remains limited evidence. A later Chrome 150 configured replay used the browser's persisted native zoom preference, not page/device/CSS scaling. Same physical windows produced 640→320, 780→390, and 860→430 CSS-pixel layouts while DPR doubled 1→2, `visualViewport.scale` stayed 1, and CSS zoom stayed 1. Full owner core-screen sweeps at effective 320/390/430, all four roles at 390, and a 1280-CSS desktop regression passed with >=48px controls and no control-box or descendant control-text/glyph clipping or overflow.
- Sequential keyboard focus and a 320×500 virtual-keyboard-height proxy pass in the dedicated OPORD 014 harness. Physical software keyboards remain `NOT RUN`.
- Hosted Supabase, deployment, production email, physical iOS Safari/Android Chrome, VoiceOver/TalkBack, moderated older-adult use, and human usability judgment remain `NOT RUN`.

## Native browser zoom follow-up — 2026-07-14

`scripts/check-opord14-real-browser-zoom.mjs` launches isolated Chrome profiles with `partition.default_zoom_level.x = log(2) / log(1.2)`. It rejects false zoom proof by requiring the DPR, same-window layout-width, visual-viewport-scale, and computed-CSS-zoom invariants together. The read-only configured replay covers signed-out auth/recovery, owner/member/outsider role boundaries, Today/Updates, Calendar, Create validation, Memories, Family/invite/export, exact Event Detail/edit/RSVP/thread/reminder/photo form, Back, deep link, reload, and outsider denial.

The first glyph-level run exposed a real Calendar defect: the Yellowstone status chip painted beyond its otherwise-contained action row. Giving the agenda copy `flex: 1` and `minWidth: 0` restored containment; the 320/390/430 native-zoom sweep is the rendered regression. The optional `/favicon.ico` request remains a recorded P3 404 and is excluded from functional app/backend failure counts. Generated JSON and screenshots live under ignored `.codex/evidence/opord14-real-zoom/` and contain synthetic local-family content only.

## Edge and Firefox configured follow-up — 2026-07-14

One dependency-free semantic matrix now drives installed Edge 150.0.4078.65 through CDP and stock Firefox 151.0.1 through native WebDriver BiDi. Both browsers passed signed-out validation/recovery, owner session restore and complete core surfaces, member role-safe Family/Event Detail, outsider no-family/direct-route denial, exact-event Back/deep-link/reload, and 390/430 responsive checks. Authenticated surfaces retained one main landmark, five tabs, one selected tab, >=48px controls in both dimensions, and no overflow, console warning/error, failed request, or app/backend HTTP error.

The first cross-browser run exposed a real release-server CSP defect: the validated loopback Supabase origin was allowed for API connections but not images, so both browsers blocked a private signed family photo. `img-src` now receives only that already validated runtime backend origin alongside the existing self/data/blob/HTTPS sources. Focused policy coverage proves an unrelated HTTP origin remains absent. Both browser reruns render the private image and are green; failure evidence strips URL queries, fragments, and user information before logging.

Rendered Today, Event Detail, Memories, and Family screenshots at 390/430 show no browser-specific hierarchy, clipping, or control regression. Firefox's native thin scrollbar is the only visible engine difference. Safari and physical-device/assistive-technology gaps remain unchanged.

The exact source was `31c74466e6faba2e9824cc5c7046c2fbfad5c269`. Its three-file release `0.1.0-31c74466e6fa` has SHA-256 `a8c41774b3cb4bbedc8cc53eb14af95a3f23227d9627e9778df58b568c0ef740`. Five matrices per browser passed, and independent review closed **GREEN** after three diagnostic/evidence hardening loops.

## Cleanup and retained baseline

The disposable family, accounts, rows, private objects, and recovery account were removed. Realtime subscriptions returned to zero. The independent retained `family-browser-v1` verifier still passed exactly: 4 identities, 3 members, 3 trips, 6 messages, 6 RSVPs, 3 media rows, 38 notifications, 0 reminders, 3 Storage objects, and zero outsider residue.
