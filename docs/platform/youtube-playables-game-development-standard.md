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

# Implementation Playbook — Build It This Way

This appendix turns the policy above into a repeatable engineering recipe. A developer starting a new game should be able to implement the platform layer from this section without rediscovering the design. Adapt names and engine-specific details, but preserve the contracts and tests.

## A. Define the platform boundary first

Create a game-facing interface. Domain/gameplay code must not import the YouTube SDK or read `window.ytgame`.

```ts
export interface GamePlatform {
  readonly isPlayables: boolean;
  loadSave(): Promise<string>;
  saveData(serialized: string): Promise<void>;
  submitScore(value: number): Promise<void>;
  isAudioEnabled(): boolean;
  onAudioEnabledChanged(callback: (enabled: boolean) => void): () => void;
  onPause(callback: () => void): () => void;
  onResume(callback: () => void): () => void;
  firstFrameReady(): void;
  gameReady(): void;
}
```

Implement two adapters:

- `YouTubePlayablesPlatform`: wraps the real SDK.
- `BrowserDevelopmentPlatform`: supports local development only; it may use browser storage for development progress.

Select the adapter once during bootstrap. The Playables adapter must be selected whenever the SDK reports the Playables environment. Do not use user-agent detection. Do not silently fall back to browser persistence if a Playables cloud call fails.

The SDK adapter should expose only the SDK features the game actually uses. Keep SDK types local to the platform package so an SDK type change does not spread through the game.

## B. Production SDK adapter pattern

The following is a reference shape. Match exact SDK signatures to the current official SDK reference when implementing:

```ts
type YtGameSdk = {
  IN_PLAYABLES_ENV: boolean;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  engagement?: {
    sendScore(input: { value: number }): Promise<void>;
  };
  system: {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(cb: (enabled: boolean) => void): () => void;
    onPause(cb: () => void): () => void;
    onResume(cb: () => void): () => void;
  };
};

declare global {
  interface Window { ytgame?: YtGameSdk }
}

export class YouTubePlayablesPlatform {
  private readonly sdk: YtGameSdk;
  private firstFrameSent = false;
  private gameReadySent = false;
  private loadSettled = false;
  private loadSucceeded = false;

  constructor(sdk: YtGameSdk) {
    if (!sdk.IN_PLAYABLES_ENV) throw new Error("Not in Playables environment");
    this.sdk = sdk;
  }

  async loadSave(): Promise<string> {
    try {
      const raw = await this.sdk.game.loadData();
      if (typeof raw !== "string") throw new Error("SDK returned a non-string save");
      this.loadSucceeded = true;
      return raw;
    } finally {
      this.loadSettled = true;
    }
  }

  async saveData(serialized: string): Promise<void> {
    if (!this.loadSettled || !this.loadSucceeded)
      throw new Error("Cloud write blocked: loadData did not succeed");
    await this.sdk.game.saveData(serialized);
  }

  firstFrameReady(): void {
    if (this.firstFrameSent) return;
    this.sdk.game.firstFrameReady();
    this.firstFrameSent = true;
  }

  gameReady(): void {
    if (this.gameReadySent) return;
    if (!this.firstFrameSent || !this.loadSettled)
      throw new Error("gameReady called before startup prerequisites");
    this.sdk.game.gameReady();
    this.gameReadySent = true;
  }

  // Implement score/audio/pause/resume as thin SDK delegations.
}
```

Important implementation notes:

- Set `loadSucceeded` only after the promise resolves with a valid string.
- Use `finally` only to record that the attempt settled; never to mark it successful.
- If the promise rejects, let the rejection propagate to the persistence coordinator.
- Do not set a default `ytgame` object or mock the SDK in production.
- If optional SDK surfaces are absent in a test/mock environment, fail clearly or handle them according to the current SDK contract.

## C. Bootstrap coordinator: one owner for readiness

Create a single startup function. Do not scatter readiness calls across scene constructors, UI components and asset loaders.

```ts
async function boot(): Promise<void> {
  const platform = createPlatformAdapter(window.ytgame);
  registerPlatformCallbacks(platform);

  const game = createGameShell();
  await game.renderLoadingFrame(); // Must actually submit a frame to the renderer.
  platform.firstFrameReady();

  const persistence = createPersistence(platform);
  const initialization = await persistence.initialize();
  game.restore(initialization.save);
  game.setProgressSavingAvailable(initialization.writable);

  await game.finishRequiredInitialization();
  game.enablePlayerInput();
  platform.gameReady();
}
```

If the engine renders asynchronously, await the render submission/first frame rather than merely constructing a scene or scheduling a future animation frame. Make the loading screen useful and visible. A loading frame must not be a blank canvas.

