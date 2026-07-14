# FAMILY-LOOP-OPORD-004 — Users, groups, and invitations

## Status

AMBER — authenticated group loading exists; invitation and membership lifecycle require separate product, schema, RLS, and remote authorization.

## Situation and evidence

- Groups are the event permission boundary (`docs/architecture.md:57-61`), and configured users are gated through Query-owned group loading (`docs/architecture.md:35-40`).
- The shell renders a truthful no-group state but offers no authorized creation/invitation path (`app/src/navigation/AppShell.tsx:33-40`).
- Group UI remains among non-migrated fixture-backed surfaces (`docs/architecture.md:17-24`).
- Invitations and onboarding/no-groups are explicitly deferred (`tasks/backlog.md:17-21`).
- Inference: membership roles, invite identity, expiry, revocation, duplicate handling, and event visibility semantics need a written contract before implementation.

## Mission/objective

Define and, only after approval, implement the minimum private-group invitation loop: an existing authorized member invites one person, the invitee accepts into the intended group, and both see only group-scoped events.

## Dependencies

- OPORD-003 authenticated identity and OPORD-005/006 environment plus RLS readiness.
- Product-approved role matrix (at minimum inviter eligibility and member behavior).
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

Invitations must state in plain language who invited the person, the group name, what joining shares, and one obvious 48x48-point Accept action plus safe Decline/Back. Use readable type, screen-reader labels, reduced motion, and a clear recovery path. Avoid role jargon, ambiguous link destinations, tiny token entry, and surprise exposure of events.

## Execution

1. Specify group, membership, invitation, inviter, invitee, status, expiry, and audit semantics; label all unverified database assumptions.
2. Define authorization cases: invite, view, accept, decline, revoke, duplicate, expired, already-member, wrong-account.
3. Design the smallest no-group/invite-entry route without turning Groups into an admin dashboard.
4. Obtain separate approval for exact schema/RLS/runtime/remote manifests.
5. Implement contract and RLS tests before UI, then the narrow invitation path.
6. Verify with two isolated users and exact group/event visibility; record delivery mechanism limitations.

## Acceptance criteria

- Only an authorized group member can create/revoke an invitation under the approved role rule.
- Only the intended authenticated user can accept; replay, expiry, and duplicates are safe and explicit.
- Acceptance creates exactly one membership and reveals only that group's authorized data.
- Nonmembers cannot read group events, RSVPs, messages, or invitations through direct IDs.
- Existing event loop and configured no-group/auth gates remain truthful.

## Validation commands/evidence

### Always-local

- Standard repository checks plus focused service/query tests.
- 390x844 invitation comprehension and acceptance smoke.

### Conditional-staging/native/human

- RLS policy tests in an approved database environment.
- Two-user matrix covering inviter/invitee/nonmember, wrong account, expiry, replay, duplicate, revoke, and direct-ID access.
- Live two-user/RLS: `NOT RUN — safe environment unavailable` until approved.
- Native/human tests recorded separately; lint remains placeholder unless changed.

## Stop conditions/authorization limits

Stop before schema/RLS/remote mutation, delivery integration, production accounts, or runtime files not explicitly approved. Stop if role/identity semantics are unresolved or if a test could expose another user's data.

## Risks/follow-ups

- Invitation tokens and email ownership create security/privacy risk.
- RLS mistakes can cross group boundaries even when UI looks correct.
- Group creation, ownership transfer, member removal, and delivery infrastructure need later orders.

## Definition of done

The approved narrow lifecycle passes contract, RLS, two-user, phone, and regression evidence; live/native/human gaps are explicit; architecture and review log are updated; no generic team-management surface is introduced.
