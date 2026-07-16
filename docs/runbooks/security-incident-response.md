# Security incident response

This runbook is the local response baseline for suspected authorization failure, exposed client errors, or family-data leakage. It does not authorize production access or remediation.

## Ownership and severity

- Incident owner: the named LoopedIn service owner for the affected environment. Until one is named, Command owns coordination and remote action is blocked.
- SEV-1: confirmed cross-family disclosure, credential/token exposure, or ongoing unauthorized writes.
- SEV-2: suspected disclosure, repeated authorization bypass, or a user-visible error containing backend detail.
- SEV-3: isolated safe failure with no evidence of disclosure or unauthorized mutation.

## Sensitive fields

Never copy credentials, passwords, invite/access/refresh/service-role tokens, authorization headers, signed URLs or query strings, message/notification bodies, captions/alt text, email addresses, storage paths, SQL text, database hints, or raw backend responses into evidence. Use only time window, environment name, affected operation, safe error category, aggregate count, response status, and a server-generated correlation ID when one already exists.

## Response sequence

1. Stop the affected test or workflow. Do not inspect additional family records.
2. Record the reporter, time window, named environment, operation, safe category, and whether exposure is suspected or confirmed. Preserve existing logs read-only; do not broaden collection.
3. Assign severity and incident owner. A suspected real exposure is at least SEV-2.
4. Escalate before containment. Remote policy changes, credential rotation, account suspension, data deletion, deployment, vendor contact, and user notification require the named incident owner's explicit authorization.
5. In an authorized disposable environment, reproduce with synthetic records only. Verify the affected actor, group/event isolation, and the user-safe error boundary without copying content.
6. Apply the smallest authorized correction. Validate denied cross-user access, permitted recovery, calm user copy, and absence of sensitive fields in emitted evidence.
7. Recover only after the incident owner approves. Re-run family/media isolation checks, the redaction tests, and the affected journey; monitor safe aggregate outcomes.
8. Close with scope, evidence locations, decisions, remaining uncertainty, and follow-ups. Retention/deletion follows an approved policy; none is assumed here.

## Local tabletop — 2026-07-14

Scenario: during a configured loopback-Supabase comment retry, the browser displayed `Failed to fetch`; assume a later backend error could also contain a signed URL, storage path, token, or family message detail.

- Detection/classification: user-visible raw transport detail; SEV-2 suspected exposure until bounded.
- Preservation: retained the existing local test description and aggregate scenario counts only. No secret, URL, storage path, message body, or raw backend response was copied into the incident record.
- Escalation/authority: Command remained coordinator. No hosted environment was accessed; no credentials were rotated, policies changed, users contacted, or data deleted.
- Containment exercise: stopped at the local adapter boundary and added category-based sanitization for network, session, access, conflict, rate-limit, and unknown failures.
- Recovery validation: injected synthetic sensitive values and a rejected `sendMessage` transport promise; tests proved calm network copy, preserved safe validation copy, and no sensitive substring emission.
- Outcome: local tabletop closed with no production action. Hosted telemetry, response ownership, retention, and external assessment remain `NOT RUN` pending named authority and environment.

## Hosted staging telemetry checkpoint — 2026-07-16

Staging now has a deliberately narrow incident signal. Authenticated clients may report only bounded operation/category/release tuples; the server supplies environment and time. Event rows expire after 30 days, per-user limiter state after 24 hours, and hourly maintenance produces aggregate counts. No email, family/user identifier in event rows, message/title/comment/media content, path, URL, token, stack, user agent, IP, session replay, or behavioral analytics is accepted.

Hosted proof accepted five synthetic events, rejected the sixth at the rate limit, and denied anonymous and invalid submissions. Normal monitor runs `29465130680`, `29465174337`, and `29466991186` were GREEN. Controlled alert run `29465157215` failed intentionally; this is alert-path evidence, not an unresolved incident. Initial runs `29464425396` and `29465087407` failed because the operator configured the protected secret incorrectly; the wiring was corrected without printing or retaining the value.

For a suspected issue, preserve only the workflow/run ID, environment, release, operation/category aggregate, and time window. Do not query event rows to reconstruct user behavior. Production incident ownership and routing, external assessment, and any notification to users remain separately authorized and unproven.