Startup error handling must preserve the failure category. If cloud load fails, the game may choose a temporary playable session if the product design allows it, but it must visibly communicate that progress cannot safely be saved and must not write a blank save over the existing cloud data.

Avoid unnecessary work before `gameReady`. Load only the content needed for an interactive first experience; stream or lazy-load later content where supported and compliant.

## D. Persistence coordinator: implement the safety rules

Define a save contract for each game:

```ts
export interface SaveEnvelope<TProgress> {
  schemaVersion: number;
  gameVersion: string;
  updatedAt: number;
  progress: TProgress;
}
```

Then implement these operations independently:

1. `parseAndValidate(raw)`: parse JSON, validate the envelope and progress schema.
2. `migrate(save)`: migrate only explicitly supported older versions.
3. `createNewSave()`: create a new default only when SDK load successfully returns an empty string.
4. `captureSnapshot()`: copy authoritative game state into an immutable serializable snapshot.
5. `enqueueSave(snapshot)`: serialize writes and enforce size limits.
6. `flushPendingSave()`: request the latest snapshot when pausing or reaching a lifecycle boundary.

Reference coordinator:

```ts
type Initialization =
  | { status: "ready"; save: GameSave; source: "new" | "cloud"; writable: true }
  | { status: "protected"; save: GameSave; writable: false; reason: string };

class Persistence {
  private writable = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly platform: GamePlatform,
    private readonly createNewSave: () => GameSave,
    private readonly parseAndMigrate: (raw: string) => GameSave,
    private readonly serialize: (save: GameSave) => string,
    private readonly maxBytes: number
  ) {}

  async initialize(): Promise<Initialization> {
    try {
      const raw = await this.platform.loadSave();
      const save = raw.length === 0
        ? this.createNewSave()
        : this.parseAndMigrate(raw);
      this.writable = true;
      return { status: "ready", save, source: raw.length === 0 ? "new" : "cloud", writable: true };
    } catch (error) {
      this.writable = false;
      return {
        status: "protected",
        save: this.createNewSave(),
        writable: false,
        reason: safeErrorMessage(error)
      };
    }
  }

  save(snapshot: GameSave): Promise<void> {
    if (!this.writable) return Promise.reject(new Error("Save is protected"));
    const serialized = this.serialize(snapshot);
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes >= this.maxBytes) return Promise.reject(new Error("Save payload exceeds configured limit"));

    this.queue = this.queue.then(() => this.platform.saveData(serialized));
    return this.queue;
  }

  flush(snapshot: GameSave): Promise<void> {
    return this.save(snapshot);
  }
}
```

Production refinements required beyond this illustrative skeleton:

- Use the exact Google limit and a lower project safety threshold; measure UTF-8 bytes, not JavaScript character count.
- Ensure a failed queued write does not permanently poison all later writes. Recover the queue tail while returning the individual operation's failure to the caller.
- Coalesce obsolete intermediate snapshots safely, but never discard the newest milestone.
- Track a monotonically increasing revision so stale asynchronous snapshots cannot replace newer progress.
- Add bounded retry/backoff only for errors documented as transient. Do not retry invalid parameters or oversized payloads.
- Do not repeatedly retry a permanently rejected `loadData()` and then write defaults.
- Keep save operations observable through structured diagnostics: status, byte count, duration, attempt/revision and safe error category.
- Never include the serialized save, user identifiers, tokens or private player data in logs.
- Set a project budget significantly below 3 MiB; aim for 500 KiB or less and keep exit-flush constraints in mind.

The skeleton intentionally returns a protected default in memory after a load/parse error. The caller must keep `writable=false` for that session. It must not interpret that default as permission to save.

## E. Save model and migration rules

For each game, make a table of what is authoritative and what is derived before writing the schema.

| Data | Persist? | Example |
|---|---|---|
| Completed level/checkpoint | Yes | stable level ID |
| Collected key item | Yes | item ID |
| Solved puzzle | Yes | puzzle ID and validated result |
| Best score | Yes, if used | non-negative integer |
| Current mission objective | Yes, if it affects progression | objective ID |
| Player position | Only if resume design requires it | bounded world coordinates |
| Current animation frame | No | derived presentation state |
| Particle effects | No | transient |
| Cached textures/audio | No | assets are reloaded |
| Open tooltip/dialog | Normally no | transient UI |
| Debug flags | No | never player save data |

Migration procedure:

