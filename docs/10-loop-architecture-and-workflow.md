# Loop Mobile Architecture and Contributor Workflow

## Purpose
This document translates the product proposal and roadmap into a build-ready foundation for the Loop mobile app. It describes:
- the recommended mobile app structure
- the screen model for the first shipping slices
- a sample data strategy for scaffolding and demos
- contributor workflow guidance for agent/subagent teams
- the local commands contributors should use to run and verify the repo

Use this doc as the implementation bridge between the concept artifacts in `docs/03-product-proposal.md`, the roadmap in `docs/04-spec-roadmap.md`, and the Expo scaffold in `app/`.

---

## System architecture at a glance
Loop should be implemented as an **event-centered mobile client** backed by a service layer that treats the event as the primary object.

### Product object hierarchy
1. **Group** is the permission boundary.
2. **Event** is the primary collaboration object.
3. **RSVPs, messages, reminders, and media** attach to an event.
4. **Memories/recaps** are derived from completed events rather than free-floating posts.

### Recommended system shape
- **Mobile client:** Expo + React Native + TypeScript
- **Client state:**
  - server-backed data via TanStack Query when backend work begins
  - local UI/session state via a lightweight store such as Zustand
- **Service boundary:** modular API organized around auth, groups, events, media, and notifications
- **Persistence model:** relational schema where `group -> event -> activity/media` is the dominant traversal path
- **Async workflows:** reminders, push fanout, recap generation, image processing, and future resurfacing jobs should run out-of-band

### Architectural rule of thumb
If a feature does not make an event easier to plan, attend, discuss, or remember, it should probably stay out of the MVP foundation.

---

## Mobile app structure
The current scaffold lives in `app/` and should evolve toward a feature-oriented structure instead of a flat screen-only codebase.

### Current repo surfaces
- `app/App.tsx` — current home dashboard scaffold
- `app/index.ts` — Expo root registration
- `app/README.md` — quick app-specific notes

### Recommended near-term app structure
```text
app/
  App.tsx
  index.ts
  src/
    app/
      navigation/
      providers/
      theme/
    features/
      groups/
      events/
      calendar/
      memories/
      profile/
    components/
      layout/
      cards/
      feedback/
    data/
      fixtures/
      mappers/
    lib/
      date/
      formatting/
      analytics/
```

### Responsibility split
- `src/app/` holds application shell concerns: navigation, providers, theme, app bootstrap.
- `src/features/` holds domain features aligned with the product model.
- `src/components/` holds reusable UI building blocks that are not tied to one feature.
- `src/data/fixtures/` holds sample data used before backend integration and for visual regression stability.
- `src/lib/` holds cross-feature utilities.

### Feature boundaries to preserve
- **groups** owns group switcher, membership context, and invite entry points.
- **events** owns event detail, event creation/editing, RSVP, discussion, and gallery attachment logic.
- **calendar** owns agenda/month surfaces and date-based filtering.
- **memories** owns recap cards and resurfaced event moments.
- **profile** owns notification preferences and account settings.

This keeps the code structure aligned with the product roadmap instead of coupling everything to one large home screen.

---

## Screen model for the MVP foundation
The mobile app should be organized around a small set of high-value surfaces.

### 1. Home dashboard
**Purpose:** answer “what matters next?” within seconds.

**Content modules**
- next upcoming event hero
- this week summary
- recent event activity
- recap/memory module
- quick actions: create event, switch group, open calendar

**State expectations**
- empty state for new groups
- loading state with stable card skeletons
- group-specific content when the active group changes

### 2. Calendar surface
**Purpose:** give fast temporal navigation.

**Views**
- agenda list for near-term utility
- month grid for planning visibility

**Transitions**
- tapping a date opens filtered events
- tapping an event opens event detail directly

### 3. Event detail
**Purpose:** act as the center of gravity for coordination and memory.

**Sections**
- logistics: title, time, location, notes
- attendee state: RSVP summary and actions
- conversation/activity thread
- media gallery
- post-event recap entry point

**Architectural importance**
This screen should be treated as the canonical domain surface. New backend and UI decisions should be tested against whether they make this screen simpler and stronger.

### 4. Create/edit event flow
**Purpose:** create the core habit loop quickly.

**Fields**
- title
- date/time
- location
- notes
- invited members
- optional visual treatment such as cover color/photo

**Workflow recommendation**
Keep creation fast by default, then allow richer editing inside event detail after save.

### 5. Memories surface
**Purpose:** turn completed events into retention.

**Content types**
- recap cards
- “on this day” resurfacing
- recent shared albums by event

### 6. Group/profile surface
**Purpose:** manage membership context without bloating the core flow.

**Includes**
- active group switcher
- invite/manage member entry points
- profile basics
- notification preferences

---

## Suggested navigation model
Recommended bottom navigation for the first real build:
- **Home**
- **Calendar**
- **Create**
- **Memories**
- **Profile**

