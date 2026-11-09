# YouTube Playables — Game Development & Integration Standard

**Document type:** Reusable engineering standard  
**Status:** Project standard  
**Applies to:** Every new game built for YouTube Playables, regardless of genre or engine  
**Owner:** Game engineering  
**Review rule:** Verify the linked Google documentation before each release; Playables requirements and SDK behavior can change.

This document is the mandatory starting point for future YouTube Playables projects. Its purpose is to prevent each new game from rediscovering the platform rules, SDK lifecycle, persistence behavior, test-suite workflow, and release gates.

> **Important distinction:** Passing the SDK Test Suite validates the checks exposed by that suite. It does not, by itself, certify a game, prove every device/platform behavior, or guarantee publication. Keep automated integration results, manual device validation, and Google's certification/review outcome as separate records.

---

## 1. Platform model and engineering principles

YouTube Playables are web games running inside YouTube's web and mobile app environments. Build with standards-compliant web technologies and a rendering API supported by browsers, such as Canvas or WebGL. Common engines/frameworks include Three.js, Phaser, PlayCanvas, Unity WebGL, Godot web exports, and others.

### 1.1 Non-negotiable principles

1. **Platform integration is an adapter, not game logic.** Game systems call a typed platform interface. Only the platform adapter talks to the global `ytgame` SDK.
2. **Cloud save is the sole Playables progress store.** In the Playables environment, do not use `localStorage`, IndexedDB, cookies, remote databases, or another mechanism to persist player progress. Browser-only fallback storage may be used only outside Playables.
3. **Load before save.** A successful `loadData()` must settle before any `saveData()` call. Never overwrite cloud data after a failed or unreadable load.
4. **Readiness is a lifecycle contract.** Load the SDK first; render a real first frame; call `firstFrameReady()`; finish required initialization; then call `gameReady()` only when the game is genuinely interactive.
5. **Pause means stop.** On SDK `onPause`, stop game execution and interactions. Resume only on `onResume`.
6. **Audio follows YouTube.** Respect `isAudioEnabled()` and `onAudioEnabledChange()`, device volume, and the user's mute state.
7. **Touch and mouse parity are mandatory.** Every gameplay and UI interaction must work with both.
8. **Mobile-first performance is a design constraint.** Budgets must be planned before assets and levels are produced.
9. **No unsupported assumptions.** Local browser success is not proof of SDK integration. An in-iframe reload is not proof of cross-session cloud persistence. A passing test suite is not certification.

### 1.2 Recommended game architecture

Keep these responsibilities separate:

- **Game/domain layer:** rules, progression, inventory, puzzles, score, checkpoints.
- **Presentation/engine layer:** renderer, scene graph, camera, animation, audio playback, UI.
- **Platform layer:** YouTube SDK, lifecycle, cloud save, audio policy, score submission.
- **Persistence model:** versioned, validated, compact serializable game state.
- **Build/release layer:** bundling, compression, CI, artifact inspection, deployment and evidence.

A typical structure:

```text
game/
├── index.html
├── public/
│   └── assets/
├── src/
│   ├── bootstrap/          # ordered startup and readiness
│   ├── platform/           # Playables adapter and browser adapter
│   ├── domain/             # game rules and state
│   ├── persistence/        # schema, migration, validation, save queue
│   ├── engine/              # rendering, input, audio, resource lifecycle
│   ├── gameplay/
│   └── ui/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── platform/
│   ├── architecture/
│   └── release/
└── .github/workflows/
```

Do not force this exact folder layout onto every engine. Preserve the separation of responsibilities.

---

## 2. SDK loading and startup lifecycle

### 2.1 Load the SDK before all game code

The root HTML entry point must include the official SDK script before application scripts or modules:

```html
<script src="https://www.youtube.com/game_api/v1"></script>
```

Do not overwrite the global `ytgame`. Do not defer SDK initialization until after the game bundle has started. For Vite projects, verify generated HTML and script ordering in the production build—not only the source HTML. Disable or configure build features such as module-preload polyfills if they execute before the SDK.

