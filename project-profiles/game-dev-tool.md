# Game Dev Tool Profile

Use this profile for apps related to game prototypes, level design, NPC behavior, item generation, asset prompts, dialogue, modding tools, or game design workflows.

## Target user

A solo developer, game designer, modder, or creative technologist building game ideas with AI assistance.

## Job-to-be-done

This app is for a game builder
who is trying to create playable or design-ready game content
but keeps struggling with vague ideas, inconsistent assets, shallow mechanics, and messy iteration,
so this app helps them turn rough concepts into structured game design artifacts or prototype-ready assets.

## Product wedge

This is not a generic idea generator.

It is a game-building workbench focused on playable loops, constraints, and iteration.

## Enemy

- cool but unplayable ideas
- inconsistent lore/assets
- generic mechanics
- feature creep
- huge worlds before a fun loop
- AI-generated content with no design purpose

## Core loop

```text
User gives a game concept or design problem
→ app turns it into a playable loop, constraints, assets, or implementation plan
→ user tests or prototypes
→ feedback improves the next iteration
```

## Magic moment

The user enters a vague game idea and gets:

- core mechanic
- player goal
- failure condition
- prototype scope
- asset list
- first playable task
- balancing notes

## Should feel like

- playful
- practical
- prototype-driven
- creative but constrained
- focused on fun loops

## Should avoid

- giant lore dumps
- generic fantasy/sci-fi filler
- asset spam
- no playable loop
- "dream game" scope creep
- building menus before gameplay

## Must support eventually

- core loop generation
- mechanic breakdown
- NPC dialogue/personality packs
- level design prompts
- asset prompt packs
- balancing tables
- prototype tasks
- maybe Godot/Unity export helpers

## Not building yet

- full game engine
- multiplayer
- asset marketplace
- huge worldbuilding system
- advanced procedural generation before a playable loop exists

## Great first slice

Turn a rough game idea into a one-screen prototype plan with mechanics, win/loss conditions, asset list, and first build mission.

## Product rubric additions

Score:

- Is there a playable loop?
- Is the scope prototype-sized?
- Is the mechanic specific?
- Does it reduce design ambiguity?
- Would this help build a first playable version?

## Architecture notes

Good stack options:

- Web app for design tools
- Markdown/JSON export
- Optional Godot/Unity script generation later
- Keep design artifacts versioned
- Prefer prototypes over large world models

## Suggested first current mission

Build a flow where the user enters a rough game idea and receives a prototype-ready design card with core mechanic, win condition, fail condition, first level, assets, and implementation tasks.
