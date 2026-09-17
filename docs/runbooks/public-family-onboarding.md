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

## Hosted rollout, 2026-09-17

The intended project was restored and reported healthy. Preflight found all ten historical migrations, two Auth accounts, one family and one consumed entitlement. The founder backfill would change zero rows. Before migration, the two affected hosted function definitions and their ACLs were captured as a narrow recovery snapshot; this is not a whole-database backup. The dashboard reported no scheduled backups.

Applied `20260917120000_self_service_family_creation` transactionally through the authenticated SQL editor, including the migration-history entry. Source SQL SHA-256 is `23bc28e5c5eec5795704e1e5c3e61d9ef80f7b789bcbaf41a328722178fc7f42`. The Windows editor normalized indentation and line endings; recorded SQL SHA-256 is `c6b57eda35ba4ee85550dc0b023b6dbad5b69fa6808667a9174e49b1cb093d35`. The recorded statement was compared to source ignoring whitespace and matched. No historical migration was changed.

Hosted SQL checks ran as the authenticated role using two transaction-local synthetic users. Verified-email eligibility and creation, unverified denial despite self-authored verification metadata, exactly one owner, same-key retry, consumed quota, second-family denial, unrelated-family/membership RLS isolation and function grants passed. An initial test-query variable ambiguity was corrected before the passing run. Every synthetic change rolled back; final counts remained two users and one family. This verifies actual hosted database enforcement, not GoTrue signup or email receipt.

Auth readback confirms signup enabled and email confirmation required. Site URL and canonical redirect allowlist include `https://loopedin-family.netlify.app`. Visual dashboard inspection after reload confirms the existing Resend sender and port; no credential or Auth configuration change was saved. Protected field values were omitted from the browser text representation and were not actually missing.

Published Netlify deploy `6aabdd1f0c640492f8938709` from the verified envelope for release `0.1.0-cc0bfe5dbeb2`. At `2026-09-17T12:31:25.590Z`, all 14 live application/manifest/runtime/envelope files matched their expected bytes. Release/environment headers, CSP, frame denial, shell/runtime caching, missing-asset 404 and anonymous founder RPC rejection passed. Chrome verified public signup, empty-form alert/focus, return to sign-in and recovery entry. Preserve previous immutable deploy `6aa6b736b29ebed58613109d` for frontend rollback.

Still open: real email receipt and confirmation, attended signup/sign-in and family reload, invited-new-user acceptance, production operations and recovery coverage. No outbound mail, new persistent test account, password change, paid service or CI activation occurred. The live runtime remains `loopedin-staging` until the remaining acceptance and production checks are completed.
