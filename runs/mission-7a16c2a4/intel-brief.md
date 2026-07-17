# Lifecycle Purge Intel Brief

The repository already implements and has hosted proof for immediate access disablement, a 30-day recoverable deletion grace period, ownership-transfer enforcement, and explicit legal-hold records. The missing operational boundary is permanent, retryable erasure after grace without weakening restore or audit safety.

Key invariants for the next design:

- Recheck deletion state, grace expiry, ownership transfer, and active legal holds under a database lock at execution time; an earlier plan is not authorization.
- Produce a bounded purge plan with stable identifiers and a digest so retries are idempotent and operator evidence can be correlated without storing personal content.
- Delete private Storage objects first, verify absence/hash inventory, then remove media metadata and relational rows. Database-first media deletion would orphan private objects and erase the cleanup map.
- Resolve shared `created_by` references explicitly. Family-owned trips, comments, and memories must not disappear merely because their creator account is erased; personal authorship should be anonymized or reassigned according to documented schema constraints.
- Supabase Auth user deletion must be last because Auth-linked foreign keys and `auth.uid()` policies can otherwise block or make remaining cleanup unverifiable.
- Write lifecycle journal evidence outside the database being purged. Retain only execution identifiers, plan digest, timestamps, counts, result state, and non-sensitive failure details; make replay append-only and reconcile retries by idempotency key.
- Backup retention must eventually expire purged data under the documented retention policy; restores must replay the external journal before restored data can serve traffic.

This mission is local-only: design, migration/script implementation, tests, review, and CI. It must not apply migrations, delete users or objects, alter SMTP, promote a deploy, or mutate staging/production providers.
