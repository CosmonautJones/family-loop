# LoopedIn — Spec and Roadmap

## Product definition
LoopedIn is a private, mobile-first social calendar app for families and friend groups. It combines event planning, contextual conversation, reminders, attendance, and shared photos into one event-centered experience.

---

## Product goals

### Goal 1: become a real weekly habit
Users should return because the app is genuinely useful for upcoming plans.

### Goal 2: create emotional retention
Past events should accumulate memory value through photos, comments, and resurfacing.

### Goal 3: reduce coordination fragmentation
Users should no longer need separate mental models for calendar rows, buried chat details, and scattered photos.

---

## Non-goals for MVP
- public social graph
- creator economy features
- broad task/project management
- generic workplace collaboration
- complex AI-first workflows

---

## Target platforms
### Phase 1
- iOS
- Android

### Phase 2
- responsive web companion
- admin/lightweight desktop experience if useful

---

## Core MVP feature specification

### 1. Accounts and identity
**Requirements**
- sign up / sign in
- profile name and photo
- invitation acceptance
- private group membership

**Acceptance criteria**
- a user can join a group through an invite link or code
- a user can belong to multiple groups
- group membership is not public outside those groups

### 2. Groups
**Requirements**
- create a private group
- set group name, cover, and type (family, friends, couple, other)
- basic member roles: owner/admin/member

**Acceptance criteria**
- group owners can invite or remove members
- members can view group events and shared media based on permissions

### 3. Events
**Requirements**
- create one-time events
- title, date, time, location, notes
- optional cover photo/color
- invite some or all group members

**Acceptance criteria**
- event appears in month and agenda views
- edits notify relevant members
- event has a detail page with logistics and activity

### 4. RSVP and attendance
**Requirements**
- going / maybe / can’t go
- attendee list on event detail
- counts visible to participants

**Acceptance criteria**
- RSVP updates appear near-real-time on the event page
- users can change response state at any time before or during event

### 5. Event conversation
**Requirements**
- event-specific comments or lightweight chat
- mention/tag members
- system updates shown inline when event changes

**Acceptance criteria**
- event discussion remains attached to that event permanently
- a user can scan one event page and see both logistics and conversation context

### 6. Reminders and notifications
**Requirements**
- default reminders before event start
- update notifications for edits/cancellations
- mention notifications
- photo upload notifications

**Acceptance criteria**
- reminders honor user timezone
- users can manage basic notification preferences

### 7. Photos and event gallery
**Requirements**
- upload one or many photos to an event
- gallery on event detail
- lightweight reactions on media or event posts

**Acceptance criteria**
- event photos remain attached to event history
- gallery can be browsed after the event without searching chat history

### 8. Calendar and home surfaces
**Requirements**
- home dashboard with next event, recent activity, and memory module
- agenda view
- month view

**Acceptance criteria**
- the user can understand upcoming plans within seconds of opening app
- taps between calendar and event detail feel direct and intuitive

---

## Information architecture

### Primary navigation
- Home
- Calendar
- Create
- Memories
- Profile / Groups

### Primary object model
- User
- Group
- Group membership
- Event
- RSVP
- Event message/comment
- Media asset
- Notification preference

The event is the anchor object for the first release.

---

## Recommended technical architecture

### Client
- React Native + Expo
- TypeScript
- TanStack Query for server state
- Zustand or Redux Toolkit for app state
- Reanimated / Gesture Handler for motion

### Backend
- Node.js + TypeScript
- modular monolith architecture
- PostgreSQL as source of truth
- Redis for queues/cache/presence
- worker queue for reminders and media processing

### Infra
- managed Postgres
- S3-compatible object storage + CDN
- APNs/FCM push notifications
- realtime via WebSockets or managed provider
- error monitoring and analytics

### Why this stack
It balances speed, product polish, and room to scale without prematurely over-engineering the system.

---

## Data model sketch

### users
- id
- name
- avatar_url
- created_at

### groups
- id
- name
- type
- cover_url
- owner_id
- created_at

### group_memberships
- id
- group_id
- user_id
- role
- joined_at

### events
- id
- group_id
- title
- starts_at
- ends_at
- location_text
- notes
- cover_url
- created_by
- created_at
- updated_at

### rsvps
- id
- event_id
- user_id
- status
- updated_at

### event_messages
- id
- event_id
- user_id
- body
- created_at

### media_assets
- id
- event_id
- uploaded_by
- original_url
- thumbnail_url
- created_at

### notification_preferences
- id
- user_id
- reminder_enabled
- mention_enabled
- upload_alert_enabled

---

## Privacy and trust requirements
This is a first-class product requirement, not a later concern.

### Must-haves
- groups private by default
- explicit invites and membership boundaries
- protected media access
- ability to remove users from group
- content deletion controls
- auditability for sensitive membership actions
- careful handling of EXIF/location metadata in photos

### Minimum safety controls
- block/report user
- remove content from a private group if owner/admin chooses
- rate limit invites and abuse patterns

---

## Roadmap

## Phase 0 — concept validation and prototype
**Objective:** prove the UX and core loop.

### Deliverables
- clickable design prototype
- concept landing assets
- event detail + home + calendar mock flows
- first-pass technical architecture

### Success signal
Users immediately understand the value proposition and prefer this flow to “calendar + chat + photos in separate apps.”

---

## Phase 1 — MVP build
**Objective:** ship the smallest complete event-centered private group product.

### Scope
- private groups
- event creation and editing
- agenda + month calendar
- RSVP
- event conversation
- event reminders
- event photo gallery
- push notifications
- basic home surface

### Success signal
At least one group segment uses the app every week for real plans.

---

## Phase 2 — retention and polish
**Objective:** strengthen habit and delight.

### Scope
- event recap cards
- memory resurfacing
- richer reactions
- improved motion system
- recurring events
- better search and filters
- improved onboarding/invites

### Success signal
Photos and memory interactions meaningfully improve retention beyond event planning alone.

---

## Phase 3 — scale and expansion
**Objective:** deepen platform utility while protecting focus.

### Scope
- external calendar sync
- advanced reminder automations
- collaborative lists attached to events
- premium annual recaps / keepsake outputs
- optional AI assistance for summaries, recaps, tagging

### Success signal
Monetization and retention expand without diluting the event-centered identity.

---

## Prioritized roadmap by workstream

### Product
1. define event-centered MVP
2. test navigation and event detail comprehension
3. validate group setup and invite flow
4. validate whether users upload photos post-event

### Design
1. home dashboard concept
2. event detail concept
3. calendar-to-event transition
4. create-event flow
5. memories/recap flow

### Engineering
1. auth and group model
2. event CRUD and calendar surfaces
3. realtime RSVP and event discussion
4. notifications/reminder worker
5. media upload pipeline
6. gallery and recap basics

### Growth
1. invitation loop design
2. first-group setup optimization
3. “your next event” activation loop
4. memory resurfacing retention hooks

---

## Open questions for next round
- Should the first wedge focus more on families or friend groups?
- Should chat remain event-scoped only in MVP?
- How much external calendar interoperability is needed early?
- Is recurring-event support required for household utility in v1?
- What level of memory recap automation is feasible in the first release?

---

## Recommendation
Proceed into a design/prototype phase immediately, using the event detail page and home dashboard as the two highest-leverage artifacts. Those surfaces will reveal whether LoopedIn can truly fuse utility and emotion into one daily-driver experience.
