# Critical Mission Briefing

Mission: `mission-7a16c2a4`

## BLUF

Design and locally prove the smallest retryable, hold-aware permanent account-deletion operator boundary, including a restore-safe external tombstone journal. The wave must not mutate hosted staging or production and must leave Auth deletion last.

## Success

- A forward-only repository migration exposes service-role-only lease/plan/finalize primitives that recheck grace expiry, ownership, legal holds, and current state under a per-account lock.
- A bounded operator command produces a deterministic plan/digest, deletes and verifies private objects before relational cleanup, deletes Auth last, and supports safe retry after interruption.
- An encrypted external journal format survives database restore long enough to cover every retained backup, and restore instructions require replay before access is enabled.
- Local tests prove holds, premature requests, ownership, digest mismatch, object failure, row failure, Auth failure, retries, cross-user isolation, and zero accidental hosted mutation.
- G1-G5, territory audit, exact-head CI, and fresh independent review pass before adoption.

## Scope

Repository migration, lifecycle operator scripts/tests, migration inventory, and lifecycle ADR/runbooks/mission/review records explicitly assigned by the OPORD.

## No-go zones

- Dedicated hosted staging and any future production provider mutation.
- Quarantined Supabase project and personal Netlify site.
- Real account, row, Storage object, or Auth deletion.
- Secrets, plaintext identifiers in durable evidence, recipient contact, DNS, billing, or promotion.
- Broad product/UI redesign, dependencies, or unrelated refactors.

## Authority

The user authorized repository work and local destructive fixtures. Hosted apply, real deletion, external recipient contact, and production promotion remain separate RED gates.

## Profile and budget

Critical; at most six execution waves, three fix waves per signature, and one registered Sergeant committer. Runtime model identity and token/cost measurements are unavailable unless explicitly reported.

## Evidence boundary

Existing grace-state, hosted access denial, current-schema backup/restore, and invitation evidence remain valid. This mission may add automated local proof only; hosted purge, production journal custody, and provider execution remain unproven.
