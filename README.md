# Midnight Detectives: Hollow Creek

**A 3D single-player mystery-adventure set in the world of Midnight Detectives.**

Explore Hollow Creek, investigate unusual events, discover hidden clues, solve challenging puzzles, connect evidence, and uncover the truth.

---

## Project overview

*Midnight Detectives: Hollow Creek* is a single-player 3D mystery-adventure game designed for web-based gameplay, with YouTube Playables as its target publishing platform.

The player becomes the fifth investigator and works alongside the four established members of the Midnight Detectives to investigate mysteries throughout Hollow Creek.

The experience emphasizes exploration, observation, investigation, reasoning, and deduction rather than combat. The game is being designed mobile-first while retaining mouse and desktop browser support.

## The detective team

The four central characters are equal leads, each bringing a different perspective to investigations.

| Character | Strengths |
|---|---|
| Ethan Parker | Logic, evidence analysis, timelines, and connecting contradictions |
| Noah Brooks | Creativity, overlooked details, emotional insight, and unexpected connections |
| Lily Carter | Observation, exploration, physical trails, and physical evidence |
| Maya Williams | Technology, recordings, signals, and research |

The player controls the fifth investigator. The four established characters participate as AI-controlled companions and story characters. Their strengths are complementary, not rigid character classes.

## Core gameplay

- Explore Hollow Creek and its investigation locations.
- Examine objects and discover hidden clues.
- Collect and organize evidence.
- Interview characters and investigate conflicting accounts.
- Solve environmental, mechanical, scientific, and logical puzzles.
- Reconstruct timelines and connect evidence.
- Make deductions and resolve investigations.
- Unlock cases and locations through progression.

## Gameplay structure

1. **Hollow Creek Hub** — Navigate the town and discover available investigations.
2. **Case Selection** — Choose an investigation.
3. **Exploration** — Search locations and examine the environment.
4. **Investigation** — Discover clues and collect evidence.
5. **Puzzles** — Solve challenges using observation and reasoning.
6. **Deduction** — Connect evidence and evaluate explanations.
7. **Case Resolution** — Reveal the solution and progress through the game.

## Technical direction

The initial technical direction is:

| Area | Technology |
|---|---|
| Language | TypeScript |
| 3D rendering | Three.js |
| Graphics | WebGL 2 |
| Development server and build | Vite |
| 3D asset format | GLB / glTF |
| 3D asset production | Blender and compatible cloud-based tools |
| Audio | Web Audio API |
| Unit testing | Vitest |
| Browser testing | Playwright |
| Source control | GitHub |
| CI/CD | GitHub Actions |
| Target platform | YouTube Playables |

These choices are an initial engineering direction, not immutable commitments. They will be validated through a working vertical slice before being finalized.

## Architecture principles

- Separate gameplay/domain logic from rendering and platform-specific code.
- Use modular systems with clearly defined responsibilities.
- Build reusable investigation, puzzle, and interaction systems.
- Define cases, clues, puzzles, and progression through data-driven content.
- Separate authored definitions, runtime state, and persisted state.
- Centralize asset loading, caching, and resource disposal.
- Design for mobile-first performance and responsive rendering.
- Isolate YouTube SDK integration behind a platform adapter.
- Maintain strong TypeScript typing and automated tests.
- Avoid unnecessary backend infrastructure.

## YouTube Playables compatibility

YouTube Playables is the intended publishing platform. The implementation will account for:

- Playables SDK lifecycle and readiness.
- Platform-managed save and load functionality.
- Pause and resume events.
- Platform audio settings.
- Touch and mouse input.
- Responsive viewport handling.
- Performance and package-size requirements.
- Platform testing, certification, and publishing requirements.

**Publishing access and final certification are subject to YouTube's developer requirements and approval.** A successful web build does not itself guarantee acceptance or publication.

## Development roadmap

### Phase 1 — Product and architecture foundation
- Establish the game design direction.
- Develop and review the master case catalogue.
- Define architecture and engineering standards.
- Define asset production and validation pipelines.
- Establish the source repository and project documentation.

### Phase 2 — Technical foundation
- Initialize the TypeScript and Three.js application.
- Implement rendering and scene lifecycle.
- Implement input and camera systems.
- Establish asset registry and loading pipeline.
- Integrate the platform abstraction.

### Phase 3 — Vertical slice
- Build the first playable environment.
- Implement the player controller and camera.
- Introduce detective companions.
- Implement clue discovery and evidence collection.
- Build the first investigation puzzle.
- Implement the investigation journal.
- Implement deduction and case resolution.
- Validate mobile performance and platform lifecycle.

### Phase 4 — Game production
- Expand Hollow Creek locations.
- Develop additional cases.
- Implement reusable investigation mechanics.
- Integrate approved character models and animations.
- Add audio, dialogue, and environmental storytelling.
- Optimize assets and gameplay.

### Phase 5 — Testing and publishing
- Test on representative mobile devices and browsers.
- Validate performance, memory, and asset budgets.
- Validate SDK lifecycle and save functionality.
- Run compatibility and regression testing.
- Prepare the Playables submission package.
- Complete applicable YouTube certification and publishing requirements.

## Project status

**Current stage: Product definition and repository foundation.**

The repository has been created and the initial project documentation is being established. The game itself is not yet implemented. Planned features and technical decisions are not considered complete until they have been implemented and validated in a running build.

## Canon and creative continuity

The game belongs to the *Midnight Detectives* franchise. The project will preserve established character identities, approved visual designs, Hollow Creek geography, character relationships, and existing story mythology.

New investigations and story developments remain provisional until reviewed for continuity. Unresolved franchise mysteries and established supernatural rules must not be altered or prematurely revealed.

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
│   ├── asset-guidelines/
│   ├── performance-budgets/
│   └── release/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

This is a planned structure; directories and files will be introduced when their responsibilities are implemented.

## Quality standards

The project prioritizes:

- Stable gameplay on supported mobile devices.
- Consistent character and environment presentation.
- Fast startup and responsive interactions.
- Efficient 3D rendering and asset delivery.
- Reliable save and progression handling.
- Testable, modular, maintainable code.
- Consistent investigation and storytelling quality.

## License and intellectual property

All rights reserved.

Midnight Detectives, Hollow Creek, its characters, designs, stories, and associated creative assets are part of the project's intellectual property. No permission to reproduce or distribute these materials is granted by this repository.

## Preview deployment

The `Deploy playable preview` GitHub Actions workflow builds, tests, and publishes the browser preview to GitHub Pages after changes are pushed to `main`.
