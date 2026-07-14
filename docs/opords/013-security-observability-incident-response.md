# OPORD 013 — Security, observability, and incident response

## Status
Planned hardening mission; repository policy definitions exist but remote enforcement and operational response are unverified.

## Situation and evidence
RLS is declared for messages, media, notifications, and reminders (`supabase/migrations/20260705214111_loopedin_initial_infra.sql:241-255`), but Docker is unavailable and remote deployment is unverified (`docs/architecture.md:41`; `evals/review-log.md:74`). The configured app gates protected content (`docs/architecture.md:30`). No production telemetry or incident runbook is evidenced; this is an inference from repository inspection.

## Mission/objective
Create a minimal, privacy-preserving verification and response baseline for authorization failures, client errors, and suspected data exposure without deploying monitoring infrastructure.

## Dependencies
Approved security mission, named system owner, data classification/retention decisions, and a safe disposable Supabase environment for live RLS tests.

## Non-goals
SOC 2 program, SIEM procurement, penetration testing claims, auth redesign, production monitoring deployment, or collection of message/photo contents.

## Authorized territory (files/systems)
Focused authorization tests, redaction helpers using existing facilities, error-boundary/logging seams, docs/runbooks/evals. Safe read-only configuration inspection and separately approved disposable-environment tests.

## Forbidden territory
Secrets, production logs/data, remote policy/migration deployment, new observability vendors/dependencies, auth expansion, destructive remediation, or contacting users/third parties.

## Older-adult usability guardrail
Security failures must use calm plain language and readable type, preserve safe navigation, avoid blame, and provide a 48x48-point retry/sign-in action; internal codes may supplement but not replace understandable copy. Announce recovery state to screen readers and avoid unnecessary motion.

## Execution
1. Inventory sensitive fields and trust boundaries without reading secrets or user content.
2. Define redaction rules and a minimal event taxonomy containing identifiers/status, not bodies or media URLs.
3. Add executable configured-boundary and cross-user authorization tests where safe.
4. Write a triage runbook: detect, contain proposal, preserve evidence, escalate, communicate authorization, recover, review.
5. Exercise a tabletop scenario; do not perform production containment.

## Acceptance criteria
- Logs/tests do not expose credentials, tokens, message bodies, or signed media URLs.
- Safe two-user tests prove group/event isolation or remain explicitly blocked/NOT RUN.
- Runbook assigns severity, owner, evidence preservation, authorization gates, and recovery validation.
- User-facing auth/data failures remain understandable and non-leaking.

## Validation commands/evidence
### Always-local
Run standard checks plus focused redaction/authorization tests, a secret-pattern scan limited to changed files, 390x844 configured failure smoke, and a recorded tabletop.

### Conditional-staging/native/human
Remote/live RLS, production telemetry, and external security assessment are NOT RUN unless separately approved.

## Stop conditions/authorization limits
Stop on any suspected real exposure and escalate; do not inspect more data, rotate credentials, change remote policy, notify users, or deploy containment without incident-owner authorization. Stop before vendors/dependencies.

## Risks/follow-ups
False confidence from migration text, overcollection, missing native crashes, and unclear incident ownership. Production monitoring and external assessment are separate decisions.

## Definition of done
Minimal redaction tests and runbook are reviewable, tabletop evidence exists, live limitations are explicit, and no operational or remote action was taken without approval.
