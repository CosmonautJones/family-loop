# Full local multi-user family proof

Date: 2026-07-14
Accepted commits: `7deb3fa`, `93dc773`, `1311332`, `2b6d725`, `a52e43b`, `0601baa`

## Scope and verdict

This run proves the Jones Family core loop for two independently selected local actors sharing one durable browser database. The actor chooser is explicitly a local demo: each tab stores its selected person in `sessionStorage`; it is not sign-in, invitation acceptance, remote synchronization, or production authorization.

Final local verdicts were **AMBER / PROCEED-WARN with zero local blockers** for the security gate and **GREEN** for the final KISS code and rendered fast gates. Remote Supabase, real auth/invites, private object storage, physical devices, and assistive technology were not exercised.

## Two-tab Alex/Maya matrix

| Journey | Alex tab | Maya tab | Result |
| --- | --- | --- | --- |
| Identity | Chose Alex Jones | Chose Maya Jones | Independent per-tab identities; signing Alex out did not sign Maya out, and Maya survived reload |
| Shared plan | Created `event-created-1`; final run created Harvest Picnic | Saw the new plan after reload and converged on its exact route | Shared durable record, exact-event identity preserved |
| Plan controls | Creator/owner could edit and cancel | Could read Alex's plan but saw no management controls | Creator/manager boundary rendered and enforced |
| RSVP | Set Going | Set Maybe | Distinct actor-owned RSVPs persisted; caller identity could not be spoofed |
| Comments | Posted as Alex | Posted as Maya | Correct authors; self/other alignment changed truthfully with the viewer |
| Photos | Added an attributed Unsplash URL photo | Added a URL photo | Both actors saw shared event media |
| Removal | Owner controls were available | Could remove only Maya's photo, not Alex's | Uploader/owner-manager rule enforced locally |
| Shell | Home, Calendar, Family, Memories, exact routes | Same shared surfaces | One main landmark, five tabs, no document overflow |

The final multi-user run opened the real browser file chooser for an 847-byte PNG, but the automation extension could not set the chosen file. That step is therefore **not a multi-user attachment pass**. Earlier Wave 3 browser evidence did select and persist a real 609-byte PNG, while multi-user service tests cover actor ownership of data-URL media.

## Service security matrix

| Boundary | Evidence | Result |
| --- | --- | --- |
| Cross-family outsider | Outsider could list only the outsider family and was denied Jones group, event, RSVP, thread, media, and notification access | PASS, local adapters |
| RSVP spoofing | Maya supplied Alex identifiers; the service persisted Maya's captured actor identity and denied updates to Alex's RSVP | PASS |
| Actor TOCTOU | Protected calls capture the actor at invocation and retain it through the async lock wait | PASS, regression coverage |
| Event management | Creator or owner/admin may update/delete; ordinary non-creator member may not | PASS |
| Photo deletion | Uploader or owner/admin may delete; unrelated ordinary member may not | PASS |
| Notifications | Records are per recipient; list/clear require that recipient and current family membership | PASS; v7 migration fans legacy group records out deterministically |
| Reminder preference | Exact user/event preference; enable upserts and disable deletes only the captured actor's row | PASS across two durable actors and authenticated loopback RLS sessions; no scheduled delivery is claimed |
| Durable failure | Failed plan mutations do not publish partial local state | PASS |

This is local policy evidence, not a live RLS certification. The checked-in Supabase policies also have an unresolved mismatch: media metadata deletion is uploader/manager-scoped, while the Storage object delete policy permits any event member. In addition, object upload plus metadata insert and metadata delete plus object removal are multi-step, nontransactional operations. A failed second step can leave an orphan object or missing metadata. No shared remote project was mutated to test or repair either risk.

## KISS and observable UX review

The final Event Detail keeps the event as the single source of truth: plan details first, then RSVP, thread, and a collapsed photo composer. Edit/cancel controls appear only for an authorized actor; link/file photo modes show only their relevant fields; cancellation requires confirmation; validation keeps the user in context and focuses the first invalid field.

