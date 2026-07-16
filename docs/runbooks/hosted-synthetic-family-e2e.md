# Hosted synthetic family E2E

This destructive harness is limited to dedicated LoopedIn staging project `vkogznsfthirhxkqysza`. It refuses the quarantined project, requires an explicit staging acknowledgement, uses only unique `@loopedin.invalid` Auth identities, and never targets `Jones Fam` or a real address.

## Operator sequence

1. Prepare four marked QA identities. The wrapper obtains the publishable and secret keys from the authenticated Supabase CLI with `--reveal`, keeps them in process memory, and never prints them.

   ```powershell
   .\scripts\test-hosted-supabase-family.ps1 -Phase Prepare -AcknowledgeStagingOnly
   ```

2. Retain only the printed run ID and four user UUIDs. Through the project-scoped Supabase MCP, verify the exact project URL again and insert one unconsumed creation entitlement for the printed owner UUID into `loopedin_private.loopedin_group_creation_entitlements`. Do not grant the outsider or either member an entitlement.

3. Run with the exact prepare handoff:

   ```powershell
   .\scripts\test-hosted-supabase-family.ps1 -Phase Run -AcknowledgeStagingOnly `
     -RunId '<run-id>' -OwnerId '<owner-uuid>' -MemberAId '<member-a-uuid>' `
     -MemberBId '<member-b-uuid>' -OutsiderId '<outsider-uuid>'
   ```

The run rotates all four random passwords in memory, signs in independently, snapshots non-QA public LoopedIn rows plus the bounded private-bucket root listing at the current staging scale, creates an isolated marked QA family through the entitlement RPC, accepts two email-bound invitations, and checks live-invite outsider denial, role denial, three events (including one completed event), RSVPs, comments, a reminder, notifications, bounded Realtime, private PNG upload/view/outsider denial/delete, and outsider database denial. A `finally` block marker-checks and removes known objects, the exact QA family, and all four marked users, then requires zero marked Auth-user/public-profile/group/invitation/known-object residue and an identical bounded protected-state hash.

## Evidence and stop rules

- Store only the final JSON IDs/counts/statuses. Never store CLI key output, passwords, access tokens, invitation tokens, signed object URLs, or provider response bodies.
- Stop if the exact target identity differs, any prepared address collides with an unmarked user, the entitlement is absent, a denial unexpectedly succeeds, Realtime does not converge within its bound, cleanup fails, or residue is nonzero.
- If `run` cannot start after `prepare`, delete only the four printed, marker-matched QA users through the Auth admin API and verify the exact IDs are gone. Never bulk-delete by email domain alone.
- This harness proves synthetic staging behavior only. It does not prove real email delivery, the Travis/Jones family account, production, backup/restore, telemetry, or a physical-device journey.

## Recorded staging runs — 2026-07-15

- Run `qa-mrmjx5t8-fcf3ab68` was **RED** at the bounded Realtime observation after Auth, entitlement, family creation, invitation acceptance, roles, events, RSVP, and comment operations had passed. The raw WebSocket harness timed out during a cold tenant start. Its `finally` cleanup completed; independent SQL read-back found zero QA users/profiles/groups/invitations/objects and unchanged Jones Fam counts.
- The fix reused the installed, pinned-lockfile `@supabase/supabase-js` Realtime client and extended the cold-start bound without adding a dependency. Run `qa-mrmk5zle-016d302d` was **GREEN**: 3 members, 3 events including one completed trip, 3 RSVPs, 2 comments, 7 notifications, one private media create/member-read/outsider-deny/authorized-delete lifecycle, and one exact-event Realtime observation.
- The successful run returned `protectedStateUnchanged=true` and residue `{users:0, groups:0, objects:0}` under the harness version used for that run. Independent project-scoped SQL separately confirmed zero QA users, profiles, groups, invitations, or Storage objects; real state remained one Jones Fam, one member/owner, one validation event, one RSVP, and zero comments. The hardened successor additionally checks public-profile and invitation residue and revalidates the group marker immediately before cleanup; private-schema entitlement/operation-map cleanup remains covered by foreign-key cascades plus the separate SQL read-back, not by the Data API fingerprint.
- The schema intentionally supports `owner` and `member`, not a separate `admin` role. The harness proves owner-versus-member restrictions; an admin role is an unimplemented product requirement, not a passed test. At this 2026-07-15 checkpoint the product created a private invitation link but did not send it; the later invitation-mail runbook supersedes that delivery state.

## Hardened review loop — 2026-07-15

- Independent review was **RED** until generated passwords/tokens were registered for failure-path redaction, each live valid invite rejected the outsider's email and authenticated acceptance before its recipient joined, cleanup re-read the exact owner/name/description marker before deleting a group, and residue wording/checks were narrowed and expanded.
- Hardened run `qa-mrmkwxgi-c0dca50f` reached the Realtime assertion after those new invitation and cleanup controls, then was **RED** because an insert sent immediately after `SUBSCRIBED` missed the provider's cold-start change window. Cleanup completed, and exact-ID SQL returned zero QA users, profiles, groups, entitlements, private operation maps, or Storage objects.
- The harness now waits two seconds after `SUBSCRIBED`, matching the application's initial subscribed-state refresh before later human writes. Run `qa-mrml3fsl-a08c4f8e` was **GREEN** with the complete family/media/Realtime matrix, `protectedStateUnchanged=true`, and residue `{users:0, profiles:0, groups:0, invitations:0, objects:0}`.
- Independent SQL after the hardened GREEN run returned zero exact QA users, profiles, groups, entitlements, event/message operation-map rows, and private objects. Real state remained one Jones Fam, one member, one validation event, and one RSVP.

## Readiness regression and final run — 2026-07-16

- Cold run `qa-mrmuexxo-586c4751` was **RED** at the bounded Realtime check. It established that client `SUBSCRIBED` confirms transport subscription but not necessarily immediate Postgres-change delivery on a cold tenant. Cleanup completed; the failure was retained rather than relabeled as flaky success.
- The scoped correction has the channel's system subscription event invalidate/refetch authoritative messages, and the query layer cancels an older message read before the newest refetch so stale completion cannot overwrite the newest set. Focused regression coverage accompanies the change.
- Readiness-aware cold/warm runs `qa-mrmvkrsu-77c50f7e` and `qa-mrmvneb6-75962463` were **GREEN**.
- Final release run `qa-mrmw9a6b-dcce7de2` was **GREEN** with 3 members, 3 events, 3 RSVPs, 2 comments, 7 notifications, private media create/member-view/outsider-deny/authorized-delete, exact-event Realtime, outsider database denial, `protectedStateUnchanged=true`, and zero synthetic residue.
- This remains synthetic core-loop staging proof. The later invitation-mail runbook proves staging SMTP/provider delivery and approved existing-recipient acceptance; Gmail inbox/new-account/password completion, additional approved recipients, physical devices/assistive technology, and production remain unproven.
