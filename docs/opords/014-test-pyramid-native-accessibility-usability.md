# OPORD 014 — Test pyramid, native, accessibility, and usability

## Status
Planned quality mission. Structural tests and web phone smokes exist; native and human tests have not run.

## Situation and evidence
Current checks are Node tests, TypeScript, harness, and 390x844 Chrome smoke (`evals/review-log.md:8-10`). The app test script points to the shared structural test file and lint is a placeholder (`app/package.json:11-12`). Product standards require thumb-friendly, phone-first behavior (`docs/taste-bar.md`), but no iOS/Android or older-adult usability evidence is recorded.

## Mission/objective
Establish the smallest credible layered quality gate for pure logic, service contracts, rendered mobile behavior, native smoke, accessibility, and representative older-adult usability.

## Dependencies
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
1. Map critical risks to the cheapest layer: selector/unit, adapter contract, rendered component, web phone, native smoke, human usability.
2. Close only high-value gaps in Home → Event Detail → RSVP/thread/media/reminder/memory.
3. Audit labels, focus order, dynamic text, contrast, touch targets, and error announcements.
4. Run iOS and Android smoke at supported text sizes; record platform/version/device.
5. Conduct a consented task walkthrough or explicitly mark it NOT RUN.
6. Convert discoveries into focused regression checks; avoid framework expansion.

## Acceptance criteria
- Every core-loop risk has an owned test layer and explicit evidence.
- iOS and Android smoke pass, or mission remains incomplete with platform blockers recorded.
- Essential actions remain operable with large text and assistive technology basics.
- Human findings are anonymized and no success claim exceeds the sample.

## Validation commands/evidence
### Always-local
Run root/app tests, TypeScript, placeholder lint labeled, harness, diff check, 390x844 web smoke, and the text scaling/contrast/touch-target audit available locally.

### Conditional-staging/native/human
Run VoiceOver and TalkBack/native smoke with device metadata and a consented older-adult walkthrough when authorized and available. Currently native and human evidence is NOT RUN.

## Stop conditions/authorization limits
Stop before adding dependencies/device-farm services, using production data, recruiting or recording without consent, broad redesign, or declaring accessibility compliance from partial checks.

## Risks/follow-ups
Structural tests can pass while rendered behavior fails; emulators differ from devices; a tiny usability sample is directional only. A future dependency-backed E2E mission may be justified by measured gaps.

## Definition of done
The layered matrix and critical regressions are executable, both native platforms and accessibility checks have honest evidence, usability limitations are recorded, and the review log is updated.
