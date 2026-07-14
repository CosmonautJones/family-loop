# ADR 001: Data Source and Session Boundary

## Status

Accepted and adopted for the local and configured-Supabase runtime paths. Hosted deployment and operational acceptance remain outside this ADR and are not proven.

## Context

The original M0 context was fixture-heavy. The current runtime uses Query-owned service data for authenticated family, invitation, event, RSVP, comment, media, update, and memory paths; Zustand owns active-family UI selection only. Loopback Supabase migrations, Auth, RLS, private Storage, and multi-session browser behavior are verified locally. No hosted deployment is verified.

## Problem

Incremental persistence could create competing sources of truth or silently show fixture data during configured-backend failures, undermining the event record's reliability.

## Decision

1. With a configured service and authenticated user, service data accessed through TanStack Query is authoritative.
2. The deterministic mock adapter is only for unconfigured operation and explicit tests.
3. Configured initialization, authentication, and request failures remain visible; they never silently fall back to mocks.
4. Query owns server state, cache, refetch, and mutation invalidation.
5. Zustand owns transient UI state only, not durable events, RSVPs, messages, media, profiles, or memberships.
6. Migrated surfaces explicitly represent loading, error, empty, and populated states.
7. Session resolution gates authenticated queries.
8. Local loopback evidence and hosted/production evidence are reported separately; local success never implies deployment, recovery email, backup, or restore readiness.
9. Release web artifacts compile only a runtime-config bootstrap. Before rendering `App`, the bootstrap fetches and validates one public, non-secret `/runtime-config.json`; service and Supabase clients are lazy and cannot be created first. Native and development builds retain the explicit compile-environment path.

## Alternatives

- **Fixtures until a total cutover:** rejected because it delays end-to-end proof and enlarges risk.
- **Fallback on every backend error:** rejected because fabricated data could look durable.
- **Mirror fetched records in Zustand:** rejected because it duplicates Query ownership.
- **Remove mocks:** rejected because deterministic unconfigured development and testing remain useful.

## Consequences

- Vertical slices can migrate sequentially with one owner.
- Failures are truthful and diagnosable, though less polished.
- Mutations invalidate/update Query rather than durable Zustand mirrors.
- Deterministic fixtures remain seed/test inputs, not a configured-backend fallback.
- One immutable web artifact can move between environments; the environment overlay is independently reviewed, served with `no-store`, and fails closed before protected UI or services exist.

## Assumptions and inferences

- **Assumption:** Existing service/schema code is the intended starting point and may need narrow corrections.
- **Verified locally:** Authenticated RLS with the publishable/anonymous client key passed owner/member/outsider lifecycle matrices on loopback Supabase. Hosted policy state remains unverified.
- **Inference:** The event backbone before thread/media/reminder/memory slices is the lowest-risk order.
- **Inference:** Memories remain event-derived absent a separate durable-memory requirement.

## Non-decisions

This ADR does not choose or authorize a production project, deployment workflow, secrets process, recovery-email configuration, push delivery system, billing, or a standalone memories model. Local RLS/private-Storage evidence is recorded in the review log; realtime subscriptions and every hosted operational claim remain outside the adopted boundary.

## Validation

- M0 verifies documentation consistency.
- M1 proves session/loading/error behavior without silent fallback.
- M2-M6 prove explicit states, Query ownership, invalidation, and reload durability per resource.
- M6 runs the full phone loop/contracts and verifies RLS/storage only with a safe capable environment.
- Harness, root/app tests, TypeScript, and diff checks remain required.

## Evidence links

- [`architecture`](../architecture.md)
- [`core loop`](../core-loop.md)
- [`anti-goals`](../anti-goals.md)
- [`current mission`](../../tasks/current-mission.md)
- [`campaign backlog`](../../tasks/backlog.md)
- [`regression checklist`](../../evals/regression-checklist.md)
- [`service selection`](../../app/src/services/index.ts)
- [`Supabase session client`](../../app/src/services/supabaseClient.ts)
- [`Query hooks`](../../app/src/app/queries.ts)
- [`Zustand store`](../../app/src/store/useLoopedInStore.ts)
- [`initial database migration`](../../supabase/migrations/20260705214111_loopedin_initial_infra.sql)
