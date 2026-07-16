# Hosted invitations and email

## Evidence boundary

This runbook separates LoopedIn's private family invitation from Supabase Auth email. A family invite is an application token tied to one email and family. Supabase confirmation/recovery mail verifies an Auth identity. Custom SMTP does not send the family token unless a trusted server-side LoopedIn sender is implemented.

Never send to a family recipient without an explicitly approved address. Tests use marked disposable identities or one separately approved delivery address. Never record invite tokens, confirmation links, credentials, or message bodies.

## 2026-07-16 diagnosis

The copied-link URL format is `https://loopedin-family.netlify.app/#/invite/<canonical-token>`. Hash routing, signed-out anonymous preview, hash reload, and existing-account acceptance each preserve the canonical 32-byte base64url token. Netlify correctly serves `/`; no catch-all rewrite is required for a fragment route. Database contracts make expired, revoked, declined, consumed, wrong-email, and outsider uses unavailable.

New invited-account signup was broken in deployed source `a45838479634`: `supabaseAdapter.ts` converted the canonical token to hex, then attempted to convert the resulting hex a second time before the anonymous email-match RPC. The second conversion rejected locally, so signup never reached Supabase. A regression now requires exactly one conversion and passes the resulting hex directly to the RPC.

PR #9 passed CI run `29503514124` at exact source `ce4b0c56d30bef6c85a8589f76ffb2e09f4fced9`; all application, security, migration, and release jobs were GREEN, and independent review reported zero findings. CI artifact `loopedin-web-ce4b0c56d30bef6c85a8589f76ffb2e09f4fced9` has application digest `fe7470cc5bf4e769fcfe37faf9dd6cf2069ae77e350b09051108771a89ce73df` and release `0.1.0-ce4b0c56d30b`.

The downloaded artifact was wrapped with the unchanged staging runtime configuration, reverified, uploaded as immutable Netlify deploy `6a58e22e48d42235e0ea40e0`, and promoted unchanged to `https://loopedin-family.netlify.app`. Prior deploy `6a5863f6aebae3714ef3906c` is the rollback target. HTTPS shell/runtime/Auth health, release/environment headers, backend CSP, runtime `no-store`, missing-asset 404, and exact release identity pass.

Superseding hosted run `iqa-mrnli3aw-18956cda` used only marked disposable owner/recipient accounts and fresh Chrome profiles. The owner signed into the hosted Family UI, entered the recipient, pressed **Create invitation link**, and the harness captured the exact displayed canonical URL as the copy/paste value. A clean recipient profile proved valid signed-out preview, exact hash preservation across reload, sign-in, UI acceptance, post-accept session reload, and consumed-link unavailability in another clean profile. Exact user/family/invitation/entitlement/object cleanup left zero residue, including response-loss discovery by exact run markers. Automated clipboard-API confirmation was not observed and is not claimed. A first broader attempt also tried unconfirmed invited-account signup but did not reach confirmation-required evidence; cleanup succeeded, and that path remains `NOT RUN` until real Auth email delivery is configured. Hosted browser observations for revoked and expired links also remain `NOT RUN`; database/local UI contracts cover them but are not mislabeled as hosted proof.

Rollback selected `6a5863f6aebae3714ef3906c` and verified release `0.1.0-a45838479634`; restoration selected `6a58e22e48d42235e0ea40e0` and verified `0.1.0-ce4b0c56d30b`. No database migration was reversed.

## Hosted Auth configuration readback

Authenticated Management API readback for dedicated staging `vkogznsfthirhxkqysza` shows:

- Site URL exactly `https://loopedin-family.netlify.app`;
- five exact allowed redirects: staging, three retained immutable Netlify deploys, and future `https://app.travisjohnjones.com`;
- email enabled, confirmation required, and signup open;
- configured invite and recovery subjects/templates using Supabase confirmation URLs;
- no custom SMTP host, port, user, password, sender address, or sender name;
- password-change security notification disabled.

These are automated configuration readbacks, not delivery proof. The browser signup intentionally tells a new user to confirm email, return to the original family invitation, and sign in; it does not currently attach the family hash to the Auth confirmation redirect.

## Delivery implementation checkpoint

The repository now contains a separately triggered owner-only invitation-email action, a private metadata-only delivery ledger, a caller-scoped prepare RPC, a service-role-only finalize RPC, and a text-only Resend Edge Function. Prepare owns the authorization decision; finalize receives the trusted caller identity from the function and revalidates account, delivery, invitation, token, expiry, status, and current ownership. Stable provider idempotency, counted/cooled retries, per-invitation and actor/family bounds, fail-closed stale operations, and a streamed 2 KiB request cap protect the copied-link flow. Provider failure does not revoke the link, and the UI never claims delivery.

Hosted configuration requires `LOOPEDIN_APP_ORIGIN`, `RESEND_INVITATION_API_KEY`, and `RESEND_INVITATION_FROM`. Supabase Auth SMTP remains a separate requirement for confirmation and recovery mail. Resend click and open tracking must be disabled in provider settings; the text-only API request does not prove that provider setting.

- Automated: focused core/static/orchestration tests and local Supabase invitation-email E2E pass, including service-only finalization, streamed size enforcement, counted replay, stale-operation, aggregate-rate, private-ledger, and provider-failure/link-preservation checks.
- Manually observed: none for the sender.
- Still unproven: Edge Function deployment/secrets, verified sender identity, provider tracking settings, accepted/delivered provider status, inbox receipt, new-account confirmation, and clean-browser invitation acceptance. No real email was sent.
