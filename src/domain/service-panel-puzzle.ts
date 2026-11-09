export type ServicePanelPuzzleStatus = 'locked' | 'active' | 'solved' | 'failed';

export interface ServicePanelPuzzleDefinition {
  readonly id: string;
  readonly title: string;
  readonly sequence: readonly string[];
  readonly requiredEvidenceId: string;
  readonly maxMistakes: number;
}

export interface ServicePanelPuzzleState {
  readonly status: ServicePanelPuzzleStatus;
  readonly progress: number;
  readonly mistakes: number;
  readonly feedback: string;
}

export interface ServicePanelPuzzleResult {
  readonly state: ServicePanelPuzzleState;
  readonly accepted: boolean;
  readonly completed: boolean;
}

export function createServicePanelPuzzleState(
  definition: ServicePanelPuzzleDefinition,
  discoveredEvidenceIds: readonly string[] = []
): ServicePanelPuzzleState {
  const unlocked = discoveredEvidenceIds.includes(definition.requiredEvidenceId);
  return {
    status: unlocked ? 'active' : 'locked',
    progress: 0,
    mistakes: 0,
    feedback: unlocked
      ? 'The panel is ready. Match the symbols in the order suggested by the imprint.'
      : 'The panel is locked. Find the matching three-line imprint first.'
  };
}

export function interactWithServicePanel(
  state: ServicePanelPuzzleState,
  definition: ServicePanelPuzzleDefinition,
  symbol: string,
  discoveredEvidenceIds: readonly string[]
): ServicePanelPuzzleResult {
  if (state.status !== 'active') {
    return { state, accepted: false, completed: false };
  }
  if (!discoveredEvidenceIds.includes(definition.requiredEvidenceId)) {
    return {
      state: { ...state, status: 'locked', feedback: 'The matching evidence is required.' },
      accepted: false,
      completed: false
    };
  }
  if (!definition.sequence.length || definition.maxMistakes < 1) {
    return { state: { ...state, feedback: 'This mechanism is not configured correctly.' }, accepted: false, completed: false };
  }
  const expected = definition.sequence[state.progress];
  if (symbol !== expected) {
    const mistakes = state.mistakes + 1;
    const failed = mistakes >= definition.maxMistakes;
    const next: ServicePanelPuzzleState = {
      ...state,
      status: failed ? 'failed' : 'active',
      mistakes,
      feedback: failed
        ? 'The panel locks itself after too many incorrect inputs. Reset the mechanism to try again.'
        : 'That symbol does not fit. Study the mark and try another sequence.'
    };
    return { state: next, accepted: true, completed: false };
  }
  const progress = state.progress + 1;
  const completed = progress === definition.sequence.length;
  return {
    state: {
      ...state,
      status: completed ? 'solved' : 'active',
      progress,
      feedback: completed
        ? 'The service panel clicks open. A concealed message is revealed.'
        : 'The symbol settles into place. Continue the sequence.'
    },
    accepted: true,
    completed
  };
}

export function resetServicePanelPuzzle(
  state: ServicePanelPuzzleState,
  definition: ServicePanelPuzzleDefinition,
  discoveredEvidenceIds: readonly string[]
): ServicePanelPuzzleState {
  return createServicePanelPuzzleState(definition, discoveredEvidenceIds);
}
