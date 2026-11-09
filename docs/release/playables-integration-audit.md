# YouTube Playables Integration Audit

**Status:** Engineering hardening in progress; external certification validation not complete  
**Last reviewed:** 2026-11-10  
**Target:** YouTube Playables SDK  
**Authoritative reference:** [Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)

This document tracks the repository implementation separately from validation that must be performed in Google's hosted Test Suite and on real devices. A passing CI run is not YouTube certification.

## 1. SDK loading

**Requirement:** Load the Playables SDK before any game code.

- [x] SDK script is loaded in `index.html` before the TypeScript module entry point.
- [ ] Verify in the hosted Playables Test Suite that the SDK is available before game initialization.
- [ ] Verify behavior in the actual YouTube Playables container.

## 2. Loading screen and readiness

**Requirements:** Call `firstFrameReady()` while an explicit loading/splash screen is being rendered. Call `gameReady()` only after the game is interactive and no loading screen remains.

- [x] Added a dedicated accessible loading screen.
- [x] First rendered frame triggers `firstFrameReady()`.
- [x] Loading screen remains until first-frame readiness and persistence initialization have both completed.
- [x] Loading screen is hidden before interaction is enabled and `gameReady()` is called.
- [x] Platform adapter enforces first-frame notification before game-ready notification and prevents duplicate notifications.
- [x] Added browser E2E assertion that the loading screen is hidden once the game interface is ready.
- [ ] Confirm readiness behavior in Google's hosted Test Suite.

## 3. User scores

**Requirements:** If `sendScore()` is used, it must represent one consistent progress dimension, be an integer within the safe-integer range, and the best score sent must match the best score represented by the game save.

- [x] Score is derived from unique, persisted investigation progress.
- [x] Score validation rejects negative, fractional, and unsafe integer values.
- [x] Score submission occurs after a successful progress save.
- [x] Restored progress score is submitted on startup.
- [x] Failed initial score submission remains eligible for retry on a later save.
- [x] Score submission is skipped while paused.
- [ ] Verify score shown by YouTube matches the restored and newly earned saved progress in the hosted Test Suite.

## 4. Cloud saves

**Requirements:** Use Playables `loadData()` and `saveData()` for progress in the Playables environment; await a successful load before saving; preserve progress across versions; save at material milestones; payload must be well-formed UTF-16 and no larger than 3 MiB.

- [x] Playables environment uses SDK cloud save APIs.
- [x] Browser `localStorage` fallback is restricted to non-Playables preview.
- [x] Saving is blocked until cloud loading succeeds.
- [x] Failed or malformed cloud loads never overwrite the existing cloud payload.
- [x] Version 1 save data migrates to version 2 while preserving known progress.
- [x] Unknown versions and malformed shapes are rejected safely.
- [x] UTF-16 well-formedness is validated.
- [x] 3 MiB hard limit and 500 KiB recommended target are encoded.
- [x] Progress saves are scheduled after user interactions; a best-effort save is requested on pause.
- [ ] Test actual cloud save, close/reopen restoration, and cross-version migration in the hosted Test Suite.
- [ ] Verify material milestone saves and final pause/exit flush behavior in the hosted environment.

## 5. Audio and mute

**Requirements:** Respect YouTube audio state and changes, device volume, and avoid unexpected audio. Do not add an overall in-game mute control that duplicates YouTube's control.

- [x] Initial audio state comes from `isAudioEnabled()`.
- [x] Audio state changes are handled through `onAudioEnabledChange()`.
- [x] No duplicate overall in-game mute toggle is present.
- [x] Audio output uses Web Audio and therefore follows device/browser output volume.
- [x] Audio is suspended while muted or paused.
- [x] Audio cues are best-effort and cannot break gameplay if audio is unavailable.
- [x] Added unit coverage for muted and paused audio.
- [ ] Test YouTube mute on/off, device volume zero/restore, and rapid mute changes in the actual YouTube container.

## 6. Pause and resume

**Requirements:** Pause all game execution after `onPause()`; resume only after `onResume()`. Do not use Page Visibility API or similar browser lifecycle APIs as a substitute.

- [x] Pause/resume are registered through Playables SDK callbacks.
- [x] Pause stops the animation loop and game clock.
- [x] Pause blocks interactions and resets active joystick input.
- [x] Pause suspends audio and clears deferred save/toast timers.
- [x] Pause requests a best-effort progress save.
- [x] Deferred score submission is suppressed while paused.
- [x] Resume restarts the clock, audio, and render loop only from the SDK callback.
- [x] Readiness state is preserved if pause/resume happens during startup.
- [x] No Page Visibility API listener is used for gameplay lifecycle.
- [ ] Test repeated pause/resume, pause during loading, pause during save, app background/foreground, and exit-without-resume in YouTube Android/iOS/web containers.

## 7. Automated repository validation

- [x] Existing unit tests cover SDK adapter, cloud persistence, save schema/migration, score calculation, and progress projection.
- [x] Added audio lifecycle unit tests.
- [x] Added readiness ordering and duplicate notification tests.
- [x] Added E2E assertion for loading screen removal.
- [ ] Latest GitHub Actions CI for the complete hardening set must finish successfully.
- [ ] Latest GitHub Pages deployment must finish successfully.

## 8. External release validation — required before claiming integration complete

These actions require the developer's Google Playables access and/or a real device. They cannot be certified by repository CI alone.

- [ ] Open the game in Google's hosted [Playables Test Suite](https://developers.google.com/youtube/gaming/playables/test_suite).
- [ ] Complete all SDK integration checks and record results.
- [ ] Test cloud save persistence by making progress, leaving the game, reopening it, and confirming restoration.
- [ ] Test audio mute/unmute and device volume.
- [ ] Test pause/resume and exit behavior.
- [ ] Test representative Android device(s), iOS device(s), and desktop browsers supported by YouTube.
- [ ] Test responsive layouts and all required aspect ratios.
- [ ] Record device/browser, test date, build commit, and result for every manual test.
- [ ] Resolve all failures and rerun the complete suite.

## 9. Completion gate

The Playables integration may be marked **engineering complete** only when the latest CI and deployment pass and all repository-level checks above are green.

It may be marked **Playables integration validated** only after the hosted Google Test Suite passes and required real-device checks are recorded.

It may be described as **certified/published** only after Google completes its own review and confirms that status. Do not infer certification from CI or the hosted test suite alone.
