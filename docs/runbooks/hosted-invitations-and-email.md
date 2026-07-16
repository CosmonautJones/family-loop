# Hosted invitations and email

## Evidence boundary

This runbook separates LoopedIn's private family invitation from Supabase Auth email. A family invite is an application token tied to one email and family. Supabase confirmation/recovery mail verifies an Auth identity. Custom SMTP does not send the family token unless a trusted server-side LoopedIn sender is implemented.

Never send to a family recipient without an explicitly approved address. Tests use marked disposable identities or one separately approved delivery address. Never record invite tokens, confirmation links, credentials, or message bodies.

## 2026-07-16 diagnosis

The copied-link URL format is `https://loopedin-family.netlify.app/#/invite/<canonical-token>`. Hash routing, signed-out anonymous preview, hash reload, and existing-account acceptance each preserve the canonical 32-byte base64url token. Netlify correctly serves `/`; no catch-all rewrite is required for a fragment route. Database contracts make expired, revoked, declined, consumed, wrong-email, and outsider uses unavailable.

New invited-account signup was broken in deployed source `a45838479634`: `supabaseAdapter.ts` converted the canonical token to hex, then attempted to convert the resulting hex a second time before the anonymous email-match RPC. The second conversion rejected locally, so signup never reached Supabase. A regression now requires exactly one conversion and passes the resulting hex directly to the RPC. Hosted deployment and clean-session proof of the corrected bytes remain pending.

## Hosted Auth configuration readback

Authenticated Management API readback for dedicated staging `vkogznsfthirhxkqysza` shows:

- Site URL exactly `https://loopedin-family.netlify.app`;
- five exact allowed redirects: staging, three retained immutable Netlify deploys, and future `https://app.travisjohnjones.com`;
- email enabled, confirmation required, and signup open;
- configured invite and recovery subjects/templates using Supabase confirmation URLs;
- no custom SMTP host, port, user, password, sender address, or sender name;
- password-change security notification disabled.

These are automated configuration readbacks, not delivery proof. The browser signup intentionally tells a new user to confirm email, return to the original family invitation, and sign in; it does not currently attach the family hash to the Auth confirmation redirect.

## Delivery blocker

The Family screen truthfully says LoopedIn does not send the copied link. No Edge Function, trusted server route, Auth-admin family sender, or transactional mail provider call exists. Therefore there is no failed family-email delivery to repair yet. The smallest production path needs an owner-authorized server-side sender that receives the recipient and plaintext token once, verifies the token hash against the pending invitation, sends through configured SMTP/provider infrastructure, never persists or logs the plaintext token, rate-limits abuse, and records only bounded delivery status. That design preserves hash-only database storage and requires separate security review.

Before delivery can be proven, an operator must configure an authenticated SMTP provider and sender identity, complete any DNS verification/billing gate, enable required security notices, and explicitly approve one recipient address. Provider logs must show accepted/delivered status, and a clean separate browser must confirm and accept the family invitation. Until then, SMTP and real delivered invitation acceptance are `NOT RUN`.
