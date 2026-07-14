# OPORD 014 — Test Pyramid, Native, Accessibility, and Usability

## Status
Planned quality mission. Structural tests and web phone smokes exist; native and human tests have not run.

## Situation and evidence
Current checks are Node tests, TypeScript, harness, and 390x844 Chrome smoke (`evals/review-log.md:8-10`). The app test script points to the shared structural test file and lint is a placeholder (`app/package.json:11-12`). Product standards require thumb-friendly, phone-first behavior (`docs/taste-bar.md`), but no iOS/Android or older-adult usability evidence is recorded.

## Mission/objective
Establish the smallest credible layered quality gate for pure logic, service contracts, rendered mobile behavior, native smoke, accessibility, and representative older-adult usability.

## Dependencies
Depends on: OPORD-001, OPORD-002, OPORD-003, OPORD-004, OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011, OPORD-012, OPORD-013

Stable M1–M6 core loop, access to supported iOS/Android devices or emulators, agreed accessibility criteria, participant consent and privacy plan for any human study.

## Non-goals
Large E2E framework, device farm, exhaustive WCAG certification, visual redesign, analytics, or research beyond the core event loop.

## Authorized territory (files/systems)
Existing tests and test scripts, focused accessibility props/styles on core-loop screens, regression checklist, test plan/evidence docs. Native simulators/devices only with explicit availability; human sessions only with consent.

## Forbidden territory
New test dependencies without approval, production accounts/data, auth/billing/settings, broad UI redesign, recording participants without consent, deployment changes, or claiming certification.

## Older-adult usability guardrail
Include readable text, high contrast, plain labels, 48x48-point touch targets, screen-reader and reduced-motion cases, no gesture-only essential actions, recoverable errors, low cognitive load, and at least one representative older-adult task walkthrough when ethically and practically authorized.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O014-T1 | 1 | QA architect | high | test matrix, tests/scripts, regression checklist | Map core-loop risks to unit, adapter, rendered, web, native and human layers; add only high-value local gaps. | Every critical risk has one owner/layer and an executable or explicitly conditional check. |
| O014-T2 | 2 | Accessibility reviewer | high | core-loop screens, accessibility evidence | Audit labels, focus, dynamic text, contrast, targets and error announcements; apply only focused fixes. | Essential actions work with large text and non-visual labels; no broad redesign. |
| O014-T3 | 3 | Native/usability QA | high | iOS/Android smoke records, consented research record | Run iOS/Android assistive-tech smoke and an authorized older-adult walkthrough. | Device/version evidence exists and findings are anonymized; unavailable checks remain NOT RUN and block completion. |

## Acceptance criteria
- Every core-loop risk has an owned test layer and explicit evidence.
- iOS and Android smoke pass, or mission remains incomplete with platform blockers recorded.
- Essential actions remain operable with large text and assistive technology basics.
- Human findings are anonymized and no success claim exceeds the sample.

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Also run the 390x844 web smoke and locally available text-scaling/contrast/touch-target audit; label lint as placeholder.

### Conditional-staging/native/human
Run VoiceOver and TalkBack/native smoke with device metadata and a consented older-adult walkthrough when authorized and available. Currently native and human evidence is NOT RUN.

## Stop conditions/authorization limits
Stop before adding dependencies/device-farm services, using production data, recruiting or recording without consent, broad redesign, or declaring accessibility compliance from partial checks.

## Risks/follow-ups
Structural tests can pass while rendered behavior fails; emulators differ from devices; a tiny usability sample is directional only. A future dependency-backed E2E mission may be justified by measured gaps.

## Definition of done
The layered matrix and critical regressions are executable, both native platforms and accessibility checks have honest evidence, usability limitations are recorded, and the review log is updated.
