# Architecture Baseline

**Status:** Proposed baseline — validate through the first vertical slice before treating decisions as permanent.

## Product constraints

- Single-player 3D mystery-adventure.
- Mobile-first interaction; touch and mouse/keyboard support.
- YouTube Playables is the target platform; publication and certification are external approval gates.
- No desktop-only development steps in the project operating workflow.
- Established Midnight Detectives canon and approved character designs are protected.
- Case concepts remain provisional until explicitly approved.

## Architectural direction

The initial implementation direction is TypeScript, Three.js, WebGL 2, and Vite. This is a hypothesis to validate, not a reason to force the project into a premature engine commitment.

The application is a modular client-side game. Gameplay rules must not depend directly on Three.js objects or YouTube SDK globals.

### Logical layers

1. **Application bootstrap** — startup sequence, configuration, lifecycle coordination.
2. **Platform adapter** — YouTube Playables SDK boundary, save/load, pause/resume, audio state, platform events.
3. **Gameplay domain** — cases, clues, evidence, puzzles, deductions, progression, and rules.
4. **World and presentation** — scenes, cameras, lighting, character presentation, animation, interaction detection.
5. **UI** — menus, HUD, journal, evidence board, dialogue, accessibility and responsive layouts.
6. **Asset infrastructure** — manifest, loading, caching, validation, and deterministic resource disposal.

### Dependency rules

- Domain modules must not import Three.js or YouTube SDK types.
- UI requests gameplay actions through application-facing interfaces; it does not mutate domain state arbitrarily.
- Platform-specific code stays behind typed interfaces.
- Asset loading is centralized; scene code does not create uncontrolled duplicate loaders.
- Long-lived resources have explicit ownership and disposal.
- Definitions, runtime state, and persisted save data are separate models.

## Initial vertical slice

The first playable slice should prove the hardest foundational risks with deliberately small scope:

- One compact location.
- One controllable investigator.
- One companion/story character.
- Third-person camera and mobile controls.
- Three inspectable clues.
- One puzzle.
- Evidence journal and a deduction/case-resolution flow.
- Pause/resume and save/load integration behind the platform adapter, using current official SDK documentation.

The slice is not a content-production milestone. It is an architecture and performance validation milestone.

## Proposed source layout

```text
src/
  bootstrap/
  core/
  platform/
    contracts/
    youtube/
  domain/
    cases/
    investigation/
    progression/
  engine/
    renderer/
    scenes/
    camera/
    input/
    interaction/
  world/
  characters/
  ui/
  assets/
tests/
  unit/
  integration/
  gameplay/
tools/
docs/
```

The layout may be adjusted when actual code demonstrates a better boundary. Avoid empty abstractions and speculative frameworks.

## Quality attributes

- Responsive input and readable UI on small touch screens.
- Stable frame pacing on representative low-end Android devices.
- Predictable memory use and zero accumulating GPU resources across repeated scene transitions.
- Deterministic clue, puzzle, and save-state behavior.
- Testable domain rules without a renderer.
- Reproducible cloud builds and verifiable release artifacts.
- Platform compliance verified against current official documentation before submission.

## Explicit non-goals for the first slice

No open world, multiplayer, account system, custom backend, runtime generative dialogue, large physics simulation, destructible world, dynamic weather, or remote gameplay-content delivery.

## Decision governance

Architecture decisions are recorded as ADRs in this directory. A decision is not considered validated merely because it is documented. Each significant choice must state its rationale, trade-offs, validation evidence, and revisit conditions.
