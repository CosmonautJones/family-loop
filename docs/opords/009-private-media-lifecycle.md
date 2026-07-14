# OPORD 009 — Private media lifecycle

## Status
LOCAL COMPLETE / CONDITIONAL — the hardened private-media lifecycle, loopback Storage/RLS matrix, and configured browser file upload pass; hosted Storage and physical camera/gallery flows remain `NOT RUN`.

## Situation and evidence
Commit `a9769ec` adds a forward-only pending/active/deleting media lifecycle, narrow metadata RPCs, owned private Storage paths, streamed size/signature validation, retryable partial-failure states, and signed resolution. Local Auth-session RLS/Storage attack matrices pass. The configured browser scenario shared two attributed Unsplash-source files and one actual browser-selected JPEG, rendered them through signed access, and preserved them across reloads.

## Mission/objective
Deliver an event-scoped, Query-owned private image lifecycle on Event Detail: choose, upload, list via expiring resolution, handle partial failures, and delete only with authorized confirmation.

## Dependencies
Depends on: OPORD-006, OPORD-007

Completed M1–M2; approved M4 manifest; existing service contract; safe configured storage environment for live RLS proof. Use the browser's native file input with camera/gallery affordances where supported; do not add `expo-image-picker`.

## Non-goals
Albums, editing, video, public links, social feed, bulk management, AI captions, or memories implementation.

## Authorized territory (files/systems)
Media interfaces/adapters/query keys; Event Detail media components; domain types; focused tests; relevant docs/evals. Existing local migration may be inspected; remote storage only under separate approval.

## Forbidden territory
Unapproved dependencies, public bucket/URLs, schema/RLS/migration deployment, credentials, auth/settings, remote destructive cleanup, unrelated redesign, and deployment configuration.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Use a plain labeled 48x48 CSS-pixel “Add photo” action, visible upload progress, readable failure/retry text, and a confirmatory delete action separated from viewing; never rely on icons, hover, swipes, or long-press alone. Give screen readers meaningful image/status text, respect reduced motion, and keep recovery obvious.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O009-T1 | 1 | Media contract tester | Private / gpt-5.3-instant | Media interfaces/adapters and focused tests | Prove event scope, MIME/size rejection, signed resolution, and metadata/object cleanup semantics. | Tests expose partial failures and never treat signed URLs as durable identity. |
| O009-T2 | 2 | Media UI implementer | Private / gpt-5.3-instant | Approved media queries/components/Event Detail files | Add exact-event Query lifecycle, browser file-input upload with camera/gallery hints where supported, private thumbnails, and confirmed recoverable deletion. | Mock 320/390/430 CSS-pixel upload/list/delete passes with explicit loading/error/pending states and no new dependency. |
| O009-T3 | 3 | Storage verifier | Private / gpt-5.3-instant | Approved safe storage/RLS environment | Verify member/nonmember isolation, expiry refresh, and storage cleanup; otherwise record `NOT RUN`. | Two-user evidence proves private scope and no public URL or unauthorized remote change. |

## Acceptance criteria
- Upload creates one event-scoped media record and list refetch shows it.
- Event B and non-members cannot read Event A media.
- Delete removes authorized metadata/object or reports a recoverable partial failure without claiming completion.
- Expired URL refresh works; configured failures have no fixture fallback.
- No public link, new dependency, or remote change is introduced without approval.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| One event-scoped upload and refetch | COMPLETE LOCALLY | Media E2E plus three browser-shared photos and scenario verifier. |
| Event/nonmember isolation | COMPLETE LOCALLY | Uploader/member/owner/outsider Storage/RLS matrix. |
| Authorized delete and recoverable partial failure | COMPLETE LOCALLY | Claim/finalize lifecycle, concurrent abort/upload, manager cases, and UI delete controls. |
| Expired resolution refresh; no fixture fallback | COMPLETE LOCALLY | Signed URLs are resolved on list/refetch; configured failures stay visible. |
| No public link/dependency/remote mutation | COMPLETE | Private bucket/path policy; no new dependency or hosted action. |

Physical iOS Safari/Android Chrome camera/gallery and hosted Storage remain `NOT RUN`.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Label lint as placeholder; run focused adapter tests, 320/390/430 CSS-pixel file-select/upload/list/delete smoke, browser Back/reload recovery, and configured signed-out smoke.

### Conditional-staging/mobile-web/human
Live storage/RLS is required only with an approved safe environment; otherwise NOT RUN. Real-phone iOS Safari camera/gallery, Android Chrome camera/gallery, and human usability are currently NOT RUN.

## Stop conditions/authorization limits
Stop for new dependency, credential access, bucket/policy/migration deployment, destructive remote deletion, unclear orphan-cleanup semantics, or public exposure.

## Risks/follow-ups
Metadata/object split-brain, signed URL expiry, large uploads, browser MIME/orientation differences, conditional camera capture support, and inaccessible destructive controls. Memory derivation waits for OPORD 011.

## Definition of done
Private upload/list/resolve/delete is independently runnable, tested, phone-smoked, documented, review-logged, and all live/partial-failure limitations are explicit.
