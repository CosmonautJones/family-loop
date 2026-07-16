# Remote media readiness

Date: 2026-07-14

## Current verdict

Repository and local Supabase contract: **PASS WITH CONTENT-SCANNING WARN**.

Hosted Supabase behavior: **NOT RUN**. The migration, database lint, and uploader/member/owner/outsider lifecycle matrix passed against the local Supabase stack via `scripts/test-local-supabase-media.ps1`. The matrix also covers owner reconciliation after uploader removal, concurrent abort/upload serialization, quota and path attacks, revoked direct metadata mutation, event-delete restriction, and real decodable PNG bytes. The runner refuses non-local URLs and cleans synthetic state in `finally`. This runbook does not authorize use of the currently linked shared sandbox, remote credentials, migration application, account creation, storage mutation, or deployment.

## What the repository now guarantees

- `20260714090000_loopedin_media_metadata_and_storage_ownership.sql` follows the initial infrastructure migration and is forward-only.
- Existing rows receive nonblank `alt_text`; caption becomes a separate non-null string; source and creator attribution remain optional fields.
- Media rows persist `pending`, `active`, or `deleting`; only active rows appear in galleries.
- Generic authenticated metadata mutations are revoked. Narrow RPCs begin/activate/abort uploads, list authorized incomplete work, and claim/finalize deletions with current-membership, manager, and object-presence checks.
- Storage upload requires the actor's matching pending row and owned path. Updates are unsupported. Delete requires a claimed row plus object ownership or owner/admin authority. Event deletion is foreign-key restricted while any media row exists.
- The bucket and client both accept only JPEG, PNG, or WebP images up to 1 MiB. The client streams through the byte cap, verifies MIME and image signatures, uses random UUID paths, sends the content type, and disables upsert.
- Upload is metadata-pending first, then Storage, then activation after object verification. Delete is claim first, then Storage removal, then finalization after absence verification.
- Failures leave hidden, queryable pending/deleting rows for idempotent retry or reconciliation. Event media reads retry authorized work; managers can activate a departed uploader's owned object; stale objectless pending rows can be aborted; and per-user pending work is quota-limited. Storage authorization and abort share a path-keyed transaction advisory lock so both sides of that race cannot commit. Success is never reported before the terminal database transition.
- Event cancellation still refuses to proceed while any media metadata exists.

These operations span Storage and Postgres and are not atomic. Persisted states make interruption explicit, but live retry and reconciliation still require certification.

The browser checks honest-client MIME, image signatures, and decodability where `createImageBitmap` is available, while the bucket enforces declared MIME and size. A hostile direct Storage client can still label arbitrary bytes as an allowed image type; trusted decode/re-encode, metadata stripping, and malware scanning remain a production-content boundary decision.

## Dedicated-project certification gate

Before running anything remotely, obtain explicit authorization for a named disposable Supabase project and confirm it contains no production or unrelated data. Record the project identifier without committing credentials.

In that authorized environment:

1. Capture the remote migration ledger and schema before applying anything. Confirm the initial LoopedIn migration exists, the media parity migration is pending, and `storage.allow_any_operation(text[])` exists with delete/delete-many request-operation support.
2. Apply only pending LoopedIn migrations through the approved deployment path. Do not reset the database.
3. Create two synthetic family members plus one unrelated synthetic user. Do not use personal accounts.
4. Prove both family members can list and upload event media, signed URLs do not expose objects publicly, and the unrelated user cannot select, insert, update, or delete rows or objects.
5. Prove an uploader can delete their own photo, an ordinary member cannot delete another member's photo, and an owner/admin can delete either member's photo.
6. Prove caption, alt text, source name/link, and creator name/link survive upload, list, reload, and a second authenticated session without collapsing into one field.
7. Inject failure before upload, after upload, and before activation. Verify only active rows are visible and each pending row/object combination can be reconciled idempotently.
8. Inject failure after deletion claim, during Storage removal, and before finalization. Verify deleting rows stay hidden and each state can be retried without orphaning or exposing media.
9. Verify an event containing media cannot be canceled; after authorized photo cleanup, verify cancellation succeeds and produces no leftover metadata or objects.
10. Query for orphaned metadata and objects, clean synthetic rows/objects/accounts through an approved cleanup plan, and confirm the project returns to its prior state.

## Required evidence

- exact migration identifiers and before/after ledger;
- two-member plus outsider RLS matrix for Postgres and Storage;
- signed/private object checks;
- retained metadata screenshots or query output with synthetic values only;
- upload/delete failure-seam results, retry evidence, and orphan/dangling-object scans;
- event-cancel fail-closed result;
- final metadata/object orphan report and cleanup confirmation;
- root/app tests, TypeScript, harness, lint status, web export, and diff check from the same commit.

Until that evidence exists, describe remote media as repository-ready and locally contract-tested—not deployed, private-storage certified, transactional, or production-ready.

## 2026-07-15 superseding hosted staging checkpoint

The dedicated LoopedIn staging project is now deployed and the remote-media slice is **GREEN for the exercised synthetic staging path**. This does not remove the content-scanning warning above or make a production claim.

- Exact source `08006e5e83a8dd85cfeb30f6fb26f8df103fa619`, release `0.1.0-08006e5e83a8`, and artifact digest `e41dd1727d11888e0259a97c442f13e815243472dfcd437334c00c53b9ee0d38` are published as Netlify deploy `6a58428caebae3fadaf3906b` at `https://loopedin-family.netlify.app`.
- Cold and warm predeploy family drills `qa-mrmvkrsu-77c50f7e` and `qa-mrmvneb6-75962463`, followed by final deployed drill `qa-mrmw9a6b-dcce7de2`, passed private media create, authorized view/delete, outsider denial, protected-state comparison, and cleanup with zero synthetic residue. The final drill also passed three-member event/RSVP/comment/notification behavior and observed Realtime delivery.
- Hosted encrypted backup run `29465195044` restored all three retained private objects into an isolated disposable database. Object hashes, row/object references, seven-migration history, owner visibility, outsider denial, and post-restore core-loop checks matched; the primary database was never a restore target.
- The real approved owner starter state retains three active private attributed photos. No additional invitation recipient or personal account was invented for this proof.

Still unproven are hostile-byte decode/re-encode or malware scanning, every failure seam listed in the original certification gate, physical Safari/Chrome behavior, and production-project media behavior. Production promotion therefore remains blocked even though the exercised staging media lifecycle is green.
