# Hosted operations: availability, encrypted backup, and restore

## Scope and current proof

This runbook applies only to Supabase project `vkogznsfthirhxkqysza` and Netlify site `loopedin-family`. The quarantined Supabase project and personal Netlify site are forbidden targets.

On 2026-07-15, the no-secret availability checker passed against `https://loopedin-family.netlify.app`: HTTPS shell `200`, runtime config `200` with `no-store`, exact `loopedin-staging` backend, Supabase Auth health `200`, release `0.1.0-3cf45367dc85`, and missing-asset `404`. The scheduled workflow runs at minutes 17 and 47 after default-branch merge. A failed run is the alert; no behavioral analytics, cookies, user identifiers, content, or tracking SDK is collected.

The database password was rotated to an operator-generated value and stored only as repository secret `LOOPEDIN_STAGING_DB_PASSWORD`. The dedicated Supabase secret key and separate backup passphrase are stored as `LOOPEDIN_STAGING_SUPABASE_SECRET_KEY` and `LOOPEDIN_BACKUP_PASSPHRASE`. Values were never printed or committed. Runtime configuration still contains only the public publishable key.

The final hosted drill created an AES-256-GCM encrypted logical backup of `public`, `loopedin_private`, `auth`, `storage`, and `supabase_migrations`, plus all three private media object bytes. A before/after fingerprint of authoritative application rows, private operation state, Auth users/identities, and private-media metadata rejected concurrent drift; the manifest records source commit, hosted migration history, and a digest-pinned Postgres image. Snapshot counts were 1 profile, 1 group, 1 membership, 4 events, 4 RSVPs, 4 messages, 3 media rows, 0 notifications, 1 Auth user, and 3 Storage objects. Encrypted SHA-256: `2a9593d557fa80daf722c4e6a0ac2fd362999e31e557cc91ff6c2c516c05c5f7`.

The artifact authenticated and decrypted, then restored with the pinned image and `--network none` into a disposable Docker database. Restore took 10.392 seconds from a 28.2-second-old snapshot. Counts, hosted migration history, exact Storage metadata inventory, and three object hashes matched; missing event/object/media references were 0/0/0; the owner saw exactly 4/4/3 events/messages/media under restored RLS and an outsider saw 0/0/0. The primary was never a restore target; the disposable database and plaintext were removed in `finally`.

## Policy targets

- RPO: 24 hours; daily workflow at 05:23 UTC, with manual runs before risky operations.
- RTO: 4 hours for operator-led restoration into a replacement environment. The measured isolated restore is not a production cutover guarantee.
- Retention: 30 days in GitHub Actions artifacts, client-encrypted before upload.
- Availability: 30-minute target. Provider scheduling delays mean this is not a hard SLA.
- Free-plan limitation: managed daily backups/PITR are unavailable. Logical backup is the active control, and private object bytes are copied separately because database dumps contain only Storage metadata.
- Deletion: disable access immediately; 30-day recoverable grace; transfer family ownership first; permanently remove rows/objects after grace; let backup copies expire through retention; require an explicit operator record for legal hold. Apply tooling remains intentionally unimplemented pending a real request and confirmation.

## Scheduled backup and restore

`.github/workflows/encrypted-backup.yml` is schedule/dispatch-only, read-only to repository contents, uses the `loopedin-staging-backup` environment, restores/verifies before upload, and uploads only ciphertext for 30 days. Its three secrets exist only in that environment; broader repository copies were removed. `scripts/create-hosted-encrypted-backup.ps1` refuses the quarantined project, requires explicit acknowledgement, refuses overwrite, fingerprints before/after, exports authoritative schemas/history, downloads every private object, hashes content, encrypts locally, and deletes plaintext in `finally`.

To drill a downloaded artifact, set `LOOPEDIN_BACKUP_PASSPHRASE` only in the operator process and run:

```powershell
./scripts/restore-hosted-encrypted-backup.ps1 -ArtifactPath <path-to-flbackup>
```

The restore refuses any source except the dedicated project, verifies database/migration/object hashes, restores to a random disposable container, compares counts/references, runs owner/outsider RLS checks, and removes the container/plaintext. It accepts no remote restore target.

## Failure handling

1. Preserve the failed run ID and bounded message; never copy secrets or provider bodies into issues.
2. Run the public availability checker to separate host/Auth outage from backup-only failure.
3. If database authentication failed, rotate the database password and update only its repository secret.
4. If object capture failed, retain the last successful artifact and compare object inventory to media metadata read-only.
5. Before recovery, restore the newest artifact into an isolated replacement and repeat count/hash/reference/RLS/core-loop checks.
6. Production cutover, DNS, or restore over an existing environment requires an explicit irreversible-production decision.

## Evidence classification and remaining gaps

Automated/directly observed: public availability, exact runtime/backend/headers, hosted logical backup, private object capture, encryption/decryption, isolated restore, counts, hashes, references, owner/outsider RLS, password rotation, and repository secret-name presence.

Configured but not hosted-observed: both scheduled workflows activate only after default-branch merge. Still unproven: managed PITR, cross-region custody, replacement-project cutover, production restore, deletion apply, legal hold, client error ingestion, and provider notification delivery.
