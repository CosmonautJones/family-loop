# OPORD 002 — Accessible design system

## Status

PLANNED — audit first; remediation requires a separately approved file manifest.

## Situation and evidence

- The taste bar requires phone-first, readable, thumb-friendly actions (`docs/taste-bar.md:11-21`).
- The bottom navigation has labels and 58-point minimum height (`app/src/navigation/AppShell.tsx:63-77,114-121`), and Calendar event rows expose button roles/labels (`app/src/screens/CalendarScreen.tsx:45-50`).
- Home typography includes 38/40 hero text and 14/20 supporting copy (`app/src/screens/HomeScreen.tsx:124-159`), but repository evidence does not establish contrast ratios, dynamic type behavior, screen-reader order, reduced motion, or native-device accessibility.
- Native and human accessibility tests have not been run. Inference: shared components and tokens are the narrowest leverage point, but only defects proven by audit are authorized for remediation.

## Mission/objective

Define a small, enforceable accessibility baseline for the existing event loop and repair only verified failures so older adults and assistive-technology users can understand and operate Home, Calendar, Create, Event Detail, RSVP, and thread flows.

## Dependencies

Depends on: OPORD-001

- Stable M1-M3 flows and approved OPORD-001 information hierarchy.
- Access to iOS/Android accessibility tooling or an explicit `NOT RUN` record.
- Existing components/tokens; no new dependency by default.

## Non-goals

- A visual rebrand, generic component library, exhaustive WCAG certification, desktop redesign, animations, or unrelated screens.
- New dependencies, analytics, settings, or accessibility preference storage.

## Authorized territory (files/systems)

- Audit documentation, relevant `evals/**`, focused tests, and review log.
- After exact approval: `app/src/theme/**`, `app/src/components/**`, and only the six core-loop screens/navigation files demonstrably affected by findings.
- Local Expo/web and native simulator/device checks when available.

## Forbidden territory

- Auth, billing, teams, notifications, schema/RLS, remote systems, deployment, new dependencies, and wholesale style rewrites.

## Older-adult usability guardrail

Use plain labels, minimum 48x48-point interactive targets, strong text/background contrast, visible focus/state beyond color, readable default sizes, forgiving spacing, no time-limited interaction, and no icon-only primary actions. Support text enlargement without clipping the primary task, preserve screen-reader order and reduced motion, and keep recovery obvious.

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
- 390x844 keyboard/focus and browser accessibility-tree smoke.
- Text-size smoke at default and 200%; contrast worksheet with measured values.

### Conditional-staging/native/human

- iOS VoiceOver and Android TalkBack core-loop smoke, or separately record each as `NOT RUN — device/simulator unavailable`.
- Older-adult usability session or `NOT RUN — participant unavailable`.

## Stop conditions/authorization limits

Stop if remediation requires a dependency, broad redesign, unsupported platform promise, edits outside manifest, or changes product behavior. Do not claim native or human validation from web inspection.

## Risks/follow-ups

- React Native Web accessibility is not proof of native parity.
- Token changes can have wide visual impact; review every affected core screen.
- Human comprehension and motor accessibility remain unproven until participant testing occurs.

## Definition of done

Audited scope, fixed verified blockers, passing automated checks, measured evidence, truthful native/human test status, updated review log, and no unrelated design churn.
