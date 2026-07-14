# OPORD 002 — Accessible design system

## Status

PLANNED — audit first; remediation requires a separately approved file manifest.

## Situation and evidence

- The taste bar requires phone-first, readable, thumb-friendly actions (`docs/taste-bar.md:11-21`).
- The bottom navigation has labels and 58-point minimum height (`app/src/navigation/AppShell.tsx:63-77,114-121`), and Calendar event rows expose button roles/labels (`app/src/screens/CalendarScreen.tsx:45-50`).
- Home typography includes 38/40 hero text and 14/20 supporting copy (`app/src/screens/HomeScreen.tsx:124-159`), but repository evidence does not establish contrast ratios, 200% zoom/reflow, screen-reader order, reduced motion, virtual-keyboard behavior, or mobile-browser accessibility.
- Real-phone Safari/Chrome and human accessibility tests have not been run. Inference: shared components and tokens are the narrowest leverage point, but only defects proven by audit are authorized for remediation.

## Mission/objective

Define a small, enforceable accessibility baseline for the existing event loop and repair only verified failures so older adults and assistive-technology users can understand and operate Home, Calendar, Create, Event Detail, RSVP, and thread flows.

## Dependencies

Depends on: OPORD-001

- Stable M1-M3 flows and approved OPORD-001 information hierarchy.
- Access to iOS Safari/VoiceOver and Android Chrome/TalkBack or an explicit `NOT RUN` record.
- Existing components/tokens; no new dependency by default.

## Non-goals

- A visual rebrand, generic component library, exhaustive WCAG certification, desktop redesign, animations, or unrelated screens.
- New dependencies, analytics, settings, or accessibility preference storage.

## Authorized territory (files/systems)

- Audit documentation, relevant `evals/**`, focused tests, and review log.
- After exact approval: `app/src/theme/**`, `app/src/components/**`, and only the six core-loop screens/navigation files demonstrably affected by findings.
- Local Expo web checks at 320/390/430 CSS px and real-phone browser checks when available.

## Forbidden territory

- Auth, billing, teams, notifications, schema/RLS, remote systems, deployment, new dependencies, and wholesale style rewrites.

## Older-adult usability guardrail

Shared mobile-web gate: verify 320/390/430 CSS-pixel widths, 48x48 CSS-pixel touch targets, no hover dependency, virtual-keyboard behavior, browser Back/history, deep links and reload, 200% zoom/reflow, visible focus, screen-reader semantics, and reduced motion. Run iOS Safari and Android Chrome conditionally on real phones; keep desktop browsers as a secondary regression target.

Use plain labels, minimum 48x48 CSS-pixel interactive targets, strong contrast, visible focus/state beyond color, forgiving spacing, no hover dependency, and no icon-only primary actions. Support 200% zoom/reflow without clipping, safe virtual-keyboard behavior, screen-reader order, reduced motion, browser Back/history, deep links and reload.

## Execution

| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |
|---|---|---|---|---|---|---|
| O002-T1 | 1 | Accessibility auditor | Private / gpt-5.3-instant | Core-loop screens/components (read-only), audit records | Inventory controls/states; measure contrast and targets; inspect labels, roles, focus, text scaling, errors, and reduced motion. | Every finding has path/line, reproduction, severity, evidence, and inference label where needed. |
| O002-T2 | 1 | Design-system owner | Private / gpt-5.3-instant | `app/src/theme/**`, `app/src/components/**` (read-only until approval) | Map proven failures to the smallest token/component/screen remediation manifest. | Manifest contains no speculative redesign or dependency and identifies blast radius. |
| O002-T3 | 2 | Implementer | Private / gpt-5.3-instant | Separately approved accessibility files and focused tests | Fix approved failures and add accessible-name/state checks supported by the existing stack. | AA/target/text-scale criteria pass and exact-event/session behavior regresses green. |

## Acceptance criteria

- Every primary action has a meaningful accessible name, role, state, and adequate target.
- RSVP, send pending/error, auth gates, loading, empty, and not-found states are conveyed without color alone.
- 200% text sizing does not block the core action or hide critical content on supported phone targets.
- Measured text/control contrast meets the declared WCAG AA baseline.
- No regression to exact-event identity, auth gating, or event/thread behavior.

## Validation commands/evidence

### Always-local

```powershell
npm test
Push-Location app; npm test; npx tsc --noEmit; npm run lint; Pop-Location
powershell -ExecutionPolicy Bypass -File scripts/check-harness.ps1
git diff --check
git status --short
```

- Report lint as placeholder unless changed.
- 320/390/430 CSS-pixel keyboard/focus and browser accessibility-tree smoke, including virtual keyboard, Back/history, deep-link/reload, reduced motion, and desktop secondary regression.
- Text-size smoke at default and 200%; contrast worksheet with measured values.

### Conditional-staging/mobile-web/human

- iOS Safari/VoiceOver and Android Chrome/TalkBack core-loop smoke, or separately record each as `NOT RUN — device unavailable`.
- Older-adult usability session or `NOT RUN — participant unavailable`.

## Stop conditions/authorization limits

Stop if remediation requires a dependency, broad redesign, unsupported platform promise, edits outside manifest, or changes product behavior. Do not claim real-phone or human validation from desktop emulation.

## Risks/follow-ups

- Desktop React Native Web inspection is not proof of mobile Safari/Chrome behavior.
- Token changes can have wide visual impact; review every affected core screen.
- Human comprehension and motor accessibility remain unproven until participant testing occurs.

## Definition of done

Audited scope, fixed verified blockers, passing 320/390/430 and desktop-secondary checks, measured evidence, truthful mobile-browser/human test status, updated review log, and no unrelated design churn.
