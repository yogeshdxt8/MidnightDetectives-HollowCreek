import { describe, expect, it } from 'vitest';
import {
  collectEscapeKey,
  completeEscape,
  getEscapeHint,
  initialEscapeEncounterState,
  unlockEscapeExit,
  type EscapeEncounterState,
} from '../src/domain/escape-encounter';

const nearKey: EscapeEncounterState = { ...initialEscapeEncounterState, playerNearKey: true };
const nearExitWithKey: EscapeEncounterState = { ...initialEscapeEncounterState, hasKey: true, keyFound: true, playerNearExit: true };

describe('mandatory key-return-exit flow', () => {
  it('does not collect the key until the player reaches it', () => {
    expect(collectEscapeKey(initialEscapeEncounterState)).toBe(initialEscapeEncounterState);
    expect(collectEscapeKey(nearKey).hasKey).toBe(true);
  });

  it('does not unlock the exit merely because the key was collected', () => {
    const carryingKey = collectEscapeKey(nearKey);
    expect(unlockEscapeExit(carryingKey)).toBe(carryingKey);
    expect(carryingKey.exitUnlocked).toBe(false);
  });

  it('requires the player to return to the exit and interact', () => {
    expect(unlockEscapeExit(nearExitWithKey).exitUnlocked).toBe(true);
    expect(unlockEscapeExit({ ...nearExitWithKey, hasKey: false })).toMatchObject({ exitUnlocked: false });
  });

  it('does not complete the encounter before passing through the unlocked exit', () => {
    const unlocked = unlockEscapeExit(nearExitWithKey);
    expect(completeEscape(unlocked, false)).toBe(unlocked);
    expect(completeEscape(unlocked, true).escaped).toBe(true);
  });
});

describe('contextual hint selection', () => {
  it('shows the exact opening objective immediately', () => {
    expect(getEscapeHint(initialEscapeEncounterState)).toEqual({
      id: 'find-key',
      message: 'Find the key. The exit is locked.',
    });
  });

  it('escalates to the key landmark hint only after no progress', () => {
    expect(getEscapeHint({ ...initialEscapeEncounterState, showKeyLocationHint: true })).toEqual({
      id: 'key-location',
      message: 'Look near the overturned cabinet.',
    });
  });

  it('supports a level-authored landmark instead of a misleading hard-coded cabinet', () => {
    expect(getEscapeHint({ ...initialEscapeEncounterState, showKeyLocationHint: true }, { keyLocationHint: 'Look inside the broken desk.' }).message)
      .toBe('Look inside the broken desk.');
  });

  it('warns when the creature is actually approaching', () => {
    expect(getEscapeHint({ ...initialEscapeEncounterState, entityThreat: 'approaching' }).message)
      .toBe('Hide! It is coming this way.');
  });

  it('suggests distraction only when the player is stuck and a distraction exists', () => {
    const stuck = { ...initialEscapeEncounterState, keyFound: true, playerStalledNearKey: true, distractionAvailable: true };
    expect(getEscapeHint(stuck).message).toBe('Make a noise to draw it away.');
    expect(getEscapeHint({ ...stuck, distractionAvailable: false }).id).not.toBe('distract');
  });

  it('guides the player back to the exit after key pickup', () => {
    expect(getEscapeHint({ ...initialEscapeEncounterState, hasKey: true }).message)
      .toBe('The exit is unlocked with the key. Get there!');
  });

  it('guides the player through the door after unlocking it', () => {
    expect(getEscapeHint({ ...nearExitWithKey, exitUnlocked: true }).message).toBe('The door is open. Escape!');
  });

  it('shows the unlock prompt only when the player has the key and is at the exit', () => {
    expect(getEscapeHint(nearExitWithKey)).toEqual({ id: 'unlock-exit', message: 'Unlock exit.' });
  });
});
