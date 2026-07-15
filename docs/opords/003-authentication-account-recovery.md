# OPORD 003 — Authentication and account recovery

## Status

STAGING PARTIAL / EXTERNAL CONDITIONAL — local Auth/recovery remains complete; dedicated hosted Auth now has exact staging/immutable/future-production redirects and logged recovery dispatch to the approved owner address. User-observed password replacement, custom SMTP/rate limits, invitation email delivery, and physical-browser checks remain `NOT RUN`.

## Situation and evidence

- Configured builds restore Supabase sessions and gate protected content; unconfigured builds enter deterministic prototype mode (`docs/architecture.md:31-40`).
- The shell explicitly handles restoring, signed-out/error, group loading/error, and no-group states (`app/src/navigation/AppShell.tsx:29-41`).
- Loopback Supabase browser sessions proved invite-bound signup for Maya and Jordan, owner and outsider sign-in, session restoration, reload persistence, and protected direct-route denial.
- A disposable loopback account proved the complete reset lifecycle. Hosted staging now proves exact redirect origins and default-sender recovery dispatch to the approved owner, while user-observed replacement, custom SMTP, production delivery, and provider rate limits remain unverified.

## Mission/objective

After OPORDs 002, 005, and 006 pass, deliver an accessible invite-first identity lifecycle: invited users can sign up or sign in, recover access, restore/end sessions, and complete the minimum profile bootstrap required to join the intended group, without account enumeration or public registration.

## Dependencies

Depends on: OPORD-002, OPORD-005, OPORD-006

- Product decision: invite-first signup/sign-in only; no open registration, OAuth, or broad profile management.
- Security-approved web redirect origins, deep-link/reload behavior, and Supabase project configuration.
- Safe non-production test accounts and environment; credentials supplied out of repo.
- OPORD-005 environment readiness complete for the intended target.

## Non-goals

- Open/self-service sign-up, OAuth, magic-link sign-in, MFA, account deletion, group creation, admin, or settings center.
- Profile fields beyond the minimum accessible display identity required for group membership.
- Credential discovery, production email customization, or auth-provider migration.

## Authorized territory (files/systems)

- Initially: read-only auth contract/UI audit and mission documentation.
- After separate GREEN authorization: existing auth provider/screen/service contract files, focused auth tests, and necessary docs/evals explicitly named in the mission manifest.
- Approved non-production Supabase auth project only, using provided test accounts.

## Forbidden territory

- Production credentials/users, destructive auth operations, secrets in files/logs, schema/RLS changes, new dependencies, unrelated shell/screens, deployment, billing, and teams.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.

Use explicit “Accept invitation,” “Create account,” “Sign in,” and “Forgot password?” routes; plain persistent instructions; readable type; 48x48-point controls; password-manager compatibility; accessible errors; and forgiving return paths. Never reveal whether an email is registered or invited. Profile bootstrap asks only for essential display identity, explains why, and cannot trap the user behind optional fields.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O003-T1 | 1 | Identity contract designer | Private / gpt-5.3-instant | Auth/service contracts, invitation contract (read-only), flow record | Specify invite validation, signup/sign-in, neutral recovery, restore/logout, redirect/expiry/retry, and minimum profile bootstrap states. | State machine denies open registration, uses enumeration-safe responses, and names every accessible error/recovery route. |
| O003-T2 | 1 | Auth test owner | Private / gpt-5.3-instant | Focused auth/session/profile contract tests | Add tests for valid/invalid/expired/wrong-account invite, duplicate signup, known/unknown recovery equivalence, restore/logout, bootstrap retry, and protected-content denial. | Tests run against deterministic seams without real credentials. |
| O003-T3 | 2 | Identity implementer | Private / gpt-5.3-instant | Separately approved auth provider/screen/service/profile-bootstrap manifest | Implement invite-first accessible signup/sign-in, neutral recovery, session lifecycle, and required profile bootstrap; preserve configured failures and mock entry. | Tests pass; optional profile data cannot block entry; no enumeration or public signup exists. |
| O003-T4 | 3 | Staging identity verifier | Private / gpt-5.3-instant | Approved non-production auth project and disposable accounts | Under separate authorization, verify browser redirects, autofill/password-manager behavior, recovery expiry/replay, invite binding, Back/history, deep-link/reload, restore/logout, and profile bootstrap. | Evidence contains no secrets and iOS Safari/Android Chrome results are recorded or `NOT RUN`. |

## Acceptance criteria

- Only a valid intended invitation can start signup; existing invitees can sign in without losing invitation context.
- Signup/sign-in errors and recovery requests do not disclose account or invitation existence.
- A valid approved reset link permits password replacement and returns to a clear authenticated or sign-in state.
- Invalid/expired links and network failures are explicit and recoverable.
- Session restore/logout are deterministic; profile bootstrap is accessible, retryable, idempotent, and limited to required display identity.
- Protected content remains unavailable before valid authentication.
- Existing session restore, sign-in, sign-out, group gates, and unconfigured mock mode regressions pass.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Valid intended invitation gates signup and preserves context | COMPLETE LOCALLY | `3ebb0a0`, `f04fa77`, `e68d615`; two invitees completed browser signup/acceptance. |
| Enumeration-safe signup/sign-in/recovery responses | COMPLETE LOCALLY | Known and unknown loopback recovery requests return the same status/body and visible confirmation; only the known address receives local mail. |
| Approved reset link replaces password | COMPLETE LOCALLY | Local Auth verification token replaced the password; old login failed and new login passed in both service and configured-browser proofs. |
| Invalid/expired links and network failures recover clearly | COMPLETE LOCALLY | Replayed/malformed links return no session and render a new-link path; browser offline injection renders connection-specific safe copy. |
| Session restore/logout and minimal profile bootstrap | COMPLETE LOCALLY | Four-session browser reload and invite-signup display-name flow; monotonic auth guards in `3ebb0a0`. |
| Protected content denied before authentication | COMPLETE | Configured signed-out and outsider direct-route browser evidence. |
| Existing auth/group/mock regressions | COMPLETE | Root/app suites, configured family verifier, and recovery-specific service/browser harnesses pass. |

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Substantive lint is enabled and must pass with zero warnings.
- `tests/supabase-password-recovery-e2e.mjs` and `tests/browser-password-recovery-smoke.mjs` are the token-redacting loopback proofs documented in `docs/runbooks/password-recovery-local-proof.md`.

### Conditional-staging/mobile-web/human

- Safe-environment matrix: valid/invalid/expired/wrong-account invite; new/existing account; known/unknown email neutral recovery; expired/reused reset; offline failure; bootstrap retry; session restore/sign-out.
- Hosted recovery request/dispatch: `PASS` on dedicated staging. User-observed link/password replacement: `NOT RUN`; custom SMTP and physical-browser evidence remain open.
- HTTPS browser-link tests: report iOS Safari and Android Chrome results honestly, including existing/new tab, Back/history, deep-link, and reload behavior.

## Stop conditions/authorization limits

RED: stop before remote auth settings, email templates, credentials, production users, new dependency, deployment, or runtime edits without explicit approval. Stop on ambiguous redirect origin or inability to isolate test accounts.

## Risks/follow-ups

- Misconfigured origins or redirects can leak tokens or strand browser users.
- Desktop success does not prove iOS Safari/Android Chrome autofill or deep-link behavior.
- Email delivery and throttling are external-system evidence, not guaranteed by code presence.

## Definition of done

Only after separate authorization: acceptance matrix passes in a safe environment, repository checks pass, no secrets appear, mobile-browser/live limitations are recorded, architecture/security notes and review log are updated, and recovery remains narrower than general account management.
