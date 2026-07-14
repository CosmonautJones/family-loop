# FAMILY-LOOP-OPORD-003 — Authentication and account recovery

## Status

AMBER — existing sign-in/session gate is implemented; recovery implementation is not authorized until product/security decisions and a safe environment are approved.

## Situation and evidence

- Configured builds restore Supabase sessions and gate protected content; unconfigured builds enter deterministic prototype mode (`docs/architecture.md:31-40`).
- The shell explicitly handles restoring, signed-out/error, group loading/error, and no-group states (`app/src/navigation/AppShell.tsx:29-41`).
- M1 evidence passed configured signed-out phone smoke, while live auth was `NOT RUN — ENV unavailable` (`evals/review-log.md:50-65`).
- Auth expansion and credentials are currently forbidden by project policy/current mission. Account recovery behavior, redirect targets, email delivery, rate limits, and production configuration are therefore unverified.

## Mission/objective

After explicit authorization, add the smallest safe password-recovery loop for existing configured accounts while preserving the current session gate and preventing protected content or account enumeration leaks.

## Dependencies

- Product decision: password recovery only; no sign-up/OAuth/profile expansion.
- Security-approved redirect origin/deep-link behavior and Supabase project configuration.
- Safe non-production test accounts and environment; credentials supplied out of repo.
- OPORD-005 environment readiness complete for the intended target.

## Non-goals

- Sign-up, OAuth, magic link sign-in, MFA, profiles, account deletion, group creation, admin, or settings center.
- Credential discovery, production email customization, or auth-provider migration.

## Authorized territory (files/systems)

- Initially: read-only auth contract/UI audit and mission documentation.
- After separate GREEN authorization: existing auth provider/screen/service contract files, focused auth tests, and necessary docs/evals explicitly named in the mission manifest.
- Approved non-production Supabase auth project only, using provided test accounts.

## Forbidden territory

- Production credentials/users, destructive auth operations, secrets in files/logs, schema/RLS changes, new dependencies, unrelated shell/screens, deployment, billing, and teams.

## Older-adult usability guardrail

Use one clearly labeled “Forgot password?” route, plain confirmation language, persistent instructions, readable type, 48x48-point controls, password-manager compatibility, and a forgiving return to sign-in. Avoid timers, jargon, hidden password rules, and revealing whether an email is registered. Announce errors and success to screen readers and avoid unnecessary motion.

## Execution

1. Document the present auth states, adapter methods, redirects, and missing recovery contract with exact evidence.
2. Decide the minimal request-reset and complete-reset states, neutral response copy, expiry/retry behavior, and safe redirect allowlist.
3. Obtain explicit authorization for remote configuration and exact runtime manifest.
4. Implement contract tests first, then the smallest provider/UI path; preserve configured failure visibility and unconfigured mock entry.
5. Validate with disposable non-production accounts; never use or expose real user credentials.
6. Record remote configuration separately from repository behavior.

## Acceptance criteria

- Signed-out users can request a reset without account enumeration.
- A valid approved reset link permits password replacement and returns to a clear authenticated or sign-in state.
- Invalid/expired links and network failures are explicit and recoverable.
- Protected content remains unavailable before valid authentication.
- Existing session restore, sign-in, sign-out, group gates, and unconfigured mock mode regressions pass.

## Validation commands/evidence

### Always-local

- Standard root/app tests, TypeScript, harness, placeholder-qualified lint, and diff/status review.
- 390x844 configured signed-out and recovery UI smoke.

### Conditional-staging/native/human

- Safe-environment matrix: known account, unknown email neutral response, expired link, reused link, offline failure, session restore/sign-out.
- Live recovery: `NOT RUN — safe environment unavailable` until prerequisites exist.
- Native deep-link tests: report each platform honestly.

## Stop conditions/authorization limits

RED: stop before remote auth settings, email templates, credentials, production users, new dependency, deployment, or runtime edits without explicit approval. Stop on ambiguous redirect origin or inability to isolate test accounts.

## Risks/follow-ups

- Misconfigured redirects can leak tokens or strand native users.
- Web success does not prove iOS/Android deep-link behavior.
- Email delivery and throttling are external-system evidence, not guaranteed by code presence.

## Definition of done

Only after separate authorization: acceptance matrix passes in a safe environment, repository checks pass, no secrets appear, native/live limitations are recorded, architecture/security notes and review log are updated, and recovery remains narrower than general account management.
