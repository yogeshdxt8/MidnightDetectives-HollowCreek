export type RelicStatus = 'locked' | 'available' | 'collected';

export interface EnvironmentalRelicDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredPuzzleId: string;
}

export interface EnvironmentalRelicState {
  readonly status: RelicStatus;
  readonly feedback: string;
}

export interface RelicInteractionResult {
  readonly state: EnvironmentalRelicState;
  readonly accepted: boolean;
  readonly collected: boolean;
}

export function createRelicState(
  definition: EnvironmentalRelicDefinition,
  solvedPuzzleIds: readonly string[] = []
): EnvironmentalRelicState {
  const unlocked = solvedPuzzleIds.includes(definition.requiredPuzzleId);
  return {
    status: unlocked ? 'available' : 'locked',
    feedback: unlocked
      ? 'The relic is exposed. Move closer to collect it.'
      : 'The relic is concealed until its mechanism is solved.'
  };
}

export function updateRelicAvailability(
  state: EnvironmentalRelicState,
  definition: EnvironmentalRelicDefinition,
  solvedPuzzleIds: readonly string[]
): EnvironmentalRelicState {
  if (state.status === 'collected') return state;
  if (!solvedPuzzleIds.includes(definition.requiredPuzzleId)) return state;
  if (state.status === 'available') return state;
  return { status: 'available', feedback: 'The relic is exposed. Move closer to collect it.' };
}

export function collectRelic(
  state: EnvironmentalRelicState,
  definition: EnvironmentalRelicDefinition,
  distance: number,
  interactionRange: number
): RelicInteractionResult {
  if (state.status === 'collected') {
    return { state, accepted: false, collected: false };
  }
  if (state.status === 'locked') {
    return {
      state: { ...state, feedback: 'The relic is still concealed. Solve the environmental mechanism first.' },
      accepted: false,
      collected: false
    };
  }
  if (!Number.isFinite(distance) || !Number.isFinite(interactionRange) ||
      distance < 0 || interactionRange < 0 || distance > interactionRange) {
    return {
      state: { ...state, feedback: 'Move closer to the relic to collect it.' },
      accepted: false,
      collected: false
    };
  }
  return {
    state: { status: 'collected', feedback: `${definition.name} added to your inventory.` },
    accepted: true,
    collected: true
  };
}
