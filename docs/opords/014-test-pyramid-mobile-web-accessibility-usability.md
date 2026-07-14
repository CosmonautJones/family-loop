# OPORD 014 — Test Pyramid, Mobile-Web Accessibility, and Usability

## Status
PARTIAL/CONDITIONAL — layered automated, database, configured-browser, responsive-width, keyboard, reduced-motion, and Lighthouse gates pass; physical devices, screen readers, practical browser zoom, and moderated-human usability remain `NOT RUN`.

## Situation and evidence
The reconciled baseline at `88d0ed9` passed root 70/70, app 58/58, TypeScript, Expo export, harness, database lint, family/media E2E, and the populated-scenario verifier. The 2026-07-14 local accessibility pass added platform preference handling for Expo images plus a dependency-free Chrome/CDP gate. Card surfaces are now intentionally static after measured Moti startup cost; image crossfades still resolve the platform reduced-motion preference. The gate covers 320/390/430 and 1280 CSS-pixel layouts, sequential navigation focus, exact-event deep link/Back/reload, invalid-form focus in a 320x500 keyboard-height proxy, reduced-motion emulation, and a 200% page-scale proxy. Substantive lint now passes under OPORD 015. Physical browsers, assistive technology, practical browser zoom/reflow, and human gates remain open.

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
| Back/history, deep links, reload, virtual keyboard | PARTIAL/CONDITIONAL | Exact-event deep link, Back, hard reload, and invalid-field visibility at 320x500 pass in headless Chrome; physical software-keyboard matrices are `NOT RUN`. |
| Touch/keyboard/focus/200%/screen reader/reduced motion/no-hover | PARTIAL/CONDITIONAL | >=48px touch, five sequential labeled tabs, focused error relationships, static card surfaces, zero-duration image transitions under reduced motion, and a 200% CDP page-scale proxy pass. Practical browser zoom and VoiceOver/TalkBack are `NOT RUN`. |
| Desktop regression and anonymized human findings | PARTIAL | The same production export passes at 1280x900; no moderated-human sample exists. |

## Validation commands/evidence
### Always-local
```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
```

Build a local-only production export with dotenv disabled, serve it on loopback, and run the no-dependency Chrome gate:

```powershell
$env:EXPO_NO_DOTENV='1'; $env:EXPO_PUBLIC_DATA_MODE='local'
Push-Location app; npx expo export --platform web --output-dir .codex/export-op14 --clear; Pop-Location
python -m http.server 8086 --bind 127.0.0.1 --directory app/.codex/export-op14
# In a second terminal:
node scripts/check-opord14-mobile-accessibility.mjs http://127.0.0.1:8086
```

The script starts a disposable separate headless Chrome profile, records JSON, terminates Chrome, and removes its temporary profile. Its 200% measurement is a CDP page-scale proxy (`visualViewport.scale === 2`, 160 CSS-pixel visual viewport from a 320 CSS-pixel layout), not a substitute for practical browser zoom on supported phones.

### Conditional-staging/mobile-web/human
On real phones, run iOS Safari with VoiceOver and Android Chrome with TalkBack, recording OS/browser versions; run a desktop secondary regression and a consented older-adult walkthrough. Native binaries are out of scope.

## Stop conditions/authorization limits
Stop before adding dependencies/device-farm services, using production data, recruiting/recording without consent, broad redesign, or declaring accessibility compliance from partial checks.

## Risks/follow-ups
Structural tests can pass while rendered behavior fails; desktop Chrome emulation does not prove mobile Safari/Chrome, a physical software keyboard, or assistive technology. Card surfaces do not animate. The shared reduced-motion hook defaults to reduced motion until the async platform preference resolves, preventing first-paint image motion for opted-out users; normal image crossfades remain available for subsequently mounted content. A small usability sample is directional only. A dependency-backed browser E2E mission requires measured justification and approval.

## Definition of done
The layered matrix and critical regressions are executable, mobile Safari/Chrome and accessibility evidence is honest, desktop regression and usability limitations are recorded, and the review log is updated.
