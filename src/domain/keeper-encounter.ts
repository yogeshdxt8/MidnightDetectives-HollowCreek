export type KeeperTopic = 'clock' | 'maintenance' | 'missing-object';
export type KeeperEncounterStatus = 'unavailable' | 'available' | 'informed';

export interface KeeperDialogueOption {
  readonly id: KeeperTopic;
  readonly label: string;
  readonly response: string;
}

export interface KeeperEncounterDefinition {
  readonly id: string;
  readonly name: string;
  readonly requiredEvidenceIds: readonly string[];
  readonly topics: readonly KeeperDialogueOption[];
  readonly presentedEvidenceId: string;
  readonly evidenceResponse: string;
  readonly followUpLeadId: string;
  readonly followUpLeadTitle: string;
}

export interface KeeperEncounterState {
  readonly status: KeeperEncounterStatus;
  readonly askedTopicIds: readonly KeeperTopic[];
  readonly presentedEvidenceIds: readonly string[];
  readonly leadUnlocked: boolean;
  readonly feedback: string;
}

export interface KeeperInteractionResult {
  readonly state: KeeperEncounterState;
  readonly accepted: boolean;
  readonly unlockedLead: boolean;
}

export function createKeeperEncounterState(): KeeperEncounterState {
  return { status: 'unavailable', askedTopicIds: [], presentedEvidenceIds: [], leadUnlocked: false, feedback: 'The keeper is not ready to speak.' };
}

export function unlockKeeperEncounter(state: KeeperEncounterState): KeeperEncounterState {
  if (state.status !== 'unavailable') return state;
  return { ...state, status: 'available', feedback: 'The keeper is ready to speak.' };
}

export function askKeeperAbout(
  state: KeeperEncounterState,
  definition: KeeperEncounterDefinition,
  topic: KeeperTopic
): KeeperInteractionResult {
  if (state.status === 'unavailable' || state.askedTopicIds.includes(topic)) {
    return { state, accepted: false, unlockedLead: false };
  }
  const option = definition.topics.find(item => item.id === topic);
  if (!option) return { state, accepted: false, unlockedLead: false };
  const next = { ...state, askedTopicIds: [...state.askedTopicIds, topic], feedback: option.response };
  return { state: next, accepted: true, unlockedLead: false };
}

export function presentEvidenceToKeeper(
  state: KeeperEncounterState,
  definition: KeeperEncounterDefinition,
  evidenceId: string,
  discoveredEvidenceIds: readonly string[]
): KeeperInteractionResult {
  if (state.status === 'unavailable' || !definition.requiredEvidenceIds.every(id => discoveredEvidenceIds.includes(id))) {
    return { state, accepted: false, unlockedLead: false };
  }
  if (evidenceId !== definition.presentedEvidenceId || state.presentedEvidenceIds.includes(evidenceId)) {
    return { state, accepted: false, unlockedLead: false };
  }
  const next: KeeperEncounterState = {
    ...state,
    status: 'informed',
    presentedEvidenceIds: [...state.presentedEvidenceIds, evidenceId],
    leadUnlocked: true,
    feedback: definition.evidenceResponse
  };
  return { state: next, accepted: true, unlockedLead: true };
}
