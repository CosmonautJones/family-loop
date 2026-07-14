# UX Rubric

## Older-adult campaign standard

Every UI OPORD preserves plain language, readable type, 48x48 CSS-pixel minimum primary targets, obvious status and next action, browser screen-reader semantics, reduced-motion behavior, low cognitive load, and a visible recovery path. Structural tests cannot substitute for mobile-browser assistive-technology and moderated older-adult evidence required by OPORD 014.

Campaign-planning verdict: PASS for documented requirements only. Mobile-browser accessibility and human usability remain `NOT RUN`.

## M3 event-thread evidence

- Event Detail exposes local loading, error, empty, and populated conversation states.
- The composer has a 48px minimum action, disables blank/pending sends, preserves failed drafts, and clears successful drafts.
- A 390x844 smoke proved the sent message remains visible after leaving and reopening the event.

## First impression

- Is the purpose obvious?
- Is the next action obvious?
- Does it feel specific or generic?

## Visual hierarchy

- Is the main thing visually dominant?
- Are secondary actions clearly secondary?
- Is there too much card clutter?

## Flow

- How many steps before value?
- Where does the user hesitate?
- What can be removed?

## Empty states

- Do they teach?
- Do they invite action?
- Do they avoid filler copy?

## Copy

- Is the language clear?
- Is it practical?
- Does it avoid vague AI language?

## UX verdict

PASS (M2) — At 390x844, the clean mock rerun moved from Create to only the exact created Event Detail, persisted Maybe -> Going through refetch, and showed the created event in Calendar. The configured placeholder branch showed only the signed-out gate with no protected or fixture content. Loading, error, empty, not-found, pending-submit, and inline mutation-failure states remain explicit. A hard reload resets the process-local mock, so no full-restart durability is claimed. Live Supabase CRUD remains `NOT RUN — ENV unavailable`.
