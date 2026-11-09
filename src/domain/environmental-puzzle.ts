export type PuzzleStatus = 'locked' | 'active' | 'solved' | 'failed';

export interface EnvironmentalPuzzleDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly sequence: readonly string[];
  readonly requiredClueIds?: readonly string[];
  readonly maxMistakes: number;
  readonly successFeedback: string;
}

export interface EnvironmentalPuzzleState {
  readonly status: PuzzleStatus;
  readonly progress: number;
  readonly mistakes: number;
  readonly feedback: string;
}

export interface PuzzleInteractionResult {
  readonly state: EnvironmentalPuzzleState;
  readonly accepted: boolean;
  readonly completed: boolean;
}

export function createPuzzleState(
  definition: EnvironmentalPuzzleDefinition,
  discoveredClueIds: readonly string[] = []
): EnvironmentalPuzzleState {
  const unlocked = (definition.requiredClueIds ?? []).every(id => discoveredClueIds.includes(id));
  return {
    status: unlocked ? 'active' : 'locked',
    progress: 0,
    mistakes: 0,
    feedback: unlocked ? 'Inspect the mechanism and enter the sequence.' : 'Find the required evidence before using this mechanism.'
  };
}

export function interactWithPuzzle(
  state: EnvironmentalPuzzleState,
  definition: EnvironmentalPuzzleDefinition,
  interactionId: string,
  discoveredClueIds: readonly string[] = []
): PuzzleInteractionResult {
  if (state.status === 'solved') {
    return { state, accepted: false, completed: true };
  }

  if (state.status === 'failed') {
    return { state: { ...state, feedback: 'The mechanism is jammed. Reset it to try again.' }, accepted: false, completed: false };
  }

  const unlocked = (definition.requiredClueIds ?? []).every(id => discoveredClueIds.includes(id));
  if (!unlocked) {
    return {
      state: { ...state, status: 'locked', feedback: 'The mechanism is locked. Search for the missing evidence.' },
      accepted: false,
      completed: false
    };
  }

  const expected = definition.sequence[state.progress];
  if (interactionId !== expected) {
    const mistakes = state.mistakes + 1;
    const failed = mistakes >= definition.maxMistakes;
    return {
      state: {
        status: failed ? 'failed' : 'active',
        progress: 0,
        mistakes,
        feedback: failed
          ? 'The mechanism locks with a heavy click. Reset it to try again.'
          : 'That symbol does not fit. The sequence has reset; examine the clues and try again.'
      },
      accepted: false,
      completed: false
    };
  }

  const progress = state.progress + 1;
  const completed = progress === definition.sequence.length;
  return {
    state: {
      status: completed ? 'solved' : 'active',
      progress,
      mistakes: state.mistakes,
      feedback: completed
        ? definition.successFeedback
        : `Correct. ${progress} of ${definition.sequence.length} symbols aligned.`
    },
    accepted: true,
    completed
  };
}

export function resetPuzzle(state: EnvironmentalPuzzleState): EnvironmentalPuzzleState {
  if (state.status === 'locked' || state.status === 'solved') return state;
  return {
    status: 'active',
    progress: 0,
    mistakes: 0,
    feedback: 'Mechanism reset. Study the clues and try again.'
  };
}
