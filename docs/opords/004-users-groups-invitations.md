# OPORD 004 — Users, groups, and invitations

## Status

AMBER — authenticated group loading exists; invitation and membership lifecycle require separate product, schema, RLS, and remote authorization.

## Situation and evidence

- Groups are the event permission boundary (`docs/architecture.md:57-61`), and configured users are gated through Query-owned group loading (`docs/architecture.md:35-40`).
- The shell renders a truthful no-group state but offers no authorized creation/invitation path (`app/src/navigation/AppShell.tsx:33-40`).
- Group UI remains among non-migrated fixture-backed surfaces (`docs/architecture.md:17-24`).
- Invitations and onboarding/no-groups are explicitly deferred (`tasks/backlog.md:17-21`).
- Inference: membership roles, invite identity, expiry, revocation, duplicate handling, and event visibility semantics need a written contract before implementation.

## Mission/objective

Define and, only after approval, implement the minimum safe group lifecycle: creation atomically creates the first owner; owners manage the full invitation lifecycle and member removal; ownership transfer protects the last-owner invariant; privilege escalation and cross-group attempts are denied.

## Dependencies

Depends on: OPORD-003, OPORD-006

- OPORD-003 authenticated identity and OPORD-005/006 environment plus RLS readiness.
- Product-approved owner/member role matrix, transfer rule, and removal behavior.
- Safe two-user non-production environment and approved invitation delivery mechanism.

## Non-goals

- Teams/admin SaaS, public discovery, contacts import, follower graph, bulk invites, complex roles, group chat, billing, or generalized onboarding.
- Production email/push infrastructure unless separately ordered.

## Authorized territory (files/systems)

- Contract/UX documentation and read-only inspection first.
- After separate approval: narrowly named domain/service/query/group/invitation screen files, focused tests, approved additive migrations/RLS, and mission/review docs.
- Approved non-production Supabase project and disposable two-user accounts only.

## Forbidden territory

- Existing production memberships/data, destructive migrations, service-role keys in clients, credential discovery, new dependencies, billing/settings/notifications, and unrelated event UI redesign.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.

Creation and invitations must state the group name, inviter, joining impact, and next action in plain language. Use obvious 48x48-point Accept/Decline/Back and removal/transfer confirmations; explain loss of access before confirmation. Avoid role jargon, silent ownership changes, and surprise event exposure.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O004-T1 | 1 | Membership contract designer | Private / gpt-5.3-instant | Group/membership/invitation contracts and lifecycle matrix | Specify atomic group+owner creation, roles, invite pending/accept/decline/expire/revoke/replay, removal, transfer, and last-owner invariants. | Every transition names actor, precondition, atomic outcome, idempotency, and denial behavior. |
| O004-T2 | 1 | Authorization test owner | Private / gpt-5.3-instant | Focused service/RLS tests in approved local seams | Test partial-create rollback, duplicate/wrong-account invites, removed members, last-owner removal, transfer races, self-promotion, and cross-group IDs. | Failures leave no orphan group/membership and all escalation attempts are denied. |
| O004-T3 | 2 | Group lifecycle implementer | Private / gpt-5.3-instant | Separately approved service/query/group/invitation files and additive migration | Implement atomic creation, complete invite lifecycle, removal, and explicit ownership transfer under approved policy. | Exactly one initial owner exists; last owner cannot leave/be removed without successful transfer; invites are idempotent. |
| O004-T4 | 3 | Multi-user verifier | Private / gpt-5.3-instant | Approved non-production database and disposable accounts | Exercise owner/member/nonmember lifecycle, removal effects, transfer, replay, escalation, and direct-ID access. | Evidence proves immediate access loss, retained integrity, and no privilege/cross-group leakage. |

## Acceptance criteria

- Group creation and initial owner membership commit atomically or both roll back.
- Only an owner can invite/revoke/remove/transfer; members cannot self-promote or escalate peers.
- Only the intended authenticated user can accept; replay, expiry, and duplicates are safe and explicit.
- Acceptance creates exactly one membership and reveals only that group's authorized data.
- Removal revokes future access; the last owner cannot leave or be removed until an atomic transfer succeeds.
- Nonmembers cannot read group events, RSVPs, messages, or invitations through direct IDs.
- Existing event loop and configured no-group/auth gates remain truthful.

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Run focused service/query tests named by the approved mission; report lint as placeholder unless changed.
- 390x844 invitation comprehension and acceptance smoke.

### Conditional-staging/mobile-web/human

- RLS policy tests in an approved database environment.
- Multi-user matrix covering owner/member/invitee/nonmember, atomic-create failure, wrong account, expiry, replay, duplicate, revoke, removal, last-owner denial, transfer race, escalation, and direct-ID access.
- Live two-user/RLS: `NOT RUN — safe environment unavailable` until approved.
- Native/human tests recorded separately; lint remains placeholder unless changed.

## Stop conditions/authorization limits

Stop before schema/RLS/remote mutation, delivery integration, production accounts, or runtime files not explicitly approved. Stop if role/identity semantics are unresolved or if a test could expose another user's data.

## Risks/follow-ups

- Invitation tokens and email ownership create security/privacy risk.
- RLS mistakes can cross group boundaries even when UI looks correct.
- Group creation, ownership transfer, member removal, and delivery infrastructure need later orders.

## Definition of done

The approved narrow lifecycle passes contract, RLS, two-user, phone-browser, and desktop-secondary evidence; live/Safari/Chrome/human gaps are explicit; architecture and review log are updated; no generic team-management surface is introduced.
