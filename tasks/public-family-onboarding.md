# Public family onboarding

Approved 2026-09-17: anyone can register, confirm their email, and create one private family. Joining someone else's family still requires their invitation.

Outcome: a new founder can reach their own empty family without admin provisioning; unrelated accounts cannot discover or access it.

Checkpoints:
- [x] Adapter tests fail for the missing public signup path, then pass after implementation.
- [x] Database migration and real PostgreSQL proof: verification, one-family quota, atomic owner creation, retry/concurrency, account deletion, isolation, and private grants.
- [x] Founder UI and recovery entry checked in Chrome; invitation adapter checks preserved. Actual email confirmation belongs to hosted acceptance below.
- [x] Review, local lint/tests/typecheck/build, documentation and commit.
- [x] Apply verified migration, verify hosted database enforcement and publish matching frontend.
- [ ] Complete real email confirmation, user signup/sign-in, family reload and invited-new-user acceptance.

Preserve main's paused scheduled operations and the current published release until its replacement is verified. No paid CI is required for this work.

2026-09-17 local gate: 176 tests pass, lint/typecheck/migration checks/secrets pass, isolated PostgreSQL authority proof passes, independent reviewer reports no actionable defect. Supabase restoration subsequently completed. The new migration and matching frontend are deployed; real email/user acceptance remains open. See the hosted rollout section in `docs/runbooks/public-family-onboarding.md` for current evidence.

Release build succeeded from source `cc0bfe5dbeb259d5bfb1fdb374c1ff12ce6008f0`, release `0.1.0-cc0bfe5dbeb2`, artifact SHA-256 `0b3fc21311ec9d86079e4bbad2e775f32c149f98fabb31a92452b3c4ab54a2ad`. The dependency audit reports 11 moderate, zero high/critical findings; no dependencies changed. Netlify still has no Git repository linked. Published deploy `6aabdd1f0c640492f8938709` replaces September 13 deploy `6aa6b736b29ebed58613109d`, which remains the frontend rollback target. Runtime remains `loopedin-staging` pending real email/user acceptance and production operations checks.
