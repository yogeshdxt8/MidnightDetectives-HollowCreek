import { describe, expect, it } from 'vitest';
import { createNewGameSave } from '../src/domain/game-save';
import { captureInvestigationSave } from '../src/domain/investigation-save-projection';

describe('investigation save projection', () => {
  it('captures stable progress IDs while preserving unrelated save metadata', () => {
    const current = { ...createNewGameSave(), completedCaseIds: ['case-prologue'] };
    const projected = captureInvestigationSave(current, {
      discoveredClueIds: ['note', 'key', 'note'],
      solvedPuzzleIds: ['fountain-seal'],
      discoveredEvidenceIds: ['three-line-imprint', 'keeper-message'],
      trackedLeadIds: ['clocktower-service-door'],
      unlockedLocationIds: ['clocktower-service-entrance'],
      searchedLocationIds: [],
      askedKeeperTopicIds: ['clock', 'maintenance'],
      presentedKeeperEvidenceIds: [],
      recoveredObjectIds: ['fountain-relic'],
      completedDeductionIds: []
    });

    expect(projected.completedCaseIds).toEqual(['case-prologue']);
    expect(projected.discoveredClueIds).toEqual(['note', 'key']);
    expect(projected.solvedPuzzleIds).toEqual(['fountain-seal']);
    expect(projected.investigation.discoveredEvidenceIds).toEqual(['three-line-imprint', 'keeper-message']);
    expect(projected.investigation.trackedLeadIds).toEqual(['clocktower-service-door']);
    expect(projected.investigation.unlockedLocationIds).toEqual(['clocktower-service-entrance']);
    expect(projected.investigation.recoveredObjectIds).toEqual(['fountain-relic']);
  });

  it('does not mutate the existing save or runtime arrays', () => {
    const current = createNewGameSave();
    const clues = ['note'];
    const snapshot = {
      discoveredClueIds: clues, solvedPuzzleIds: [], discoveredEvidenceIds: [],
      trackedLeadIds: [], unlockedLocationIds: [], searchedLocationIds: [],
      askedKeeperTopicIds: [], presentedKeeperEvidenceIds: [], recoveredObjectIds: [],
      completedDeductionIds: []
    };
    const projected = captureInvestigationSave(current, snapshot);
    expect(current.discoveredClueIds).toEqual([]);
    expect(clues).toEqual(['note']);
    expect(projected.discoveredClueIds).not.toBe(clues);
  });
});