1. Keep one validator per schema version.
2. Read the version before applying any data.
3. Reject missing, non-integer, negative or future versions.
4. Migrate sequentially (v1 → v2 → v3); do not skip unknown intermediate versions.
5. Validate after every migration and after the final migration.
6. Do not mutate the original object while migrating.
7. Test valid, invalid, truncated, oversized, unknown-field and future-version payloads.
8. Keep golden fixtures for every supported historical version.

## F. Save scheduling: exact event policy

Call save after every material state transition. Typical events:

- checkpoint reached;
- level/area transition committed;
- collectible/inventory item acquired;
- puzzle solved;
- mission objective completed;
- character rescued or route unlocked;
- run/case completed;
- best score improved;
- user explicitly requests save, if the game offers that control.

Do not save every animation frame, joystick movement, camera rotation or particle update. If position is part of the resume design, throttle it and save only at safe points.

Use an immutable snapshot at the time the milestone occurs. A debounced save must not cause a later UI event to capture an inconsistent partial state.

On pause: stop simulation/input/audio immediately, capture the latest stable state and initiate the save. Do not block the pause callback on long-running gameplay work. Keep the page alive long enough for the SDK promise where the host lifecycle permits it, but treat exit persistence as best effort.

On page unload: do not assume asynchronous work will finish. The primary save strategy is milestone saving plus SDK pause handling, not an unload-only save.

## G. Score integration recipe

Only games with a score mechanic need this integration.

```ts
async function submitFinalScore(platform: GamePlatform, score: number): Promise<void> {
  if (!Number.isSafeInteger(score) || score < 0)
    throw new RangeError("Score must be a non-negative safe integer");
  await platform.submitScore(score);
}
```

Rules:

- Calculate score in game/domain logic, not in the SDK adapter.
- Submit only final/eligible scores.
- Do not submit a fractional value, string, NaN, Infinity or negative score.
- If the game stores a best score, update the save and submit the same best-score value according to the product's scoring rules.
- Handle SDK rejection without crashing or corrupting the game state.
- Test the exact score value received by the mocked SDK and the Google Test Suite.

If the game has no score mechanic, document score integration as not applicable rather than inventing a meaningless score.

## H. Audio integration recipe

At startup:

1. Read the current platform audio-enabled state.
2. Apply it before starting music or sound effects.
3. Subscribe to audio-enabled changes.
4. Route every sound through one audio policy/mixer.
5. On mute, immediately mute/pause all active sources and prevent new audible playback.
6. On unmute, resume only if the game state allows playback and the user has interacted where browser autoplay policy requires it.
7. Unsubscribe and dispose listeners on teardown.

Do not let an in-game volume slider override platform mute. A user-controlled effects/music level may reduce volume further but cannot make audio audible when YouTube has disabled it.

## I. Lifecycle controller recipe

Use one idempotent lifecycle controller. It must tolerate duplicate callbacks without creating duplicate loops.

```ts
class LifecycleController {
  private paused = false;

  constructor(
    private readonly stop: () => void,
    private readonly start: () => void,
    private readonly mute: (enabled: boolean) => void,
    private readonly saveLatest: () => Promise<void>
  ) {}

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.stop();       // stop input, timers, simulation and render loop
    this.mute(true);   // silence all game audio
    void this.saveLatest().catch(reportSaveFailure);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.start();      // start exactly one loop
    // Audio remains governed by the latest platform audio-enabled state.
  }
}
```

Wire these methods to SDK callbacks. The actual `stop()` and `start()` must cover every subsystem, not just requestAnimationFrame. A paused game must not advance timers, AI, physics, score, input or audio. A resume must not reset the world or duplicate event handlers.

## J. Input and viewport implementation recipe

- Use Pointer Events for unified mouse/touch handling where supported.
- Track pointer identity; handle `pointerdown`, `pointermove`, `pointerup`, `pointercancel` and lost capture.
- Do not assume touch and mouse event ordering is identical.
- Prevent default browser gestures only on the actual game-control surface and only when required.
- Keep interactive UI outside the canvas accessible to assistive technology.
- Use CSS safe-area insets and resize observers where needed.
- On resize, update renderer dimensions, camera aspect/projection, UI layout and input coordinate mapping together.
- Treat zero width/height as temporarily unavailable; do not create invalid projection matrices or permanently stop rendering.
- Do not lock orientation. Support portrait and landscape layouts.
- Test multitouch, interrupted gestures, app backgrounding and repeated resize events.

## K. Asset and performance production pipeline

Plan budgets before creating content. Every asset should have an owner, format, dimensions, compressed size and loading phase.

Recommended pipeline:

