# Current Mission

Mission ID: `FAMILY-LOOP-WEB-001`

Status: Complete — external Run 3 accepted AMBER / PROCEED-WARN with zero blockers.

## Objective

Correct the product and all 17 planned OPORDs to one platform stance: LoopedIn is a responsive web app built with Expo and React Native Web, optimized first for iOS Safari and Android Chrome phone browsers, with desktop web as a usable secondary surface.

## Non-goals

- Runtime application changes, new dependencies, environment/configuration changes, remote mutations, or deployment.
- Changing the 17 OPORD IDs, 60 task contracts, dependency graph, canonical order, or backend/server/database scope.
- Treating Expo native targets, EAS, app stores, or native applications as current delivery requirements.
- Rewriting historical records as though earlier evidence used the corrected platform stance.

## Authorized manifest

- `README.md`
- `app/README.md`
- `docs/vision.md`
- `docs/core-loop.md`
- `docs/taste-bar.md`
- `docs/anti-goals.md`
- `docs/architecture.md`
- `docs/04-spec-roadmap.md`
- `docs/10-loop-architecture-and-workflow.md`
- `docs/opords/**`
- `tests/spec-docs.test.js`
- `tasks/current-mission.md`
- `tasks/backlog.md`
- `tasks/completed.md`
- `evals/review-log.md`
- `evals/product-rubric.md`
- `evals/code-rubric.md`
- `evals/ux-rubric.md`
- `evals/regression-checklist.md`

## Ordered owned tasks

1. Correct source-of-truth product and architecture documents.
2. Mark the original native-first roadmap as historical/superseded and correct the implementation bridge to responsive web.
3. Semantically review and correct every OPORD; rename OPORD 014 and 016 without changing their numeric identities.
4. Strengthen documentation-contract tests for filenames, platform language, task count, dependencies, and prohibited active native-release requirements.
5. Update backlog, completed-work, review, and rubric records without altering historical evidence.
6. Run root/app tests, TypeScript, harness, placeholder lint, diff, and status checks; commit only the explicit manifest.

## Acceptance criteria

- Source documents and campaign index state responsive web, phone browsers first, and desktop web secondary.
- Exactly 17 numbered OPORD documents and exactly 60 task rows remain; dependencies and canonical order are unchanged and valid.
- OPORD 014 is `014-test-pyramid-mobile-web-accessibility-usability.md`; OPORD 016 is `016-web-release-deployment-rollback.md`; obsolete filenames are absent.
- UI work requires 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard safety, browser history/deep-link/reload behavior, 200% zoom/reflow, focus/screen-reader/reduced-motion checks, conditional Safari/Chrome checks, and secondary desktop smoke.
- Media, reminders, resilience, testing, and release orders describe browser capabilities rather than native dependencies or app-store delivery.
- Native applications never block this campaign and remain a separately authorized future option.
- The historical roadmap is prominently superseded, and the active implementation bridge specifies responsive web.

## Validation commands

```text
npm test
cd app && npm test
cd app && npx tsc --noEmit
cd app && npm run lint
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

Conditional phone-browser hardware, assistive-technology, and moderated older-adult evidence remains `NOT RUN` in this documentation-only mission.

## Stop conditions

Stop before runtime files, dependencies, configuration, credentials, remote systems, deployment, destructive Git operations, push/PR, or changes outside the authorized manifest.

## Risks and follow-ups

- Expo package naming and historical documents may still contain native terminology; they are not active production commitments.
- Browser and human evidence must be collected during the applicable implementation OPORDs.
- Lint remains an honest placeholder assigned to OPORD 015.

## Definition of done

- [x] All acceptance criteria have direct repository evidence.
- [x] Required commands pass or retain an explicit truthful limitation.
- [x] Review log and campaign records are updated.
- [x] Explicit manifest is committed with a clean worktree.

## Completion evidence

Campaign correction commits: `4e6fb85`, `0cd69b5`, and `1361e03`. External Run 3 gate: G1 PASS; G2 WARN because lint remains a placeholder assigned to OPORD 015; G3/G4/G5 PASS; zero blockers; overall AMBER / PROCEED-WARN. Exactly 17 OPORDs and 60 task rows remain. Real-phone browser, assistive-technology, moderated older-adult, live-backend, and deployment checks remain `NOT RUN` and are not inferred from this documentation mission.
