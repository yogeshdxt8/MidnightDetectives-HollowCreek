# Mobile-Only Development Workflow

**Operating constraint:** The project owner works from an Android phone. Do not make a laptop, desktop, local IDE, or manually installed desktop tool a prerequisite.

## Operating principles

- Prefer browser-accessible and cloud-hosted workflows.
- Keep source of truth in GitHub.
- Use cloud CI for builds, tests, linting, and artifact generation.
- Use mobile-friendly web editors or cloud development environments only when hands-on interaction is necessary.
- ChatGPT handles architecture, implementation planning, code generation/review, asset specifications, test design, and repository changes wherever connected tools support them.
- Never claim a build or test passed unless an actual execution result proves it.
- If an operation cannot be performed with available cloud tools, explain the exact blocker and offer the least burdensome mobile-compatible alternative.

## Work delivery cycle

1. Define the task and acceptance criteria.
2. Inspect the current repository state before editing.
3. Implement a coherent, reviewable change.
4. Run available automated checks in cloud CI or a supported execution environment.
5. Review diffs and changed files.
6. Commit completed work to GitHub with a descriptive message.
7. Report the commit, changed paths, validation evidence, and any remaining risks.

## Repository safety

- Keep the repository private during development.
- Do not ask the owner to paste passwords, personal access tokens, or secrets into chat.
- Use the connected GitHub integration for repository operations when available.
- Store CI secrets only in GitHub's supported secret store; never commit them.
- Prefer small, auditable commits over opaque bulk changes.

## Asset production

- Favor procedural and code-generated assets when quality permits.
- Use mobile-accessible cloud tools for 3D generation, conversion, optimization, and validation.
- Keep source assets and runtime-optimized assets distinguishable.
- Do not assume a generated visual is a rigged, editable, game-ready model.
- Validate scale, pivots, materials, texture dimensions, animation clips, and file size before integration.

## Release discipline

A release candidate must have a reproducible build, recorded test results, asset validation, device testing evidence, and a known commit SHA. YouTube publication remains subject to platform access and certification.
