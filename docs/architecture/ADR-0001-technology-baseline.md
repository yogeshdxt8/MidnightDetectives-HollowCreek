# ADR-0001: Initial Web Technology Baseline

- **Status:** Proposed; validation required
- **Date:** 2026-11-09

## Context

The game targets a browser-hosted Playables environment, with mobile devices as the primary interaction and performance constraint. The project must support a compact 3D mystery experience while keeping gameplay logic independently testable.

## Decision

Begin the technical spike with:

- TypeScript for application and gameplay implementation.
- Three.js for 3D rendering and scene presentation.
- WebGL 2 as the initial graphics target, subject to current platform support verification.
- Vite for local development and production bundling.
- GLB/glTF as the preferred runtime 3D asset format.
- Vitest for domain/unit tests and Playwright for browser-level tests.

## Rationale

This combination offers a small, web-native starting point, direct control over rendering and asset budgets, and a clear separation between game rules and presentation. It avoids committing immediately to a larger game engine runtime before the actual Playables constraints and target-device performance are measured.

## Trade-offs and risks

- Three.js is a rendering library, not a complete game engine. We must deliberately design lifecycle, scene management, input, interaction, animation, and asset ownership.
- WebGL capability and browser behavior vary by device.
- GLB size, texture memory, draw calls, shader cost, and loading time require profiling.
- Toolchain and SDK compatibility must be checked against current official documentation at implementation time.

## Validation required

1. Render and interact with a minimal 3D scene on a representative Android device.
2. Measure startup, frame pacing, memory, and repeated scene transitions.
3. Confirm touch and mouse behavior.
4. Validate production bundle contents and platform SDK lifecycle.
5. Compare the measured complexity and performance with a small engine-based alternative if Three.js creates excessive custom-engine burden.

## Revisit when

The vertical slice shows unacceptable performance, excessive custom engine complexity, platform incompatibility, or a materially better-supported alternative.
