# Account deletion grace-state runbook

## Scope

This runbook covers the recoverable account-deletion request, immediate server-access shutdown, cancellation, and legal-hold records introduced by migration `20260716033000_account_deletion_grace_state.sql`. It does not perform permanent deletion.

## User path

1. Download the encrypted current-user export first.
2. Transfer ownership of every family to an existing member.
3. On the Family surface, type `DELETE`, enter the current password, and start deletion.
4. The client cancels and removes protected Query data, clears the active family, and shows only the recovery deadline, cancel action, and sign-out.
5. Before `purge_after`, cancellation restores authorization without changing family roles. At or after the deadline, self-cancellation is rejected.

The product re-enters the password with Supabase Auth before requesting deletion. The database requires `last_sign_in_at` within five minutes. Once custom SMTP exists, request and cancellation security notices are required before production use.

## Authorization boundary

Pending status denies new authenticated access through:

- group/event membership helpers inherited by table and Storage policies;
- direct profile/group/member/event policy branches;
- guarded authenticated family, invitation, event-create, and message-create RPCs, including idempotent replay paths;
- a mutation trigger on protected public tables as defense in depth;
- client bootstrap, which resolves deletion status before any family query;
- 15-second authenticated status polling plus focus/reconnect refetch behavior;
- protected Query cancellation/removal and active-family clearing;
- Existing one-hour signed private-media URLs; shortening them requires expiry-aware renewal so long-running galleries and exports do not break.

“Immediate” means new server-authorized DB, RPC, Realtime-event delivery, and Storage access is denied when the request commits. It cannot erase already rendered data, revoke a signed URL already issued for its remaining lifetime, or revoke bytes already downloaded to a device.

## Legal hold

Only the Supabase `service_role` may call:

- `loopedin_place_account_legal_hold(target_user_id, reason_code, operator_reference)`
- `loopedin_release_account_legal_hold(target_user_id, operator_reference)`

Reason codes and operator references are bounded identifiers, not free-form case notes. Placement/release appends an internal lifecycle record. A hold pauses future operator destruction; it does not restore app access or extend the 30-day self-recovery deadline. Do not place or release a real hold without a real operator/change reference.

## Local verification

```powershell
supabase db reset --local
supabase db lint --local --level error
./scripts/test-local-supabase-account-lifecycle.ps1
npm test
Push-Location app
npm run lint
npm test
npx tsc --noEmit
Pop-Location
```

The destructive lifecycle test refuses non-loopback Supabase. It uses synthetic users and cleans its exact rows/objects. Never test deletion with the real Travis account.

## Permanent-purge gate

Do not call the lifecycle complete until all of the following exist and pass:

1. An append-only deletion/legal-hold journal outside the database being restored, retained beyond the maximum backup lifetime.
2. Mandatory journal replay/reconciliation before a restored environment can receive traffic.
3. A leased, retryable state machine that rechecks deadline, ownership, and legal holds on every attempt.
4. Storage object capture/removal/absence verification, followed by transactional contribution cleanup and Auth deletion last.
5. Idempotent success for already-missing rows, objects, and Auth users.
6. Failure-injection proof at each phase and a pre-request-backup restore proving the account remains denied.
7. A documented custody/anonymization decision for preserved plans whose original creator leaves.

Until those gates pass, `pending` is a recoverable access-disabled state, not proof of permanent erasure.
