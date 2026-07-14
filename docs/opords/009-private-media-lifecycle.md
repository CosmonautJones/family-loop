# OPORD 009 — Private media lifecycle

## Status
Planned as M4 after M2; remote storage/RLS is unverified and Docker is unavailable.

## Situation and evidence
The service already exposes upload/list/delete (`app/src/services/api.ts:92-101`) and adapters contain prototype implementations (`app/src/services/supabaseAdapter.ts:499-545`; `app/src/services/mockAdapter.ts:130-139`). Event Detail only stages counts locally and says upload is not wired (`app/src/screens/EventDetailScreen.tsx:123-133`). The migration defines private media rows, bucket, and policies (`supabase/migrations/20260705214111_loopedin_initial_infra.sql:393-414,460-506`), not verified deployment (`docs/architecture.md:41`). M4 requires private upload/list/resolve/delete (`tasks/backlog.md:11`).

## Mission/objective
Deliver an event-scoped, Query-owned private image lifecycle on Event Detail: choose, upload, list via expiring resolution, handle partial failures, and delete only with authorized confirmation.

## Dependencies
Depends on: OPORD-006, OPORD-007

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
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O009-T1 | 1 | Media contract tester | Private / gpt-5.3-instant | Media interfaces/adapters and focused tests | Prove event scope, MIME/size rejection, signed resolution, and metadata/object cleanup semantics. | Tests expose partial failures and never treat signed URLs as durable identity. |
| O009-T2 | 2 | Media UI implementer | Private / gpt-5.3-instant | Approved media queries/components/Event Detail files | Add exact-event Query lifecycle, authorized picker/upload, private thumbnails, and confirmed recoverable deletion; stop for dependencies. | Mock 390x844 upload/list/delete passes with explicit loading/error/pending states. |
| O009-T3 | 3 | Storage verifier | Private / gpt-5.3-instant | Approved safe storage/RLS environment | Verify member/nonmember isolation, expiry refresh, and storage cleanup; otherwise record `NOT RUN`. | Two-user evidence proves private scope and no public URL or unauthorized remote change. |

## Acceptance criteria
- Upload creates one event-scoped media record and list refetch shows it.
- Event B and non-members cannot read Event A media.
- Delete removes authorized metadata/object or reports a recoverable partial failure without claiming completion.
- Expired URL refresh works; configured failures have no fixture fallback.
- No public link, new dependency, or remote change is introduced without approval.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Label lint as placeholder; run focused adapter tests named by the mission, 390x844 upload/list/delete smoke, and configured signed-out smoke.

### Conditional-staging/native/human
Live storage/RLS is required only with an approved safe environment; otherwise NOT RUN. Native picker and human usability: currently NOT RUN.

## Stop conditions/authorization limits
Stop for new dependency, credential access, bucket/policy/migration deployment, destructive remote deletion, unclear orphan-cleanup semantics, or public exposure.

## Risks/follow-ups
Metadata/object split-brain, signed URL expiry, large uploads, platform URI differences, and inaccessible destructive controls. Memory derivation waits for OPORD 011.

## Definition of done
Private upload/list/resolve/delete is independently runnable, tested, phone-smoked, documented, review-logged, and all live/partial-failure limitations are explicit.
