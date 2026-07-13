# ADR 001: Data Source and Session Boundary

## Status

Accepted for the M0-M6 campaign; runtime adoption is staged and is not complete at M0.

## Context

Rendered screens currently use deterministic fixtures. The repository also contains mock and Supabase adapters, Query hooks, Zustand state, and core schema definitions. Docker is unavailable, and neither a local stack nor remote deployment has been verified.

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

## Alternatives

- **Fixtures until a total cutover:** rejected because it delays end-to-end proof and enlarges risk.
- **Fallback on every backend error:** rejected because fabricated data could look durable.
- **Mirror fetched records in Zustand:** rejected because it duplicates Query ownership.
- **Remove mocks:** rejected because deterministic unconfigured development and testing remain useful.

## Consequences

- Vertical slices can migrate sequentially with one owner.
- Failures are truthful and diagnosable, though less polished.
- Mutations invalidate/update Query rather than durable Zustand mirrors.
- Existing fixture screens remain until their mission.

## Assumptions and inferences

- **Assumption:** Existing service/schema code is the intended starting point and may need narrow corrections.
- **Assumption:** Authenticated RLS with a publishable/anonymous client key is intended; it is not live-verified.
- **Inference:** The event backbone before thread/media/reminder/memory slices is the lowest-risk order.
- **Inference:** Memories remain event-derived absent a separate durable-memory requirement.

## Non-decisions

No production project, deployment workflow, secrets process, migration runner, broader Auth UX, onboarding, invitations, navigation library, push delivery system, billing, or standalone memories model is chosen or authorized. This ADR makes no live RLS, realtime, or storage claim.

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
