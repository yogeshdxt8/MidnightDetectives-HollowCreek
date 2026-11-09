# Midnight Detectives: Hollow Creek

**A cinematic, third-person supernatural escape adventure set in the world of Midnight Detectives.**

Explore a mysterious, connected Hollow Creek, search for three missing teammates, uncover evidence, solve logical mechanisms, survive supernatural encounters, and work toward getting the team out safely.

---

## Project overview

*Midnight Detectives: Hollow Creek* is a single-player 3D adventure being developed for web-based gameplay, with YouTube Playables as its target publishing platform.

The campaign is designed as one continuous adventure across ten compact, connected levels—not an open world and not a set of disconnected case-selection stages. Exploration, curiosity, investigation, logical problem-solving, teamwork, and paced supernatural suspense form the core experience.

The game is intended for a **general audience aged 13+**. This is the product's intended audience and positioning; it is distinct from the fictional ages of its protagonists. The game must not be positioned or marketed as specifically for young children.

The player selects one of the four established detectives before starting. That detective is controlled by the player; the other three participate as AI companions and story characters. The story remains the same regardless of the selected protagonist.

## The four detectives

The central team consists of:

- Ethan Parker
- Noah Brooks
- Lily Carter
- Maya Williams

Their established identities, personalities, relationships, and canonical visual designs are governed by the project's approved source material and the [Game Design Bible](docs/design/game-design-bible.md).

**Internal canon note:** Their exact ages are maintained in internal design references but are never disclosed in player-facing game content. Do not state or imply an exact age in dialogue, UI, narration, collectibles, or other in-game content.

The player chooses one detective as the playable lead. The other three are AI-controlled during the opening and join the player through the story. All four appear in the opening cinematic and ultimately reunite for the finale.

## Opening story — Four Gates

The four detectives arrive at Hollow Creek to investigate unusual reports. After they exit their vehicle, they discover four separate gates. The Hollow Man and the Shadow Walker appear, and the detectives run.

The player controls the selected detective during the chase while the other three run ahead. Each companion enters a different gate; each gate visibly slams shut and locks. The player cannot follow them. The fourth gate remains open, and the player must enter it to survive.

After entering, the gate closes behind the player. The detective is alone inside Hollow Creek, and the search for the missing teammates begins.

This opening direction is approved. Detailed level content beyond the approved sequence remains subject to the Game Design Bible and creator approval.

## Core gameplay

- **Third-person exploration:** The player always sees the selected detective during normal gameplay. The camera follows from behind or over the shoulder; there is no first-person gameplay mode.
- **Connected locations:** Explore compact rooms, corridors, exterior spaces, and mechanisms within a coherent world.
- **Dependency-based puzzles:** Find useful objects in one room and use them in another. Prepare, repair, power, or activate mechanisms whose effects may change other rooms.
- **Investigation and evidence:** Discover story evidence that answers questions, reveals connections, or raises new questions.
- **Contextual interactions:** Objects communicate what they are, their current state, what is missing, and what the player can do.
- **Teamwork:** Find the missing detectives and make their presence meaningful to gameplay and story.
- **Supernatural suspense:** Encounter the established entities through atmosphere, anticipation, readable danger, and fair survival mechanics.
- **Progress-preserving checkpoints:** Failed encounters restart only the encounter. Previously collected evidence/items, solved puzzles, unlocked routes, rescued teammates, and campaign progress are preserved.

## Physical room and level transitions

**Every ordinary room exit and every level-to-level transition must be experienced as physical travel through the world.**

The player physically passes through a believable connection such as a door, gate, tunnel, stairway, hatch, or passage. There are no ordinary level-complete screens that replace travel, no unexplained teleportation, and no abrupt placement in an unrelated location.

Transitions should create anticipation and reveal something meaningful about the next space. The detective remains visible during normal traversal and cinematic reveals; camera control returns cleanly to the player. Inventory, evidence, puzzle states, unlocked routes, rescued teammates, and campaign progress are preserved.

The technical implementation may stream or load areas behind the scenes, but the player's experience should feel like exploring one connected, mysterious world.

## Campaign structure

The current high-level campaign direction is ten compact levels:

1. Four Gates / Town Entrance
2. Abandoned Residence
3. Underground Passage
4. Abandoned School
5. Forest Boundary
6. Forgotten Archive
7. Clock Tower
8. Hidden Chamber
9. Sealed Boundary
10. Final Escape

This is a working campaign outline, not a fully approved room-by-room story. Exact level events, evidence counts, enemy appearances, reunion sequence, and dependencies must be specified and approved before being treated as canon.

The Clock Tower is established as one of the Twelve Mechanisms. The other eleven mechanisms, the identity of the forgotten person, and the full origin/history of the supernatural events remain unresolved. Do not invent or prematurely reveal these details.

## Supernatural entities

The project's established entities include:

- **ANT-001 — The Hollow Man:** Weathered hat, pale mask, tattered charcoal coat; silent, watchful, and psychologically unsettling.
- **ANT-002 — The Shadow Walker:** Faceless hood, violet eyes or energy, torn shadow-like fabric, elongated claws; a silent supernatural threat.