Google notes that the SDK is a no-op in a normal local development environment. Use the Test Suite to validate actual integration behavior.

### 2.2 Required startup sequence

Use one explicit bootstrap coordinator. The logical order is:

1. Browser document and SDK script load.
2. Read `window.ytgame` and determine whether the game is in the Playables environment using `IN_PLAYABLES_ENV`.
3. Construct platform services and register lifecycle/audio callbacks early enough to avoid missing events.
4. Start rendering a truthful loading/splash frame. It must visibly communicate that loading is underway.
5. Render that first frame to the display.
6. Call `ytgame.game.firstFrameReady()` exactly once.
7. Load and validate cloud save data (or initialize browser-only storage outside Playables).
8. Restore game/domain state and finish all initialization required before interaction.
9. Make the actual game interface interactive.
10. Call `ytgame.game.gameReady()` exactly once.

`firstFrameReady()` must precede `gameReady()`. Do not call `gameReady()` while a non-interactive loading screen remains. The loading spinner is controlled by this signal.

A game may render its loading frame before cloud loading completes. It must not allow player progress to mutate/save against an uninitialized save state.

### 2.3 Failure handling

- A rejected `loadData()` is a load failure, not an empty new save.
- A malformed or unsupported save is a data compatibility failure, not an empty new save.
- In either case, protect the existing cloud record: do not save a newly created blank state over it.
- Show a player-safe message if the session is temporary or progress cannot be saved.
- Record diagnostic metadata (error type, error name/message where safe, load duration, payload length, build/version); never log personal data or full save payloads.
- Do not silently mark a failed load as successful.

---

## 3. Cloud save design — critical

### 3.1 Platform contract

The SDK exposes:

- `ytgame.game.loadData(): Promise<string>`
- `ytgame.game.saveData(data: string): Promise<void>`

The returned string is application-defined serialized data. Google requires cloud save for material progress and prohibits alternate progress persistence mechanisms in Playables. The saved game MUST remain below **3 MiB**; SHOULD remain below **500 KiB**. The exit flush is best-effort and limited to 64 KiB, so do not rely on exit-only saving.

### 3.2 Required initialization state machine

Model persistence explicitly:

```text
UNINITIALIZED
   |
   v
LOADING -- loadData resolves empty --> READY_NEW
   |                                  |
   | loadData resolves data           |
   v                                  |
VALIDATING -- valid/migrated --> READY_CLOUD
   |
   +-- invalid / unsupported --------> READ_ONLY_PROTECTED
   |
   +-- loadData rejects -------------> READ_ONLY_PROTECTED

READY_NEW / READY_CLOUD
   |
   +-- material progress --> SAVE_QUEUED --> SAVING --> READY
   |
   +-- save failure -------------------------------> SAVE_ERROR (retry safely)
```

Only `READY_NEW` and `READY_CLOUD` may write. The name `READY_NEW` means that the SDK successfully returned an empty save; it does **not** mean that the load call failed.

A load rejection must never be converted into `''`. Do not set a successful-load flag in a catch/finally path.

### 3.3 Save schema

Every game must define a versioned envelope, for example:

```json
{
  "schemaVersion": 1,
  "gameVersion": "1.0.0",
  "updatedAt": 0,
  "progress": {},
  "settings": {}
}
```

Requirements:

- Keep the payload compact and deterministic.
- Persist authoritative progression, not transient presentation state.
- Store stable IDs, not display labels or entire asset data.
- Validate types, ranges, required fields, collection sizes, and enum values before applying data.
- Reject unknown future schema versions safely; never overwrite them with defaults.
- Provide explicit migrations from every supported older schema.
- Keep migrations deterministic and covered by tests.
- Do not store locale or other volatile platform settings in the save unless the current official SDK guidance explicitly requires it.
- Keep best score consistent with the best score submitted through `sendScore`, if scores are used.
- Avoid storing derived state that can be reconstructed from authoritative progression.

