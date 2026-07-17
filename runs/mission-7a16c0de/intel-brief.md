# Intel brief

Trusted checkpoint is `origin/main` at merge `587ec102bc3b010339072a731a470d15fa4f05ad`. Hosted staging already proves owner-created copied links through clean-recipient acceptance on release `0.1.0-ce4b0c56d30b`; no application email sender exists. Auth Site URL/redirects/templates are configured, but custom SMTP is absent. The rotated staging database password invalidated the GitHub backup connection secret; that is a separate later gate.

The invitation token is generated in the client, converted to hex for database hashing, displayed only after the creation RPC succeeds, and never persisted plaintext. Existing RPCs authorize only the owner and bind token hash, family, email, expiry, and recipient acceptance. Netlify remains static-only. Current Supabase guidance supports authenticated Edge Functions with caller-scoped clients; Resend supports provider idempotency for 24 hours and domain-level tracking disablement.

Hotspots are the security-definer RPC boundary, response loss between provider acceptance and database finalization, logs/telemetry, origin crossover, and retry abuse. A Supabase Edge Function adds one trust boundary; a Netlify Function adds another privileged runtime; an Auth hook cannot carry the application token.
