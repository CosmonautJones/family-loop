# OPORD 014 — Test Pyramid, Mobile-Web Accessibility, and Usability

## Status
PARTIAL/CONDITIONAL — layered automated, database, configured-browser, responsive-width, keyboard, and Lighthouse gates pass; physical devices, screen readers, practical 200% zoom, reduced motion, and moderated-human usability remain `NOT RUN`.

## Situation and evidence
At commit `88d0ed9`, root tests pass 70/70, app tests 58/58, TypeScript, Expo export, harness, database lint, family/media E2E, and the read-only populated-scenario verifier pass. Configured Chrome covered four isolated sessions, Back/deep-link/reload, actual file input, 320/390/430 CSS pixels, keyboard/landmarks, and Lighthouse Accessibility/Best Practices 100. Lint remains a placeholder. Physical browsers/assistive technology/human gates remain open.

## Mission/objective
Establish the smallest credible layered quality gate for pure logic, server/database contracts, rendered responsive-web behavior, browser navigation, accessibility, and representative older-adult usability.

## Dependencies
Depends on: OPORD-001, OPORD-002, OPORD-003, OPORD-004, OPORD-005, OPORD-006, OPORD-007, OPORD-008, OPORD-009, OPORD-010, OPORD-011, OPORD-012, OPORD-013

Stable M1–M6 core loop, access to supported phone browsers, agreed accessibility criteria, and participant consent/privacy plan for any human study.

## Non-goals
Native app testing, app stores, EAS, a large E2E framework, device farm, exhaustive WCAG certification, visual redesign, analytics, or research beyond the core event loop.

## Authorized territory (files/systems)
Existing tests and scripts, focused accessibility props/styles on core-loop screens, regression checklist, and test evidence. Local browser automation and explicitly available iOS Safari/Android Chrome devices; human sessions only with consent.

## Forbidden territory
New test dependencies without approval, production accounts/data, auth/billing/settings, broad redesign, participant recording without consent, deployment changes, or claiming certification.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.
Test readable text, contrast, plain labels, 48x48 CSS-pixel targets, visible focus, screen-reader semantics, reduced motion, no hover/gesture-only essentials, recoverable errors, and low cognitive load. At 320, 390, and 430 CSS-pixel widths, test 200% zoom/reflow and virtual-keyboard behavior. Browser Back/history, deep links, and reload must preserve safe, comprehensible state.

## Execution
| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---:|---|---|---|---|---|
| O014-T1 | 1 | QA architect | Private / gpt-5.5 | test matrix, tests/scripts, regression checklist | Map core-loop risks to unit, adapter, rendered, mobile-web, accessibility and human layers; add only high-value local gaps. | Every critical risk has one owner/layer and an executable or explicitly conditional check. |
| O014-T2 | 2 | Accessibility reviewer | Sergeant / gpt-5.3-instant | core-loop screens, accessibility evidence | Audit names/roles/states, focus order/visibility, screen readers, contrast, targets, 200% zoom/reflow, reduced motion, virtual keyboard, and error announcements; apply focused fixes only. | Essential actions work at 320/390/430 CSS px with keyboard, touch, zoom, and non-visual labels; no hover dependency or broad redesign. |
| O014-T3 | 3 | Browser/usability QA | Sergeant / gpt-5.3-instant | Safari/Chrome smoke records, consented research record | Run browser Back/history, deep-link/reload, file-input where applicable, iOS Safari and Android Chrome smoke, desktop regression, and an authorized older-adult walkthrough. | Browser/device/version evidence exists and findings are anonymized; unavailable conditional checks remain honestly `NOT RUN` and block release acceptance. |

## Acceptance criteria
- Every core-loop risk has an owned test layer and explicit evidence.
- Automated responsive checks pass at 320, 390, and 430 CSS px; conditional real-phone Safari and Chrome checks pass before release.
- Browser Back/history, deep links, reload, and virtual-keyboard flows preserve identity, intent, and recovery.
- Essential actions remain operable with touch, keyboard, visible focus, 200% zoom/reflow, screen readers, and reduced motion; none depends on hover.
- A secondary desktop regression passes. Human findings are anonymized and claims do not exceed the sample.

### Acceptance disposition — 2026-07-14

| Criterion | Disposition | Evidence |
|---|---|---|
| Every core-loop risk has an owned evidence layer | COMPLETE | Tests, local Supabase scripts, runbooks, regression checklist, and this OPORD matrix. |
| Automated 320/390/430 plus physical Safari/Chrome | PARTIAL/CONDITIONAL | Configured Chrome widths pass; physical iOS Safari/Android Chrome are `NOT RUN`. |
| Back/history, deep links, reload, virtual keyboard | PARTIAL | Back/deep-link/reload pass; a complete virtual-keyboard matrix on physical devices is `NOT RUN`. |
| Touch/keyboard/focus/200%/screen reader/reduced motion/no-hover | PARTIAL | >=48px touch, sequential keyboard, landmarks, and no-hover essentials pass; practical 200%, VoiceOver/TalkBack, and reduced motion are `NOT RUN`. |
| Desktop regression and anonymized human findings | PARTIAL | Desktop/local export smokes pass; no moderated-human sample exists. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Run the 320/390/430 CSS-pixel responsive matrix, keyboard/focus smoke, 200% zoom/reflow, reduced-motion and browser navigation/deep-link/reload checks; label placeholder lint honestly.

### Conditional-staging/mobile-web/human
On real phones, run iOS Safari with VoiceOver and Android Chrome with TalkBack, recording OS/browser versions; run a desktop secondary regression and a consented older-adult walkthrough. Native binaries are out of scope.

## Stop conditions/authorization limits
Stop before adding dependencies/device-farm services, using production data, recruiting/recording without consent, broad redesign, or declaring accessibility compliance from partial checks.

## Risks/follow-ups
Structural tests can pass while rendered behavior fails; desktop emulation does not prove mobile Safari/Chrome; a small usability sample is directional only. A dependency-backed browser E2E mission requires measured justification and approval.

## Definition of done
The layered matrix and critical regressions are executable, mobile Safari/Chrome and accessibility evidence is honest, desktop regression and usability limitations are recorded, and the review log is updated.
