import type { GameSaveData, InvestigationProgressSave } from './game-save';

export interface InvestigationRuntimeSnapshot {
  readonly discoveredClueIds: readonly string[];
  readonly solvedPuzzleIds: readonly string[];
  readonly discoveredEvidenceIds: readonly string[];
  readonly trackedLeadIds: readonly string[];
  readonly unlockedLocationIds: readonly string[];
  readonly searchedLocationIds: readonly string[];
  readonly askedKeeperTopicIds: readonly string[];
  readonly presentedKeeperEvidenceIds: readonly string[];
  readonly recoveredObjectIds: readonly string[];
  readonly completedDeductionIds: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Projects authoritative runtime state into the versioned save contract.
 * The runtime supplies stable domain IDs, never renderer objects or UI state.
 */
export function captureInvestigationSave(
  current: GameSaveData,
  snapshot: InvestigationRuntimeSnapshot
): GameSaveData {
  const investigation: InvestigationProgressSave = {
    discoveredEvidenceIds: unique(snapshot.discoveredEvidenceIds),
    trackedLeadIds: unique(snapshot.trackedLeadIds),
    unlockedLocationIds: unique(snapshot.unlockedLocationIds),
    searchedLocationIds: unique(snapshot.searchedLocationIds),
    solvedPuzzleIds: unique(snapshot.solvedPuzzleIds),
    askedKeeperTopicIds: unique(snapshot.askedKeeperTopicIds),
    presentedKeeperEvidenceIds: unique(snapshot.presentedKeeperEvidenceIds),
    recoveredObjectIds: unique(snapshot.recoveredObjectIds),
    completedDeductionIds: unique(snapshot.completedDeductionIds)
  };

  return {
    ...current,
    discoveredClueIds: unique(snapshot.discoveredClueIds),
    solvedPuzzleIds: unique(snapshot.solvedPuzzleIds),
    investigation
  };
}
