# Quality Assurance Strategy

**Owner:** Project QA / release gate  
**Status:** Initial strategy

## QA principles

- Quality is designed into each feature, not postponed until the end.
- Acceptance criteria are written before implementation.
- Test gameplay rules independently from rendering.
- Test platform integration through contract tests and controlled mocks, then verify against the real SDK in a platform test build.
- No release claim without recorded evidence.

## Test layers

### 1. Static checks
- TypeScript strict type checking.
- Lint and formatting checks.
- Dependency and license review.
- Asset manifest and path validation.
- Bundle-size and file-count checks.

### 2. Unit tests
- Case state transitions.
- Clue discovery and evidence ownership.
- Puzzle state and solution validation.
- Deduction prerequisites and resolution rules.
- Save serialization, migration, and invalid-data handling.
- Input mapping and configuration logic where deterministic.

### 3. Integration tests
- Interaction detector to investigation service to journal.
- Puzzle completion to evidence update.
- Case resolution to progression.
- Platform adapter lifecycle and save/load behavior.
- Scene transitions and resource disposal.

### 4. Browser/device tests
- Android touch input, viewport changes, pause/resume, audio state.
- Mouse and keyboard support.
- Small-screen UI readability and safe-area handling.
- Startup and loading behavior.
- Frame pacing, memory, and repeated scene transitions.
- Background/foreground transitions and interrupted sessions.

## Initial acceptance criteria for the vertical slice

- Player movement and camera control work with touch and mouse.
- Interactable clues are discoverable once and produce deterministic journal entries.
- The puzzle cannot be completed through invalid state transitions.
- Evidence prerequisites are enforced by domain rules.
- Correct deduction resolves the case; incorrect deductions provide understandable feedback without corrupting state.
- Pause/resume does not duplicate input listeners or animation loops.
- Save/load round-trips supported progression without silently overwriting unread or invalid cloud data.
- Repeated scene transitions do not show steadily increasing resource counts or memory usage.
- The game remains usable at supported portrait, square, and landscape viewport sizes.

## Defect severity

- **Blocker:** data loss, crash, security/privacy issue, broken startup, or progression impossible.
- **Critical:** core investigation flow or platform lifecycle unusable.
- **Major:** important feature broken or severe device-specific degradation.
- **Minor:** workaround exists; limited visual or interaction defect.
- **Trivial:** cosmetic issue with negligible user impact.

## Test evidence

Each completed task should record:
- Commit SHA.
- Checks executed and their actual outcomes.
- Device/browser coverage, if run.
- Known failures and accepted limitations.
- Regression areas affected.

## Release gate

No release candidate is approved while blocker or critical defects remain open. Platform certification, privacy review, accessibility review, and current YouTube Playables requirements are mandatory external gates.