### 3.4 Save timing and serialization

Save after meaningful milestones that imply progress is retained: level/checkpoint transitions, puzzle completion, important unlocks, inventory/evidence changes, mission completion, and other material progress.

Use a serialized save queue so writes cannot race and an older snapshot cannot finish after a newer snapshot. Debounce high-frequency changes, but never debounce away a material milestone. Capture an immutable snapshot at enqueue time.

On pause, request a save and stop gameplay execution. Treat the pause save as best effort; do not assume the callback can block YouTube. Keep the save payload below the exit-flush limit as well as the normal hard limit.

A successful promise from `saveData()` means the SDK accepted/completed that call. It does not, by itself, prove that the data will be returned in a completely new YouTube/Test Suite session. Verify persistence through the supported test workflow.

### 3.5 Browser development fallback

Outside Playables only, a browser adapter may use `localStorage` or another development store. Select the adapter based on the actual SDK environment, not a user-agent string.

- Playables: cloud adapter only.
- Ordinary local/browser preview: browser adapter allowed.
- Never read browser fallback data as a substitute for a Playables cloud save.
- Never write browser progress while running in Playables.

### 3.6 Cross-session cloud-save test protocol

Keep these cases distinct and record each result:

1. **Same page, game reload:** reload the game iframe/content while keeping the Test Suite page open.
2. **Fresh Test Suite session:** fully close the Test Suite page/app context, reopen the Test Suite, and load the same game.
3. **Fresh YouTube session:** where a developer preview is available, close and reopen the game in YouTube under the same account.
4. **Account/history state:** check the YouTube account's relevant YouTube History setting when Google documentation indicates it affects saved Playables data. Do not clear history or delete game data as a diagnostic shortcut.

For every test, record: game URL/build ID, account/session context (without storing personal identifiers), progress written, save promise outcome, raw load result category (empty/non-empty/rejected), restored progress, timestamp, and screenshot/log evidence.

A successful same-page reload is **not** evidence that a fully closed-and-reopened session restored cloud data. If a fresh session returns an empty string after a confirmed save, capture the evidence and isolate account/history, Test Suite context, build/game identity, and SDK behavior before changing the save schema. Do not claim Google-side fault without evidence.

---

## 4. Scores and engagement

Scores are optional. If implemented:

- Send the score using `ytgame.engagement.sendScore({ value })`.
- Submit an integer that matches the game's own scoring rules.
- Validate range and safe-integer constraints before calling the SDK.
- If a best score exists in cloud save, the best score sent to YouTube must match it.
- Do not send scores for arbitrary UI events or before the score is final.
- Test that the Test Suite receives an integer and that repeated submissions behave as intended.

Keep score calculation in the domain layer; keep SDK submission in the platform adapter.

---

## 5. Audio requirements

- Read the initial state through `ytgame.system.isAudioEnabled()`.
- Subscribe to `ytgame.system.onAudioEnabledChange(callback)`.
- Apply the state to every audio path: music, ambience, effects, dialogue, and any third-party audio engine.
- Respect device/system volume and do not start unexpected audio.
- When YouTube mute is enabled, no game audio may be output. In-game controls must not override YouTube mute.
- Prefer not to add a second global mute toggle; granular controls are permitted only when they still obey platform mute.
- Unsubscribe callbacks and dispose audio resources when appropriate.

Test startup while muted, toggling mute both directions during playback, resume after pause, and device volume behavior.

---

## 6. Pause and resume requirements

Register `ytgame.system.onPause()` and `ytgame.system.onResume()`.

On pause, stop all game execution, including:

- render/game loop and simulation updates;
- player input and interaction processing;
- timers, countdowns, physics and AI updates;
- music, ambience and effects;
- game-owned network activity or background work.

Request a progress save on pause. On resume, restore execution only in response to `onResume`; avoid a double animation loop or duplicated subscriptions.

