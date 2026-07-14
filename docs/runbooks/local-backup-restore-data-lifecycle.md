# Local Backup, Restore, and Data-Lifecycle Drill

## Scope

This runbook proves the recoverable local slice of OPORD 017 without touching a hosted project or the populated primary scenario. It backs up the application-owned `public`, `loopedin_private`, `auth`, and `storage` schemas plus every private `loopedin-event-media` object, encrypts the package, restores it into a disposable isolated database, and reconciles relational and object state.

It does not configure hosted backups or point-in-time recovery, choose retention/deletion policy, implement a production user export, authorize erasure, or claim an approved RPO/RTO.

## Safety boundary

- The source must be a running local Docker container named `supabase_db_*` and the Storage API must be loopback `127.0.0.1`.
- Source actions are read-only `pg_dump`, SQL inventories, and authenticated Storage `GET` requests. Temporary dump files created inside `/tmp` are removed.
- The passphrase exists only in `LOOPEDIN_BACKUP_PASSPHRASE`, must be at least 16 characters, and is never printed or written into the package.
- The package uses PBKDF2-SHA256 (310,000 iterations), a random 16-byte salt, AES-256-GCM, a random 12-byte nonce, and an authentication tag.
- Restore uses the exact recorded Supabase Postgres image, a fresh `restored` database inside a randomly named disposable container, no primary volume, no primary network, and temporary object files. `finally` removes the container and plaintext.
- `-KeepArtifact` is an operator choice. Without it, even the encrypted artifact is removed after the drill.

## Run the recovery drill

Use a fresh runtime-only passphrase. Do not paste a production secret into shell history.

```powershell
$env:LOOPEDIN_BACKUP_PASSPHRASE = '<fresh runtime-only value with at least 16 characters>'
try {
  .\scripts\invoke-local-data-recovery-drill.ps1
}
finally {
  Remove-Item Env:LOOPEDIN_BACKUP_PASSPHRASE
}
```

The drill stops unless the package authenticates, migration and private-object hashes match, all row counts match, relational/object references reconcile, a member sees restored core-loop data, and the outsider sees zero. The report records observed snapshot age and restore duration; they become targets only after product/operations approve RPO and RTO.

## Dry-run export/deletion and orphan planning

```powershell
$actor = docker exec supabase_db_family-loop psql -U postgres -d postgres -Atc "select user_id from public.loopedin_group_members where role='owner' limit 1"
.\scripts\plan-local-data-lifecycle.ps1 -ActorUserId $actor.Trim() -SubjectUserId $actor.Trim() -MaxActions 100
```

The identifier-only planner denies actor/subject mismatch, rejects foreign user IDs in the scoped inventory, bounds plans to 1-500 actions, protects shared/policy-undefined data, compares media rows and objects in both directions, and has no apply mode. This is operator-side scope evidence, not production authentication or a complete portable export.

Product/legal owners must define export contents, retention, grace, legal hold, backup-erasure interaction, confirmation copy, and completion semantics before an apply path or user UI can exist.

## 2026-07-14 observed local drill

| Evidence | Result |
|---|---:|
| Encrypted payload | 608,653 bytes; authenticated decrypt PASS |
| Profiles / groups / memberships | 4 / 1 / 3 |
| Events / RSVPs / messages | 3 / 6 / 6 |
| Media / notifications / Auth users / objects | 3 / 38 / 4 / 3 |
| Private object hash and size checks | 3/3 PASS |
| Missing event / object / media references | 0 / 0 / 0 |
| Member events / messages / media | 3 / 6 / 3 |
| Outsider events / messages / media | 0 / 0 / 0 |
| Observed snapshot age | 14.806 seconds |
| Observed restore duration | 7.745 seconds |
| Owner deletion candidates / media discrepancies | 21 / 0; dry-run only |

The artifact used a disposable test passphrase and was removed. No restore container or plaintext remained. These are one local drill's measurements, not a hosted availability or compliance guarantee.

## Stop and escalate

Stop for a non-loopback source, ambiguous restore target, missing encryption passphrase, hash/count/reference mismatch, RLS exposure, object download failure, requested apply/delete operation, or missing approved policy. Never restore over the primary stack or infer retention/legal obligations from this runbook.
