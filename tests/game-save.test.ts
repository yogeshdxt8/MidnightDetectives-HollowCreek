import { describe, expect, it } from 'vitest';
import { createNewGameSave, parseGameSave, serializeGameSave } from '../src/domain/game-save';

describe('versioned game save', () => {
  it('creates a clean first-run save', () => {
    expect(createNewGameSave()).toEqual({
      version: 2,
      activeCaseId: 'case-001',
      discoveredClueIds: [],
      solvedPuzzleIds: [],
      completedCaseIds: [],
      investigation: { discoveredEvidenceIds: [], trackedLeadIds: [], unlockedLocationIds: [], searchedLocationIds: [], solvedPuzzleIds: [], askedKeeperTopicIds: [], presentedKeeperEvidenceIds: [], recoveredObjectIds: [], completedDeductionIds: [] }
    });
  });

  it('round-trips progress without losing ids', () => {
    const save = {
      ...createNewGameSave(),
      discoveredClueIds: ['note', 'key'],
      solvedPuzzleIds: ['fountain-seal'],
      investigation: { ...createNewGameSave().investigation, discoveredEvidenceIds: ['three-line-imprint','keeper-message'], trackedLeadIds: ['clocktower-service-door'], unlockedLocationIds: ['clocktower-service-entrance'], solvedPuzzleIds: ['service-panel-sequence'] }
    };
    expect(parseGameSave(serializeGameSave(save))).toEqual(save);
  });

  it('removes duplicate ids from imported data', () => {
    const imported = JSON.stringify({
      version: 2,
      activeCaseId: 'case-001',
      discoveredClueIds: ['note', 'note'],
      solvedPuzzleIds: [],
      completedCaseIds: [],
      investigation: createNewGameSave().investigation
    });
    expect(parseGameSave(imported).discoveredClueIds).toEqual(['note']);
  });

  it('migrates version one saves while preserving existing progress', () => {
    const legacy = JSON.stringify({ version: 1, activeCaseId: 'case-001', discoveredClueIds: ['note'], solvedPuzzleIds: ['fountain-seal'], completedCaseIds: [] });
    const migrated = parseGameSave(legacy);
    expect(migrated.version).toBe(2);
    expect(migrated.discoveredClueIds).toEqual(['note']);
    expect(migrated.solvedPuzzleIds).toEqual(['fountain-seal']);
    expect(migrated.investigation.trackedLeadIds).toEqual([]);
  });

  it('rejects unknown versions rather than overwriting old progress', () => {
    expect(() => parseGameSave(JSON.stringify({
      version: 99,
      activeCaseId: 'case-001',
      discoveredClueIds: [],
      solvedPuzzleIds: [],
      completedCaseIds: [], investigation: createNewGameSave().investigation
    }))).toThrow('Unsupported game save version');
  });

  it('rejects malformed save shapes', () => {
    expect(() => parseGameSave('{"version":2}')).toThrow('invalid shape');
    expect(() => parseGameSave('not-json')).toThrow();
  });
});


describe('investigation progress persistence', () => {
  it('round-trips evidence, tracked leads, unlocked locations and puzzle progress', () => {
    const base = createNewGameSave();
    const save = { ...base, investigation: { ...base.investigation, discoveredEvidenceIds: ['three-line-imprint','keeper-message'], trackedLeadIds: ['clocktower-service-door'], unlockedLocationIds: ['clocktower-service-entrance'], searchedLocationIds: ['clocktower-service-entrance'], solvedPuzzleIds: ['service-panel-sequence'], askedKeeperTopicIds: ['clock','missing-object'], presentedKeeperEvidenceIds: ['keeper-message'], recoveredObjectIds: ['brass-regulator'], completedDeductionIds: ['yard-deduction'] } };
    expect(parseGameSave(serializeGameSave(save))).toEqual(save);
  });
  it('deduplicates every investigation collection', () => {
    const base = createNewGameSave();
    const save = { ...base, investigation: { ...base.investigation, discoveredEvidenceIds: ['note','note'], trackedLeadIds: ['lead','lead'] } };
    const parsed = parseGameSave(serializeGameSave(save));
    expect(parsed.investigation.discoveredEvidenceIds).toEqual(['note']);
    expect(parsed.investigation.trackedLeadIds).toEqual(['lead']);
  });
});
