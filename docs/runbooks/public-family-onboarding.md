# Public family onboarding

Approved product flow: anyone may register an account, confirm their email, and create one private family as its owner. An invitation remains necessary to join someone else's family. No family listing or discovery endpoint is added.

## Local verification

PowerShell, repository root:

```powershell
npm --prefix app ci
npm test
npm run lint
npm --prefix app exec -- tsc --noEmit -p app/tsconfig.json
npm run check:migrations -- --base-ref origin/main
npm run check:secrets
node tests/postgres-family-onboarding.mjs
```

The last command uses PostgreSQL 16 binaries at the normal Windows installation path. Set `PG_BIN` to a different binary directory when needed; on other platforms it defaults to PATH. It creates a fresh cluster on a free loopback port, applies every repository migration, tests the real functions/RLS/grants, and stops its own cluster. It never accepts a hosted URL or touches an existing database. Diagnostic files remain in the printed temporary directory. `--baseline` omits the new migration and intentionally fails at the missing founder eligibility assertion.

The small provider-schema fixture supplies only the prerequisite Auth/Storage objects for native PostgreSQL. It does not emulate GoTrue, PostgREST, email delivery, or Storage service behavior. The full local Supabase family suite also covers the new founder eligibility; run `scripts/test-local-supabase-family.ps1` against the normal disposable local Supabase stack when Docker is available.

## Rollout order

1. Confirm the intended Supabase project is `vkogznsfthirhxkqysza`; never use quarantined project `lzscofbvecgpchokxhyb`. Confirm access, current migration state, and a recoverable backup before a hosted migration.
2. Verify Auth allows email signup, requires email confirmation, and sends its confirmation links back to the deployed app. Check the SMTP provider can send to the intended beta users. Keep the existing Auth rate limits. Do not treat automatically confirmed local test users as proof of email verification.
3. Apply the additive migration `20260917120000_self_service_family_creation.sql` through the normal migration process and record its checksum. Existing families, invitations and membership policies are preserved. Historical founders' one-family allowance becomes consumed, including founders without an old entitlement row.
4. Verify an unconfirmed synthetic account cannot create a family, then complete confirmation and create one through the app. Confirm one owner, successful reload and same-request retry, second-family rejection, and no family access from an unrelated account. Exercise an invited user's signup/sign-in and acceptance too.
5. Publish the matching frontend artifact only after the backend is ready. Recheck founder, invitation and recovery entry points on the final URL. Retain the previous immutable frontend release for rollback; do not delete the migration or reset consumed entitlements to roll back UI.

## Expected limits and support

- One family per account, including after deleting the family or transferring ownership. Creating another account is outside this quota; this is not a per-person anti-abuse guarantee.
- No admin provisioning is needed for an active account with a confirmed email and unused quota.
- Registration responses do not prove a new account was created. Supabase can return an ambiguous result for an existing address. Confirmation guidance offers both checking email and signing in without asserting mail was sent.
- Pending account deletion still blocks creation. Existing invitation validation, expiry, email matching and family isolation remain authoritative.
- The local demo continues to use its profile chooser and has no public account registration.

## Evidence boundary, 2026-09-17

Adapter tests and isolated real PostgreSQL tests pass. Chrome preview verified public signup entry, required-field validation/focus, return to sign-in, and separate recovery entry. Independent review found no actionable defects. Real email confirmation and the hosted family creation flow remain rollout acceptance checks, not claims made from the SQL fixture.
