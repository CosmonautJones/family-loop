# OPORD 009 — Private media lifecycle

## Status
Planned as M4 after M2; remote storage/RLS is unverified and Docker is unavailable.

## Situation and evidence
The service already exposes upload/list/delete (`app/src/services/api.ts:92-101`) and adapters contain prototype implementations (`app/src/services/supabaseAdapter.ts:499-545`; `app/src/services/mockAdapter.ts:130-139`). Event Detail only stages counts locally and says upload is not wired (`app/src/screens/EventDetailScreen.tsx:123-133`). The migration defines private media rows, bucket, and policies (`supabase/migrations/20260705214111_loopedin_initial_infra.sql:393-414,460-506`), not verified deployment (`docs/architecture.md:41`). M4 requires private upload/list/resolve/delete (`tasks/backlog.md:11`).

## Mission/objective
Deliver an event-scoped, Query-owned private image lifecycle on Event Detail: choose, upload, list via expiring resolution, handle partial failures, and delete only with authorized confirmation.

## Dependencies
Completed M1–M2; approved M4 manifest; existing service contract; safe configured storage environment for live RLS proof. Inference: a platform image picker may require a dependency, which is RED until separately approved.

## Non-goals
Albums, editing, video, public links, social feed, bulk management, AI captions, or memories implementation.

## Authorized territory (files/systems)
Media interfaces/adapters/query keys; Event Detail media components; domain types; focused tests; relevant docs/evals. Existing local migration may be inspected; remote storage only under separate approval.

## Forbidden territory
Unapproved dependencies, public bucket/URLs, schema/RLS/migration deployment, credentials, auth/settings, remote destructive cleanup, unrelated redesign, and deployment configuration.

## Older-adult usability guardrail
Use a plain labeled 48x48-point “Add photo” action, visible upload progress, readable failure/retry text, and a confirmatory delete action separated from viewing; never rely on icons, swipes, or long-press alone. Give screen readers meaningful image/status text, respect reduced motion, and keep recovery obvious.

## Execution
1. Prove adapter semantics: exact event scoping, MIME/size rejection, signed resolution, metadata/storage cleanup behavior.
2. Add exact-event media Query keys and mutation invalidation with explicit loading/empty/error/pending states.
3. Replace staged-count copy with the narrowest authorized picker/upload path; if picker support needs a dependency, stop.
4. Render private thumbnails without persisting signed URLs as durable identity.
5. Add deliberate delete confirmation and recoverable partial-failure handling.
6. Verify mock phone behavior and, if safely available, two-user member/non-member RLS and storage cleanup.

## Acceptance criteria
- Upload creates one event-scoped media record and list refetch shows it.
- Event B and non-members cannot read Event A media.
- Delete removes authorized metadata/object or reports a recoverable partial failure without claiming completion.
- Expired URL refresh works; configured failures have no fixture fallback.
- No public link, new dependency, or remote change is introduced without approval.

## Validation commands/evidence
### Always-local
Run root/app tests, `npx tsc --noEmit`, placeholder lint honestly labeled, harness, `git diff --check`, focused adapter tests, 390x844 upload/list/delete smoke, and configured signed-out smoke.

### Conditional-staging/native/human
Live storage/RLS is required only with an approved safe environment; otherwise NOT RUN. Native picker and human usability: currently NOT RUN.

## Stop conditions/authorization limits
Stop for new dependency, credential access, bucket/policy/migration deployment, destructive remote deletion, unclear orphan-cleanup semantics, or public exposure.

## Risks/follow-ups
Metadata/object split-brain, signed URL expiry, large uploads, platform URI differences, and inaccessible destructive controls. Memory derivation waits for OPORD 011.

## Definition of done
Private upload/list/resolve/delete is independently runnable, tested, phone-smoked, documented, review-logged, and all live/partial-failure limitations are explicit.
