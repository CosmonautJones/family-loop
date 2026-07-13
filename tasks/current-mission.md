# Current Mission

Mission ID: `FAMILY-LOOP-ASSESS-001`

## Mission

Make Home answer what matters next and support an existing group with zero events.

## Business / product reason

Home should deliver the product's first value on a phone: a clear next event that opens one reliable event record. A group without plans should get an honest path to create one, not fixture activity.

## User story

As a family organizer, I want Home to show the next shared plan immediately, open that same plan, and help me create one when my group has no events.

## Acceptance criteria

- [x] A chronologically valid next event dominates Home's first phone viewport.
- [x] Opening the Home event displays that same event in Event Detail.
- [x] An existing group with zero events has no fabricated activity or memories.
- [x] The empty Home state offers a thumb-friendly route to the existing Create tab.
- [x] Prototype and marketing framing is removed from Home.
- [x] Focused executable tests cover populated, empty, and event-identity behavior.

## Required checks

- [x] powershell -ExecutionPolicy Bypass -File .\scripts\check-harness.ps1
- [x] npm test
- [x] cd app; npm test
- [x] cd app; npx tsc --noEmit
- [x] git diff --check
- [x] Expo web smoke at 390x844: populated Home -> same Event Detail
- [x] Empty Home selector and CTA wiring verified without adding a runtime fixture toggle

## Do not touch

- Onboarding or the no-groups state.
- Backend/query integration or loading/error plumbing.
- Navigation library migration, dependencies, or unrelated redesigns.

## Risks and follow-ups

- The zero-event branch is deterministic at the selector/component boundary but has no production data source yet.
- The empty Home branch was not browser-smoked because exposing it would require a speculative runtime fixture toggle; executable selector and wiring tests cover it instead.
- The temporary shell event-ID bridge should remain small until a navigation migration is explicitly required.

## Definition of done

- [x] Acceptance criteria met
- [x] Relevant checks run
- [x] Review log updated
- [x] Follow-up risks listed