Do **not** use the Page Visibility API or equivalent browser visibility events as the game's pause/resume authority. Google requires the SDK callbacks. A browser may still resize or reflow; that is not a substitute for lifecycle callbacks.

Test repeated pause/resume cycles, pause during a transition, pause during a save, and resume after the device/app returns.

---

## 7. Input, viewport, accessibility and UX

### 7.1 Input

- Every control and gameplay interaction MUST support touch and mouse.
- Prevent accidental browser gestures only where appropriate; do not suppress required platform/browser behavior.
- Avoid delayed, dropped, or double-processed input.
- Support keyboard navigation/directional input where appropriate.
- Provide visible close controls for dialogs; support Escape where appropriate and do not call `preventDefault()` on Escape.

### 7.2 Responsive viewport

- Adapt to changing viewport dimensions and all supported aspect ratios.
- Do not lock orientation or device posture.
- Preserve game state during resize; do not restart the game.
- Handle an initial zero-sized WebView viewport. Initialize safely and recalculate dimensions when a non-zero resize arrives.
- Avoid scrollbars around the game surface.
- Keep text and graphics crisp across pixel densities.

### 7.3 Accessibility and interaction quality

Use legible typography, sufficient contrast, clear control hierarchy, visible focus/pressed/disabled states, and generous touch targets. Google design best practices recommend touch targets of at least 48 dp with at least 8 dp spacing. Provide a short onboarding/tutorial for unfamiliar controls and a clear paused state/resume affordance where appropriate.

---

## 8. Stability, bundle and performance budgets

Google's current stability requirements include:

| Metric | Requirement / target |
|---|---:|
| Initial bundle before `gameReady` | MUST be below 30 MiB |
| Initial bundle preferred target | SHOULD be below 15 MiB |
| Total game bundle | MUST be below 250 MiB by default |
| Individual file | MUST be below 30 MiB |
| Individual file preferred target | SHOULD be below 512 KiB |
| Serialized save | MUST be below 3 MiB |
| Serialized save preferred target | SHOULD be below 500 KiB |
| Time to interactive | SHOULD be under 5 seconds |
| Peak JavaScript heap | MUST remain below 512 MB |
| Reproducible crashes | MUST NOT occur |

The initial bundle is measured through `gameReady`, not merely the HTML/JS entry file. Compression affects transfer size; use the Test Suite or production-equivalent compressed hosting to measure accurately.

Engineering recommendations:

- Load only what is needed to become interactive; lazy-load later content where permitted.
- Compress textures/audio and use suitable formats and dimensions.
- Avoid unnecessarily large individual assets.
- Dispose GPU resources, geometries, materials, textures, audio nodes and event listeners.
- Reuse assets and avoid per-frame allocations.
- Profile on representative low/mid-range mobile devices.
- Measure real startup, memory and frame-time behavior; do not rely only on desktop simulation.

---

## 9. Security, privacy, content and bundle restrictions

Before release, review the current Google requirements. In particular:

- Do not make external calls to arbitrary URLs/services from the game. Only make calls explicitly required by the Playables technical requirements, such as the official YouTube SDK.
- Do not attempt to bypass external-call restrictions.
- Do not collect personal information or present login/account-creation screens.
- Do not access the clipboard except in response to an explicit user paste action.
- Do not create or display QR-code-like content.
- Do not obfuscate code or conceal game functionality. Ordinary minification/transpilation is allowed.
- Treat WebAssembly, eval, and Web Workers as potentially review-sensitive; check the latest policy before adopting them.
- Implement the game as a single-page application.
- Use relative paths for files in the game bundle.
- Keep bundle filenames within Google's allowed character set and total file count at or below 8,000.
- Ensure all art, music, fonts, brands, likenesses and other assets are original, authorized, or properly licensed.
- Content must comply with YouTube Community Guidelines and be suitable for a general audience (13+); do not target children specifically.
- Do not use misleading metadata or thumbnails.