1. Create an asset manifest with stable IDs and relative paths.
2. Compress textures to an appropriate GPU-friendly format when supported by the target runtime; provide a safe fallback if needed.
3. Resize textures to the minimum dimensions that preserve visual quality on mobile.
4. Compress audio and avoid unnecessarily long uncompressed files.
5. Prefer efficient geometry and instancing for repeated objects.
6. Use level-of-detail or simplified distant geometry where it materially reduces cost.
7. Load the minimum playable scene before `gameReady`; load later scenes after readiness.
8. Dispose resources when scenes are unloaded.
9. Run a production bundle report and inspect the largest files.
10. Profile memory and frame time on a real low/mid-range mobile device.

Maintain two budgets: (a) initial resources required to become interactive and (b) total downloadable game resources. Do not count only JavaScript; include all relevant assets and the way they are fetched/loaded.

## L. CI implementation gate

A pull request or main-branch build must fail when any of these are true:

- TypeScript/compiler errors.
- Unit/integration tests fail.
- Production HTML loads app code before the Playables SDK.
- Required SDK calls are missing or readiness ordering is invalid in tests.
- A cloud-save failure can result in a default save being written.
- Save payload test fixture exceeds the project budget.
- A required asset path is absolute or points outside the bundle.
- Any single file or total bundle violates the applicable platform limit.
- Browser E2E smoke test has uncaught errors or cannot start the game.
- The build cannot be reproduced from the lockfile.

Suggested CI stages:

```text
checkout
  -> install from lockfile
  -> lint / format check
  -> typecheck
  -> unit tests
  -> mocked-SDK integration tests
  -> production build
  -> inspect generated HTML and SDK order
  -> bundle/file-count/asset-size report
  -> browser E2E smoke tests
  -> upload build artifact
  -> deploy exact tested commit
  -> deployment smoke test
```

Never deploy a different commit from the one whose CI evidence is being used for release approval.

## M. Mocked-SDK integration test matrix

Use a fake SDK with controllable promises and callback registration. Minimum cases:

| Scenario | Expected behavior |
|---|---|
| SDK reports Playables | Playables adapter selected |
| SDK absent | browser development adapter selected |
| first frame not rendered | no `firstFrameReady` |
| first frame rendered | exactly one `firstFrameReady` |
| cloud load pending | no `gameReady` |
| cloud load resolves empty | new save, writable |
| cloud load resolves valid payload | restored save, writable |
| cloud load rejects | protected session, no cloud write |
| payload invalid | protected session, no cloud write |
| future schema | protected session, no cloud write |
| save called before load | rejected |
| two saves queued | serialized, newest state retained |
| save promise rejects | error reported; game remains playable |
| pause callback twice | one stop/save sequence |
| resume callback twice | one game loop |
| audio initially disabled | all audio muted before playback |
| audio changes while running | all audio paths update |
| score fractional/negative | rejected before SDK call |
| resize to zero then non-zero | no crash; renderer recovers |

## N. Release acceptance gate — what 99% preparation means

Before a human opens the Google Test Suite, all of the following should already be green:

- [ ] Official requirements checked and date recorded.
- [ ] SDK script ordering verified in built HTML.
- [ ] Bootstrap/readiness sequence unit and integration tested.
- [ ] Cloud save state machine and every failure path tested.
- [ ] Save schema, migration fixtures and size budget tested.
- [ ] Milestone save policy implemented.
- [ ] Score integration tested or marked N/A.
- [ ] Audio mute behavior tested.
- [ ] Pause/resume behavior tested.
- [ ] Touch/mouse parity tested.
- [ ] Responsive viewport and zero-size recovery tested.
- [ ] Build, asset, file-count and memory budgets checked.
- [ ] Privacy, external-call and content preflight completed.
- [ ] Production build and browser E2E passed.
- [ ] Exact tested commit deployed and smoke-tested.
- [ ] Diagnostics available without exposing player data.

The remaining human/platform validation is intentionally narrow:

1. Run the current Google Test Suite against the exact deployed URL.
2. Verify any checks that require the actual YouTube host/account/device.
3. Capture screenshots/results and record the build/commit.
4. Perform real-device preview checks and portal/certification steps when applicable.

This is the intended 99%/1% workflow: **the document and automated engineering gates should remove almost all repeated discovery and implementation work; the final platform run is evidence that the current game, current build and current Google environment behave as expected.** The percentage is a project target, not a guarantee against SDK changes, platform regressions, account restrictions or game-specific defects.


## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-10 | Initial reusable standard based on current official Google Playables documentation and the Hollow Creek integration investigation. |
| 1.1 | 2026-11-10 | Added implementation playbook, typed adapter and bootstrap patterns, persistence coordinator, save/migration policy, lifecycle/audio/input recipes, CI gates, SDK mock matrix and 99% release acceptance gate. |