At 320px the fast gate covered a long hero, full Memories content, blank-edit error/focus and recovery, a valid location update reflected in hero and details, photo-mode switching, cancel dismiss/accept behavior, and Maya's denied Alex-plan controls. Exact 390px and 430px checks had no document overflow.

Observed Nielsen-aligned qualities:

- visibility of status: pending, success, validation, and permission states stay adjacent to the action;
- user control and freedom: edit remains recoverable, photo mode can be changed, and destructive cancellation has dismiss/confirm paths;
- error prevention and recovery: required inputs focus their errors and failed input is retained;
- consistency and minimalist design: one event-centered flow, no settings/admin/reminder theater, and collapsed secondary composers.

Observable WCAG 2.2-oriented checks covered keyboard reachability, one main landmark, tab names/selected state, headings, labels, invalid/described-by relationships, contextual action names, live/error semantics, target size, and narrow-width reflow without horizontal overflow. Prior Wave 6 Lighthouse accessibility and best-practices scores were 100. These checks are useful evidence, not WCAG certification; VoiceOver, TalkBack, 200% practical zoom, reduced motion, and moderated older-adult testing remain unperformed.

## Fix loops

1. `7deb3fa` established the local actor chooser and shared two-tab proof.
2. `93dc773` aligned manager/creator permissions, notification family checks, and actor capture against TOCTOU.
3. `1311332` made notifications recipient-scoped and migrated retained envelopes to v6; the later OPORD 010 preference slice advances retained envelopes to v7 with an empty reminder collection.
4. `2b6d725` simplified Event Detail around the core plan loop.
5. `a52e43b` corrected DST preservation, timeline/location truth, fail-closed deletion, photo/edit recovery, and navigation details.
6. `0601baa` cleared stale media-mode fields and synchronized Supabase timeline updates with the displayed location.

## Historical final gates at the original run

```text
root npm test                         PASS 56/56
app npm test                          PASS 45/45
app npx tsc --noEmit                  PASS
scripts/check-harness.ps1             PASS
Expo web export                       PASS
git diff --check                      PASS
app npm run lint                      WARN — historical placeholder, superseded by substantive zero-warning ESLint
```

## OPORD 010 reminder follow-up

The preference harnesses operate only on an existing retained event and clean both users' rows in `finally`:

```powershell
.\scripts\test-local-supabase-reminders.ps1 -RunMarker family-browser-v1
.\scripts\test-local-supabase-reminder-browser.ps1 -RunMarker family-browser-v1 -WebUrl http://127.0.0.1:8090
.\scripts\verify-local-supabase-browser-scenario.ps1 -RunMarker family-browser-v1
```

The service/RLS run proved two users can hold isolated `Morning of event` preferences on the same event across new sessions; one user's repeated disable did not alter the other, and outsider direct-ID insertion failed. The configured 390×844 browser run proved a 48px switch, explicit checked semantics, keyboard-visible focus, reload/deep-link persistence, 390px no-overflow, and a failed disable that retained On plus `Retry turning off` until local Kong recovered. Final verification reported zero reminder rows. This is an in-app preference only; no worker, schedule, push, email, or SMS delivery was exercised or promised.

## Remaining limits

- Local `sessionStorage` actor selection is a demo seam, not password/session security.
- Shared browser storage is not server-side multi-user synchronization and retains the previously documented no-Web-Locks/Safari atomicity warning.
- Hosted Supabase migrations, RLS, storage policies, rollback behavior, auth, invitations, and cross-account isolation are `NOT RUN`; loopback coverage is documented above and in the configured-browser runbook.
- Physical iOS Safari/Android Chrome, screen readers, moderated family/older-adult usability, deployment, backup, and restore are `NOT RUN`.
- The app has no service-worker shell; a cold offline reload remains unsupported.
