export interface InvestigationLocationEvidence {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface InvestigationLocationDefinition {
  readonly id: string;
  readonly title: string;
  readonly requiredLeadId: string;
  readonly evidence: InvestigationLocationEvidence;
  readonly followUpPuzzleId: string;
  readonly followUpPuzzleTitle: string;
}

export type InvestigationLocationStatus = 'locked' | 'unlocked' | 'searched';

export interface InvestigationChainState {
  readonly locationStatus: InvestigationLocationStatus;
  readonly discoveredEvidenceIds: readonly string[];
  readonly unlockedPuzzleIds: readonly string[];
  readonly feedback: string;
}

export interface LocationSearchResult {
  readonly state: InvestigationChainState;
  readonly accepted: boolean;
  readonly discoveredEvidence: boolean;
  readonly unlockedPuzzle: boolean;
}

export function createInvestigationChainState(): InvestigationChainState {
  return {
    locationStatus: 'locked',
    discoveredEvidenceIds: [],
    unlockedPuzzleIds: [],
    feedback: 'No new investigation location is available.'
  };
}

export function unlockInvestigationLocation(
  state: InvestigationChainState,
  trackedLeadIds: readonly string[],
  definition: InvestigationLocationDefinition
): InvestigationChainState {
  if (state.locationStatus !== 'locked' || !trackedLeadIds.includes(definition.requiredLeadId)) return state;
  return {
    ...state,
    locationStatus: 'unlocked',
    feedback: `New location unlocked: ${definition.title}`
  };
}

export function searchInvestigationLocation(
  state: InvestigationChainState,
  locationId: string,
  definition: InvestigationLocationDefinition
): LocationSearchResult {
  if (locationId !== definition.id || state.locationStatus === 'locked') {
    return { state, accepted: false, discoveredEvidence: false, unlockedPuzzle: false };
  }
  if (state.locationStatus === 'searched') {
    return { state, accepted: false, discoveredEvidence: false, unlockedPuzzle: false };
  }
  const next: InvestigationChainState = {
    locationStatus: 'searched',
    discoveredEvidenceIds: state.discoveredEvidenceIds.includes(definition.evidence.id)
      ? state.discoveredEvidenceIds
      : [...state.discoveredEvidenceIds, definition.evidence.id],
    unlockedPuzzleIds: state.unlockedPuzzleIds.includes(definition.followUpPuzzleId)
      ? state.unlockedPuzzleIds
      : [...state.unlockedPuzzleIds, definition.followUpPuzzleId],
    feedback: `Evidence recovered: ${definition.evidence.title}. A new puzzle is now available.`
  };
  return {
    state: next,
    accepted: true,
    discoveredEvidence: !state.discoveredEvidenceIds.includes(definition.evidence.id),
    unlockedPuzzle: !state.unlockedPuzzleIds.includes(definition.followUpPuzzleId)
  };
}