This section is a preflight summary, not a substitute for reading the linked requirements.

---

## 10. Build, CI and deployment workflow

Every game must have a repeatable pipeline:

1. Install dependencies from the lockfile using a clean environment.
2. Run formatting/lint checks if configured.
3. Run TypeScript/type checks.
4. Run unit tests for domain rules, save schema/migrations, lifecycle guards and platform adapter behavior.
5. Run integration tests with a mocked SDK, including promise resolution/rejection and lifecycle callbacks.
6. Build the production bundle.
7. Inspect generated HTML to verify SDK script ordering.
8. Inspect bundle contents, relative paths, individual file sizes, total size and file count.
9. Run browser E2E smoke tests for startup, controls, core gameplay, resize and error-free operation.
10. Deploy the exact tested commit.
11. Run the Google Playables Test Suite against the deployed build.
12. Perform manual device/YouTube preview checks where access is available.
13. Record evidence and release status.

CI green means repository checks passed. Deployment green means the hosting workflow published the build. Test Suite green means the selected Google integration checks passed. These are separate statuses.

### 10.1 Required automated test cases

At minimum, automate:

- SDK script appears before game application code.
- SDK absent: local/browser development mode works without pretending to be Playables.
- `firstFrameReady` occurs once and before `gameReady`.
- `gameReady` is blocked until first frame and persistence initialization settle.
- `loadData` empty resolves to a new writable save.
- `loadData` non-empty valid data restores the save.
- `loadData` rejection creates a protected, non-writable session.
- malformed and unsupported future save versions do not overwrite cloud data.
- save is blocked before successful load.
- save queue preserves ordering and latest snapshot.
- material milestones trigger saves.
- score values are valid integers and best-score rules are respected.
- initial audio state and audio-change callbacks are applied.
- pause stops all execution; resume restarts exactly once.
- touch and mouse perform equivalent actions.
- resize preserves game state, including zero-size then non-zero viewport.
- no uncaught errors during boot, gameplay, pause/resume or save.

---

## 11. Google Playables Test Suite procedure

