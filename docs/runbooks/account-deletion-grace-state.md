# Account deletion grace-state runbook

## Scope

This runbook covers the recoverable account-deletion request, immediate server-access shutdown, cancellation, legal holds, and the local-only permanent-purge proof introduced by migrations `20260716033000_account_deletion_grace_state.sql` and `20260716213000_permanent_account_purge_boundary.sql`. It does not authorize hosted or production deletion.

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
node --test tests/account-purge-contract.test.js tests/account-purge-journal.test.js
./scripts/test-local-supabase-account-purge.ps1
npm test
Push-Location app
npm run lint
npm test
npx tsc --noEmit
Pop-Location
```

Both destructive lifecycle tests refuse non-loopback Supabase. They use synthetic users and clean their exact rows/objects. Never test deletion with the real Travis account.

## Hosted staging verification

Dedicated staging migration history reports the immutable repository version `20260716033000`; the accidental apply-time version was reconciled as history metadata only, without replaying or reversing schema SQL. PR #7, which attempted to rename the merged migration, was closed after CI correctly rejected it. Main CI run `29471863503` is green.

The hosted-only wrapper hard-locks the linked CLI, API URL, acknowledgement, and project ref to `vkogznsfthirhxkqysza`; it refuses the quarantined project. Superseding run `lqa-mrni99q8-d25f64ff` used three marked disposable users and proved:

- owner rejection followed by ownership transfer;
- exact 30-day recovery and subsequent 30-day backup-expiry boundaries;
- immediate new DB, protected RPC, signed-URL, and private-object download denial with the current token;
- service-role-only legal-hold placement/release and append-only action order;
- cancellation restoring the exact membership roles plus a fresh signed private-object download whose SHA-256 matched the uploaded bytes;
- self-cancellation denial after the recovery deadline;
- outsider isolation, unchanged non-QA fingerprint, and zero row/object/Auth residue.

Hosted serialization races were not duplicated; the local destructive harness remains the evidence for request-versus-transfer and request-versus-family-creation serialization. The hosted run is automated synthetic evidence, not a deletion request for Travis or Jones Fam.

## Local permanent-purge operator

`scripts/invoke-account-purge.ps1` is hard-locked to loopback HTTP and requires `LOOPEDIN_PURGE_CONFIRM=LOCAL_ONLY_ACCOUNT_PURGE`. Supply its journal as an external `.lpjournal` path outside the repository and provide the passphrase only through `LOOPEDIN_PURGE_JOURNAL_PASSPHRASE`. Never print or persist the service key or passphrase.

The operator leases and prepares a frozen digest, checkpoints the encrypted chained journal, deletes the exact real Storage paths, verifies absence, finalizes relational cleanup, deletes Auth last, and records a scrubbed completion tombstone. A retry resumes from the authenticated journal and database state. `recover-head` may accept only a fully authenticated appended tail; it refuses truncation or corruption. Restore traffic remains blocked until post-snapshot destructive journal records are reconciled.

The local E2E injects stops after prepare, object deletion, relational finalization, and Auth deletion. All four retries converge, shared family/event rows survive with neutral creators, outsiders remain denied, and replay adds no duplicate evidence.

## Remaining production gate

Do not call hosted deletion complete until an independently reviewed hosted operator, external journal custody/retention, mandatory restore-time reconciliation, authorized synthetic hosted purge, backup-expiry evidence, security notices, and rollback/cutover controls pass. The repository proof is automated local evidence only; no hosted project, real family account, or production identity was purged.
