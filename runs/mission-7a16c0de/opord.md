# OPORD

## Situation

Copied links work on staging. Real invitation email is the next promotion gate.

## Mission

Preserve link creation as-is and add a separate **Email invitation** owner action backed by one authenticated Supabase Edge Function and private delivery ledger.

## Execution

1. Create a forward-only migration with private bounded attempt state and authenticated prepare/finalize RPCs. Enforce active-account, current-owner, exact family/email/token hash, pending/unexpired state, cooldown/hourly bounds, stable provider idempotency, and fail-closed unknown-response handling.
2. Add `send-group-invitation`: exact allowed origin, authenticated caller context, strict small body, configured origin-built link, plain-text message, server-only provider key, provider idempotency, bounded responses, and no body/token/email/URL logging.
3. Add a separate app mutation/button after confirmed link creation. Provider acceptance is described as queued/accepted, never delivered; failure retains copy fallback.
4. Prove pure handler behavior, database authorization/rate/idempotency contracts, app state/copy, migration reset/lint, and full repository gates.
5. Independent review attempts to falsify authorization, secrecy, duplicate prevention, fallback, environment isolation, and evidence claims.

## Authority

Local files, tests, branch, PR, and CI are authorized. Hosted migration/function deployment may occur only after local GREEN and explicit pre-change/rollback capture. SMTP/provider secrets, DNS, billing, real recipient contact, and production remain human gates. The quarantined project is forbidden.

## Verification

G1 tests; G2 lint/type/migration reset/lint/secret scan/diff; G3 fresh independent review; G4 local Supabase plus fake provider boundary; G5 docs/review/regression/current mission. Hosted delivery remains unproven until provider and recipient gates clear.

## Rollback

Before hosted mutation, record migration history/function list and exact web rollback deploy. Disable/remove the new web action by exact artifact rollback and undeploy/replace only the named Edge Function; never reverse the database migration destructively.
