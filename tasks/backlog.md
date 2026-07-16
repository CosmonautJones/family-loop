# Backlog

## Production-readiness blockers after green staging

- Provision a separate production Supabase project after the user selects the organization, region, and any required paid plan; never repurpose staging or the quarantined unrelated project.
- Configure production SMTP and prove real invitation and password-recovery delivery. Complete the approved owner's password replacement privately; never request or record the password.
- Send invitations only to additional addresses the user explicitly supplies.
- Observe the scheduled availability, telemetry, and encrypted-backup jobs on their real cadence; managed PITR is still unproven and requires either provider capability or an explicitly accepted limitation.
- Run authoritative hosted native 200% zoom plus physical iPhone Safari, Android Chrome, VoiceOver, and TalkBack checks. Hosted 320/390/430 CSS-width checks are already green but do not substitute for these gates.
- Attach and verify `app.travisjohnjones.com` and promote the exact proven artifact only after explicit production approval. Preserve the personal site and provide its link change separately.
- Re-run the real-family flow with an explicitly approved second recipient, then record production artifact, migration, operator, timestamp, rollback target, and nondestructive rollback evidence.

The retained local Realtime fixture also lacks `@loopedin.test` Auth accounts, so no fresh local fixture pass is claimed. Hosted cold/warm/final drills and focused Query reconciliation tests are green; recreate the local fixture only if separate local evidence becomes necessary.

## Full engineering OPORD campaign

The canonical 17-mission dependency graph is indexed in `docs/opords/README.md`. Its repository, local, and dedicated-staging implementation has reached the operationally green checkpoint recorded in `tasks/current-mission.md`; the production blockers above remain. The campaign targets a responsive web app optimized for phone browsers; desktop web is secondary, and native apps remain non-goals. The index does not delete the persistent-data M4-M6 lineage below: M4 maps primarily to OPORD 009, M5 to 010, and M6 to 011 plus closeout gates in 014-017.

Numeric OPORD IDs are stable identifiers, not execution positions. Historical planning entries are not evidence by themselves; use the exact hosted release, drill, workflow, restore, and browser evidence in the current mission. Physical-device, assistive-technology, production mail, and production-infrastructure claims remain open.

## Persistent data campaign

| Order | Mission | Depends on | Outcome | Narrow non-goals |
|---|---|---|---|---|
| M0 | `FAMILY-LOOP-DATA-000` baseline/ADR | Home mission | Verified matrix, ADR 001, ordered campaign | Runtime edits, env/secret inspection, live claims |
| M1 | `FAMILY-LOOP-DATA-001` session gate — complete | M0 accepted; Auth authorization | Session restore plus loading/error/authenticated states | Onboarding, OAuth, profiles, recovery, settings |
| M2 | `FAMILY-LOOP-DATA-002` persistent event loop — complete | M1 | Query-owned group/events; Create persists/refetches; same-ID detail and RSVP survive refetch | Edit, recurrence, invites, calendar sync, navigation migration |
| M3 | `FAMILY-LOOP-DATA-003` event thread — complete | M2 | History loads; event-scoped message sends/refetches | DMs, reactions, moderation, presence |
| M4 | `FAMILY-LOOP-DATA-004` event media | M2 | Private images upload/list/resolve/delete | Albums, editing, video, public links |
| M5 | `FAMILY-LOOP-DATA-005` reminders and notifications | M2; M3/M4 where their activity is surfaced | Reminder preferences persist; useful in-app event updates load/read | Push delivery infrastructure, notification settings center |
| M6 | `FAMILY-LOOP-DATA-006` derived memories and closeout | M2 and M4 | Completed events derive memories; phone loop, contracts, permitted RLS/storage evidence, final docs | Free-floating posts, AI recaps, deployment changes |

M0-M6 are sequential. A later mission must not silently absorb adjacent work.

## Deferred

- Invitations, push delivery, onboarding/no-groups, and navigation migration require separate authorization.
- Keep Event Detail as the phone-browser proof point and desktop web as a usable secondary surface.
- Add live RLS/private-storage coverage only when a safe environment exists.
- Revisit lower-page phone spacing once real content density is known.