### Navigation rules
- Event detail must be reachable from Home, Calendar, Memories, and notifications.
- Group switching should update all event-derived surfaces consistently.
- Avoid splitting event conversation into a separate top-level tab in MVP; it belongs to the event.

---

## Sample data strategy
Loop already has a polished scaffold in `app/App.tsx`. To keep implementation velocity high without inventing backend behavior too early, contributors should use a deliberate fixture strategy.

### Why fixture-first matters here
- product value depends heavily on realistic event composition
- home, calendar, and memory surfaces need stable content for iteration
- agent/subagent contributors work better when they share deterministic example states

### Fixture design rules
Create sample data that mirrors the proposed domain model:
- groups
- members
- events
- rsvps
- event activity/comments
- media assets
- recap/memory items

### Recommended fixture scenarios
Keep a small, named set of scenarios rather than one giant blob:

1. **family-week**
   - multiple upcoming household events
   - one completed event with photos
   - mixed RSVP states
2. **friends-weekend**
   - one social event with active conversation
   - one schedule update
   - richer visual/media content
3. **empty-group**
   - no events yet
   - used for onboarding and zero-state design
4. **dense-calendar**
   - enough events to stress agenda/month views

### Fixture usage recommendations
- render the same fixture set across Home, Calendar, Event Detail, and Memories
- keep IDs and timestamps explicit so tests stay deterministic
- avoid random generation in committed fixture data
- add mapping helpers so future API payloads can be normalized into the same view model shape

### View-model guideline
Prefer transforming raw fixture records into screen-ready selectors instead of embedding screen-specific copy directly in domain objects. That will make backend migration easier later.

---

## Recommended implementation workflow for agent/subagent teams
The user wants a workflow system that supports agent teams. The repo should therefore favor small, isolated contributions with explicit ownership.

### Core collaboration principle
Assign work by **surface or layer**, not by broad product theme.

Good parallel slices:
- one contributor on docs/architecture
- one contributor on Home screen composition
- one contributor on Calendar screen scaffolding
- one contributor on fixture/data modeling
- one contributor on tests/docs validation

Avoid parallel edits to the same screen file unless absolutely necessary.

### Suggested contribution contract
Each contributor should state:
- target files
- feature boundary
- assumptions about existing fixtures or navigation
- verification command they ran

### Recommended agent workflow
1. **Discovery pass**
   - inspect existing docs, scaffold, and tests
   - identify a narrow slice that avoids file collisions
2. **Single-slice implementation**
   - change one feature boundary or one doc artifact at a time
3. **Local verification**
   - run the smallest relevant test command
   - confirm no unintended changes outside the slice
4. **Handoff summary**
   - list changed files
   - note follow-up seams for the next contributor

### File ownership guidance
- `docs/` can absorb architecture/process additions with minimal conflict
- `tests/spec-docs.test.js` is the right place for lightweight required-doc assertions
- `app/App.tsx` should remain a scaffold until navigation and feature folders exist; avoid stuffing every future concept into that file

### Review checklist for contributors
Before committing, verify:
- changes stay inside the requested repo
- doc language matches the event-centered product thesis
- sample data guidance is deterministic
- commands in docs are actually runnable from this repo
- tests cover any new required documentation artifact when appropriate

---

## Local run and test commands
These are the commands contributors should use from the repository root unless noted otherwise.

### Repo-level docs/tests
```bash
npm test
```
Runs the Node test suite in `tests/`, including documentation existence checks.

### Preview static concept artifacts
```bash
npm run preview:prototype
```
Serves the `docs/` directory locally on port `8765` for visual review.

### Mobile app install and start
```bash
cd app
npm install
npm start
```
Starts the Expo app.

### Mobile platform shortcuts
From `app/`:
```bash
npm run android
npm run ios
npm run web
```

### Mobile scaffold test
From `app/`:
```bash
npm test
```
Runs the app scaffold verification in `../tests/app-scaffold.test.js`.

### Suggested verification habit
For documentation-only changes that add required artifacts, run at minimum:
```bash
npm test
```
If a change affects app docs or app structure guidance, also run:
```bash
cd app && npm test
```

---

## Recommended next implementation sequence
To build intelligently from the current scaffold, contributors should usually work in this order:

1. establish fixture models and screen-ready selectors
2. extract Home screen sections from `App.tsx` into feature/components structure
3. add navigation shell and placeholder routes
4. scaffold Calendar and Event Detail screens
5. connect all screens to shared fixture scenarios
6. add Memories and Group/Profile surfaces
7. only then begin backend-facing data layer integration

This order preserves design momentum while reducing rework.

---

## Definition of a good foundation change
A strong foundation contribution to Loop should do at least one of the following:
- clarify the event-centered architecture
- reduce ambiguity about screen responsibilities
- improve deterministic sample data usage
- make parallel contribution safer for agent/subagent teams
- add a runnable verification path for future contributors

If a proposed change does none of these, it is probably not yet the next best foundational task.
