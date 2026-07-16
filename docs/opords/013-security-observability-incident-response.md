# OPORD 013 — Security, Observability, and Incident Response

## Status
STAGING OBSERVABILITY PASS / PRODUCTION CONDITIONAL — dedicated staging passes authorization/private-media denial, no-secret availability, privacy-safe authenticated error ingestion, rate limiting, retention, and manually exercised aggregate monitoring with an hourly schedule configured. The first scheduled telemetry run, named production ownership/routing, production alerting, and external assessment remain `NOT RUN`.

## Situation and evidence
Loopback and dedicated hosted synthetic family/media matrices use real Auth sessions to test owner/member/outsider and direct-mutation attacks. Raw invite tokens are hash-only server-side; generated credentials/tokens are redacted. Public availability and locked authenticated error reporting record only bounded operational fields and aggregates; they collect no family content or behavioral analytics. Named production ownership/routing and external assessment remain unevidenced.

## Mission/objective
Create a minimal, privacy-preserving verification and response baseline for authorization failures, client errors, and suspected data exposure without deploying monitoring infrastructure.

## Dependencies
Depends on: OPORD-005, OPORD-006, OPORD-012

Approved security mission, named system owner, data classification/retention decisions, and a safe disposable Supabase environment for live RLS tests.

## Non-goals
SOC 2 program, SIEM procurement, penetration testing claims, auth redesign, production monitoring deployment, or collection of message/photo contents.

## Authorized territory (files/systems)
Focused authorization tests, redaction helpers using existing facilities, error-boundary/logging seams, docs/runbooks/evals. Safe read-only configuration inspection and separately approved disposable-environment tests.

## Forbidden territory
Secrets, production logs/data, remote policy/migration deployment, new observability vendors/dependencies, auth expansion, destructive remediation, or contacting users/third parties.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Security failures must use calm plain language and readable type, preserve safe navigation, avoid blame, and provide a 48x48-point retry/sign-in action; internal codes may supplement but not replace understandable copy. Announce recovery state to screen readers and avoid unnecessary motion.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O013-T1 | 1 | Security analyst | Private / gpt-5.5 | trust-boundary inventory, redaction spec, docs/evals | Inventory sensitive fields without reading secrets/content; define redaction and minimal metadata taxonomy. | Inventory covers tokens, bodies and signed URLs; tests prove these are absent from emitted evidence. |
| O013-T2 | 2 | Security builder | Private / gpt-5.5 | authorization/redaction tests, existing error seams | Add configured-boundary and safe cross-user tests; keep errors understandable and non-leaking. | Local tests pass; live RLS is either evidenced in disposable staging or NOT RUN. |
| O013-T3 | 3 | Incident lead/reviewer | Sergeant / gpt-5.3-instant | incident runbook, tabletop record, review log | Define detect, preserve, escalate, authorized containment, recovery and review; run tabletop only. | Runbook names severity/owner/authority; tabletop closes with no production action. |

## Acceptance criteria
- Logs/tests do not expose credentials, tokens, message bodies, or signed media URLs.
- Safe two-user tests prove group/event isolation or remain explicitly blocked/NOT RUN.
- Runbook assigns severity, owner, evidence preservation, authorization gates, and recovery validation.
- User-facing auth/data failures remain understandable and non-leaking.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Evidence avoids secrets/tokens/message bodies/signed URLs | COMPLETE LOCALLY | Executable sanitizer tests inject credentials, tokens, a signed URL, message content, storage paths, and raw database detail; emitted user errors contain none of them. Existing lifecycle verifiers report aggregates/IDs without signed access values. |
| Safe two-user group/event isolation | COMPLETE LOCALLY | Four-session family/browser/media RLS matrices and outsider direct-route denial. |
| Incident severity/owner/preservation/gates/runbook | COMPLETE LOCALLY | `docs/runbooks/security-incident-response.md` assigns SEV levels, conditional ownership, minimal evidence, authorization gates, recovery validation, and records a no-production-action tabletop. |
| Understandable non-leaking user failures | COMPLETE LOCALLY | Supabase service calls are wrapped at the adapter boundary, including rejected transport promises; safe domain validation remains intact, safe service errors are idempotent, and browser recovery retains actionable network copy during a real offline request. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
rg -n "service_role|SUPABASE_SERVICE|BEGIN (RSA|OPENSSH) PRIVATE KEY" docs/opords tests app/src
```

Focused executable redaction coverage includes a configured `sendMessage` transport rejection. The OPORD 012 390x844 outage was the reproducer; the local tabletop and recovery contract are recorded in `docs/runbooks/security-incident-response.md`. Inspect secret-scan matches rather than treating any match as proof.

### Conditional-staging/mobile-web/human
Dedicated staging live RLS/Storage denial, public availability, bounded error ingestion, manually dispatched aggregate monitoring, and a controlled alert are `PASS`. The hourly telemetry schedule is configured but not yet observed. Production monitoring ownership/routing and external security assessment remain `NOT RUN`.

## Stop conditions/authorization limits
Stop on any suspected real exposure and escalate; do not inspect more data, rotate credentials, change remote policy, notify users, or deploy containment without incident-owner authorization. Stop before vendors/dependencies.

## Risks/follow-ups
False confidence from synthetic-only hosted evidence, overcollection, missing physical-browser failures, and unnamed hosted incident ownership. Production monitoring, retention, and external assessment are separate decisions.

## Definition of done
Minimal redaction tests and runbook are reviewable, tabletop evidence exists, live limitations are explicit, and no operational or remote action was taken without approval.

## Superseding staging disposition — 2026-07-16

- Locked telemetry stores only server time/environment plus bounded operation, category, and immutable release. Event retention is 30 days; identifier-bearing limiter state is 24 hours; the hourly monitor emits aggregates only. No content, email, name, title, comment, media path, URL, token, stack, user agent, IP, session replay, or behavioral analytics is collected.
- Hosted ingestion proof accepted five authenticated reports, rate-limited the sixth, and denied anonymous and invalid payloads. Normal monitor runs `29465130680`, `29465174337`, and final `29466991186` were GREEN. Controlled `force_alert` run `29465157215` failed as designed to prove the alert path.
- Initial runs `29464425396` and `29465087407` failed because the operator wired the protected environment secret incorrectly; the wiring was corrected without exposing the value. These are configuration evidence, not product incidents.
- Final no-secret availability run `29466990331` is GREEN. Production ownership/routing, real SMTP and password recovery completion, physical-device/AT checks, and external assessment remain open.