Preserve their approved visual identities and references. Their origins, motives, powers, weaknesses, voices, and detailed gameplay behavior are not to be invented or treated as canon without explicit approval.

## Design and canon documentation

The repository is the single source of truth for approved design decisions.

- [Game Design Bible](docs/design/game-design-bible.md) — living game vision, approved mechanics, story constraints, transitions, progression, open decisions, and revision history.
- [13+ Creative and Product Design Standard](docs/design/13-plus-creative-product-design-standard.md) — audience positioning, tone, visual direction, character/entity continuity, accessibility, and content standards.
- [YouTube Playables Game Development & Integration Standard](docs/platform/youtube-playables-game-development-standard.md) — mandatory reusable platform architecture, SDK lifecycle, cloud-save rules, performance budgets, Test Suite procedure, CI/release gates, and new-game kickoff checklist.

Only decisions explicitly marked approved/locked in the Game Design Bible are binding. Proposals and open questions must not silently become canon. When the creator approves a meaningful design decision, update the relevant documentation and revision history in the repository.

## Technical direction

| Area | Technology |
|---|---|
| Language | TypeScript |
| 3D rendering | Three.js |
| Graphics | WebGL 2 |
| Development server and build | Vite |
| 3D asset format | GLB / glTF |
| Audio | Web Audio API |
| Unit testing | Vitest |
| Browser testing | Playwright |
| Source control | GitHub |
| CI/CD | GitHub Actions |
| Target platform | YouTube Playables |

These technologies form the current engineering direction and may evolve as the playable vertical slice and platform constraints are validated.

## Architecture principles

- Separate gameplay/domain logic from rendering and platform-specific code.
- Use modular systems with clearly defined responsibilities.
- Keep levels, items, dependencies, interactions, evidence, and encounters data-driven where practical.
- Separate authored definitions, runtime state, and persisted state.
- Centralize asset loading, caching, and resource disposal.
- Design for mobile-first performance and responsive rendering.
- Isolate YouTube SDK integration behind a platform adapter.
- Maintain strong TypeScript typing and automated tests.
- Avoid unnecessary backend infrastructure and expensive general-purpose AI.

## YouTube Playables compatibility

YouTube Playables is the intended publishing platform. The implementation must be validated against current official requirements, including:

- Playables SDK lifecycle and readiness.
- Platform-managed save and load functionality.
- Pause and resume events.
- Platform audio settings.
- Touch and mouse input.
- Responsive viewport handling across aspect ratios.
- Performance, memory, and package-size requirements.
- Accessibility, privacy, trust-and-safety, testing, certification, and publishing requirements.

A successful browser build or automated project test does not itself guarantee Playables certification or publication. Do not claim certification or physical-device validation until those checks have actually been completed and recorded.

## Development status

The repository contains an interactive browser prototype and automated development workflows. The prototype has included a procedural 3D environment blockout, mobile movement/look controls, proximity-based clue collection, an evidence journal, evidence detail panels, a deduction exercise, a case report, and replay/reset functionality.

These prototype elements are not all final game content. Placeholder characters, sample clues/cases, and blockout environments must not be mistaken for approved canonical assets or final level design.

The project has also been developing its platform integration, persistence, lifecycle handling, scoring, input, automated tests, and deployment pipeline. The exact completion state of each technical release gate must be checked in the current source, CI runs, and validation records. Google Playables Test Suite execution and representative physical-device validation must not be assumed complete without evidence.

## Quality standards

The project prioritizes:

- Stable gameplay on supported mobile devices.
- Consistent character and environment presentation.
- Third-person camera visibility and responsive controls.
- Fast startup and responsive interactions.
- Efficient 3D rendering and asset delivery.
- Reliable save, checkpoint, and progression handling.
- Clear, fair dependencies and contextual feedback.
- Meaningful exploration and investigation.
- Testable, modular, maintainable code.
- Consistent narrative and visual continuity.

## Planned repository structure

The source organization is expected to evolve toward:

```text
MidnightDetectives-HollowCreek/
├── public/
│   └── assets/
├── src/
│   ├── bootstrap/
│   ├── core/
│   ├── platform/
│   ├── engine/
│   ├── world/
│   ├── characters/
│   ├── investigation/
│   ├── gameplay/
│   ├── ui/
│   └── assets/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── gameplay/
├── tools/
├── docs/
│   ├── architecture/
│   ├── design/
│   ├── performance-budgets/
│   └── release/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

This is a planned structure; directories and files will be introduced when their responsibilities are implemented.

## License and intellectual property

All rights reserved.

Midnight Detectives, Hollow Creek, its characters, designs, stories, and associated creative assets are part of the project's intellectual property. No permission to reproduce or distribute these materials is granted by this repository.

## Preview deployment

The `Deploy playable preview` GitHub Actions workflow builds, tests, and publishes the browser preview to GitHub Pages after changes are pushed to `main`.
