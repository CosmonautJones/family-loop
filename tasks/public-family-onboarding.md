# Public family onboarding

Approved 2026-09-17: anyone can register, confirm their email, and create one private family. Joining someone else's family still requires their invitation.

Outcome: a new founder can reach their own empty family without admin provisioning; unrelated accounts cannot discover or access it.

Checkpoints:
- [x] Adapter tests fail for the missing public signup path, then pass after implementation.
- [x] Database migration and real PostgreSQL proof: verification, one-family quota, atomic owner creation, retry/concurrency, account deletion, isolation, and private grants.
- [x] Founder UI and recovery entry checked in Chrome; invitation adapter checks preserved. Actual email confirmation belongs to hosted acceptance below.
- [ ] Review, local lint/tests/typecheck/build, documentation and commit.
- [ ] Apply verified migration before publishing the matching frontend; verify the hosted flow.

Preserve main's paused scheduled operations and the current published release until its replacement is verified. No paid CI is required for this work.

2026-09-17 gate: 176 tests pass, lint/typecheck/migration checks/secrets pass, isolated PostgreSQL authority proof passes, independent reviewer reports no actionable defect. Hosted migration and email acceptance remain blocked: Supabase dashboard requires sign-in and the backend hostname in the live Netlify runtime configuration returns NXDOMAIN from this machine. Cause is not established. Do not publish this frontend before resolving and migrating that backend.