Open the official [Playables SDK Test Suite](https://developers.google.com/youtube/gaming/playables/test_suite).

For each release candidate:

1. Deploy the candidate and capture its commit SHA/build identifier.
2. Open the Test Suite and enter the exact deployed game URL.
3. Run all available **MUST** checks.
4. Run all available **SHOULD** checks.
5. Resolve every MUST failure before proceeding.
6. Investigate SHOULD failures; record a reason and an explicit disposition for any accepted exception.
7. Repeat intermittent failures from a fresh test run and preserve the first failure evidence. Do not dismiss a flaky failure because a retry passed.
8. Run the cloud-save protocol in Section 3.6 separately; do not infer cross-session persistence from a single iframe reload.
9. Record exact results, date, build, URL, screenshots and relevant console diagnostics.

### 11.1 Common checks and evidence to record

The Test Suite may change over time. Record the actual labels shown by the current suite rather than assuming a fixed test list. Common checks include:

- SDK loaded before game code.
- `firstFrameReady` called before `gameReady`.
- `gameReady` called.
- `gameReady` within the recommended five-second target.
- Cloud save data under 3 MiB.
- JavaScript heap under 512 MiB.
- `sendScore` called with an integer when score integration is implemented.
- Audio/mute behavior.
- Pause/resume behavior.

Do not mark a check passed based on source-code inspection alone when the Test Suite is designed to execute it.

### 11.2 Test result record

Use this template for every run:

| Field | Value |
|---|---|
| Game / release | |
| Commit SHA | |
| Deployed URL | |
| Test date/time | |
| Test Suite run context | |
| MUST checks | Pass / Fail / N/A |
| SHOULD checks | Pass / Fail / N/A |
| Cloud same-page reload | Pass / Fail / Not tested |
| Cloud fresh-session reopen | Pass / Fail / Not tested |
| Device/browser checks | |
| Failures and evidence | |
| Follow-up commit | |

---

## 12. Developer Portal submission and publication

When the game is ready for formal submission:

- Prepare the ZIP bundle and correct entry point.
- Provide accurate title, description, genre, publisher/developer metadata and language.
- Prepare thumbnails for the required aspect ratios.
- Review monetization settings; understand which ad types are enabled and which SDK calls activate them.
- Declare accessibility features accurately.
- Obtain the required IARC age rating.
- Test preview links on desktop web, mobile web, YouTube for Android and YouTube for iOS where available.
- Complete the portal review and submit for Google's review.
- Do not call the game certified or published until the portal confirms that state.
- Do not share restricted development/staging links outside permitted certification testing.

---

## 13. Reusable new-game kickoff checklist

Before writing gameplay code for a new Playable:

- [ ] Confirm game concept, genre, target audience and core loop.
- [ ] Choose engine/framework and verify it exports a standards-compliant web build.
- [ ] Establish mobile-first visual/input design and supported viewport behavior.
- [ ] Define initial bundle, total bundle, per-file, save-size, memory and startup budgets.
- [ ] Create the platform adapter interface and Playables implementation.
- [ ] Add the official SDK script to the HTML entry point before game code.
- [ ] Implement startup/readiness state machine.
- [ ] Define versioned save schema, migrations and protected failure behavior.
- [ ] Implement cloud save queue and milestone save policy.
- [ ] Implement SDK pause/resume and audio callbacks.
- [ ] Implement touch and mouse parity.
- [ ] Add unit, SDK-mock integration and browser E2E tests.
- [ ] Add CI build/test/size inspection and deployment workflow.
- [ ] Run the Test Suite early, before substantial content production.
- [ ] Keep a release evidence record and rerun after platform-related changes.

**Reuse rule:** For every new game, copy/adapt the platform adapter, bootstrap sequence, persistence state machine, test matrix and CI checks. Do not copy game-specific domain models or assume another game's save schema, controls, scoring, engine, or asset budgets are appropriate.

---

## 14. Current project implementation notes — Midnight Detectives: Hollow Creek

This section records the reference implementation observed when this standard was authored. It is not a universal requirement.

- TypeScript, Three.js, Vite, Vitest and Playwright.
- SDK script currently appears in the root `index.html`.
- `src/platform/playables-sdk.ts` isolates the SDK behind `PlayablesPlatform`.
- `src/platform/game-persistence.ts` selects Playables cloud save or browser-only storage.
- `src/main.ts` coordinates first-frame/readiness, save restoration and lifecycle integration.
- The project has a save schema and progression projection in the domain layer.
- Test Suite evidence and the cross-session persistence investigation must remain separate from code-level claims.

**Known investigation lesson:** a Test Suite iframe reload while the Test Suite page remains open and a full close/reopen of the Test Suite are different test cases. A cloud restore in the first case does not prove persistence in the second. Preserve this distinction in all future debugging reports.

---

## 15. Official Google references

Always prefer the current English documentation. Check revision history before release because requirements can change.

1. [YouTube Playables — main developer hub](https://developers.google.com/youtube/gaming/playables)
2. [SDK getting started](https://developers.google.com/youtube/gaming/playables/reference/getting_started)
3. [SDK reference](https://developers.google.com/youtube/gaming/playables/reference/sdk)
4. [Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
5. [Stability and performance requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)
6. [Design requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_design)
7. [Privacy and data requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata)
8. [Trust and safety requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_trustsafety)
9. [Design best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design)
10. [SDK Test Suite guide](https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide)
11. [Certification FAQ](https://developers.google.com/youtube/gaming/playables/support/certification_faq)
12. [Developer Portal guide](https://developers.google.com/youtube/gaming/playables/developer_portal)
13. [Requirements revision history](https://developers.google.com/youtube/gaming/playables/certification/revisionhistory)

---

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-10 | Initial reusable standard based on current official Google Playables documentation and the Hollow Creek integration investigation. |
