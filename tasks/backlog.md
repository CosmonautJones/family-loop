# Backlog

## Persistent data campaign

| Order | Mission | Depends on | Outcome | Narrow non-goals |
|---|---|---|---|---|
| M0 | `FAMILY-LOOP-DATA-000` baseline/ADR | Home mission | Verified matrix, ADR 001, ordered campaign | Runtime edits, env/secret inspection, live claims |
| M1 | `FAMILY-LOOP-DATA-001` session gate | M0 accepted; Auth authorization | Session restore plus loading/error/authenticated states | Onboarding, OAuth, profiles, recovery, settings |
| M2 | `FAMILY-LOOP-DATA-002` persistent event loop | M1 | Query-owned group/events; Create persists/refetches; same-ID detail and RSVP survive reload | Edit, recurrence, invites, calendar sync, navigation migration |
| M3 | `FAMILY-LOOP-DATA-003` event thread | M2 | History loads; event-scoped message sends/refetches | DMs, reactions, moderation, presence |
| M4 | `FAMILY-LOOP-DATA-004` event media | M2 | Private images upload/list/resolve/delete | Albums, editing, video, public links |
| M5 | `FAMILY-LOOP-DATA-005` reminders and notifications | M2; M3/M4 where their activity is surfaced | Reminder preferences persist; useful in-app event updates load/read | Push delivery infrastructure, notification settings center |
| M6 | `FAMILY-LOOP-DATA-006` derived memories and closeout | M2 and M4 | Completed events derive memories; phone loop, contracts, permitted RLS/storage evidence, final docs | Free-floating posts, AI recaps, deployment changes |

M0-M6 are sequential. A later mission must not silently absorb adjacent work.

## Deferred

- Invitations, push delivery, onboarding/no-groups, and navigation migration require separate authorization.
- Keep Event Detail as the mobile proof point and web as preview/companion.
- Add live RLS/private-storage coverage only when a safe environment exists.
- Revisit lower-page phone spacing once real content density is known.
