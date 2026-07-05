# AI Video Tool Profile

Use this profile for apps that help with AI video editing, clips, captions, hooks, scripts, demos, shot lists, timelines, or creative production.

## Target user

A creator, developer, marketer, or builder who wants to produce better video assets faster.

## Job-to-be-done

This app is for someone creating videos or demos
who is trying to turn rough material into a usable edit
but keeps struggling with hooks, pacing, captions, clip selection, and creative direction,
so this app helps them generate a clear edit plan, script, shot list, captions, or timeline faster than manual editing prep.

## Product wedge

This is not a generic content generator.

It is a practical video pre-production and editing assistant that turns messy input into a usable creative plan.

## Enemy

- generic AI content
- unclear export path
- too many knobs
- slow editing prep
- weak hooks
- bloated timelines
- no before/after comparison
- fake pro-editing complexity

## Core loop

```text
User provides idea, transcript, or raw notes
→ app turns it into a tighter video plan or edit artifact
→ user exports/copies into editing workflow
→ final clip gets made faster
```

## Magic moment

The user pastes a messy idea or transcript and gets:

- hook options
- structure
- cut list
- caption style
- title ideas
- timeline notes
- export-ready script

## Should feel like

- creative
- fast
- visual
- practical
- timeline-aware
- opinionated
- not like a generic writing app

## Should avoid

- generic content sludge
- vague "make it viral" suggestions
- too many configuration screens
- slow workflows
- unclear next step
- trying to become a full editor too early

## Must support eventually

- transcript input
- hook generation
- cut list
- shot list
- caption options
- style presets
- before/after comparison
- export to markdown, SRT, CSV, or editor-friendly formats
- maybe local media analysis later

## Not building yet

- full nonlinear editor
- cloud rendering pipeline
- team review
- stock media marketplace
- full asset management

## Great first slice

Paste a video idea or transcript and generate a tight edit plan with hooks, sections, captions, and shot list.

## Product rubric additions

Score:

- Does it reduce editing prep time?
- Does it improve the creative direction?
- Are hooks specific and usable?
- Can the output be pasted into a real workflow?
- Does it avoid generic creator advice?

## Architecture notes

Good stack options:

- React or Next.js for quick UI
- Local file upload later
- Start with text/transcript input before real video processing
- Export markdown/CSV/SRT before advanced integrations
- Keep prompt presets versioned

## Suggested first current mission

Build a single flow where the user pastes a video idea or transcript and receives a structured edit plan with hook options, scene beats, caption tone, and exportable copy.
