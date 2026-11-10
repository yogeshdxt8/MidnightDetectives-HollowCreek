export type EntityThreatState = 'patrolling' | 'investigating' | 'approaching' | 'searching' | 'chasing';
export type EscapeHintId = 'find-key' | 'key-location' | 'hide' | 'distract' | 'return-to-exit' | 'unlock-exit' | 'escape';

export interface EscapeEncounterState {
  readonly hasKey: boolean;
  readonly exitUnlocked: boolean;
  readonly escaped: boolean;
  readonly keyFound: boolean;
  readonly showKeyLocationHint: boolean;
  readonly playerNearKey: boolean;
  readonly playerNearExit: boolean;
  readonly playerStalledNearKey: boolean;
  readonly entityThreat: EntityThreatState;
  readonly distractionAvailable: boolean;
}

export interface EscapeHint {
  readonly id: EscapeHintId;
  readonly message: string;
}

export interface EscapeHintContext {
  /** Authored landmark-specific hint. Defaults to the approved prototype wording. */
  readonly keyLocationHint?: string;
}

export const initialEscapeEncounterState: EscapeEncounterState = {
  hasKey: false,
  exitUnlocked: false,
  escaped: false,
  keyFound: false,
  showKeyLocationHint: false,
  playerNearKey: false,
  playerNearExit: false,
  playerStalledNearKey: false,
  entityThreat: 'patrolling',
  distractionAvailable: false,
};

export function collectEscapeKey(state: EscapeEncounterState): EscapeEncounterState {
  if (state.escaped || state.hasKey || !state.playerNearKey) return state;
  return { ...state, hasKey: true, keyFound: true, playerNearKey: false, playerStalledNearKey: false };
}

/** The key is necessary but never sufficient: the player must return and interact with the exit. */
export function unlockEscapeExit(state: EscapeEncounterState): EscapeEncounterState {
  if (state.escaped || state.exitUnlocked || !state.hasKey || !state.playerNearExit) return state;
  return { ...state, exitUnlocked: true };
}

/** The encounter ends only after the unlocked doorway is physically reached/passed. */
export function completeEscape(state: EscapeEncounterState, passedThroughExit: boolean): EscapeEncounterState {
  if (state.escaped || !state.exitUnlocked || !passedThroughExit) return state;
  return { ...state, escaped: true };
}

export function getEscapeHint(
  state: EscapeEncounterState,
  context: EscapeHintContext = {},
): EscapeHint {
  if (state.escaped) return { id: 'escape', message: 'You escaped!' };
  if (state.hasKey && state.playerNearExit && !state.exitUnlocked) {
    return { id: 'unlock-exit', message: 'Unlock exit.' };
  }
  if (state.hasKey) {
    return { id: 'return-to-exit', message: 'The exit is unlocked with the key. Get there!' };
  }
  if (state.entityThreat === 'approaching' || state.entityThreat === 'chasing') {
    return { id: 'hide', message: 'Hide! It is coming this way.' };
  }
  if (state.playerStalledNearKey && state.distractionAvailable) {
    return { id: 'distract', message: 'Make a noise to draw it away.' };
  }
  if (!state.keyFound && state.showKeyLocationHint) {
    return {
      id: 'key-location',
      message: context.keyLocationHint ?? 'Look near the overturned cabinet.',
    };
  }
  return { id: 'find-key', message: 'Find the key. The exit is locked.' };
}
