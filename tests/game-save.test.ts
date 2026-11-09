import { describe, expect, it } from 'vitest';
import { createNewGameSave, parseGameSave, serializeGameSave } from '../src/domain/game-save';

describe('versioned game save', () => {
  it('creates a clean first-run save', () => {
    expect(createNewGameSave()).toEqual({
      version: 1,
      activeCaseId: 'case-001',
      discoveredClueIds: [],
      solvedPuzzleIds: [],
      completedCaseIds: []
    });
  });

  it('round-trips progress without losing ids', () => {
    const save = {
      ...createNewGameSave(),
      discoveredClueIds: ['note', 'key'],
      solvedPuzzleIds: ['fountain-seal']
    };
    expect(parseGameSave(serializeGameSave(save))).toEqual(save);
  });

  it('removes duplicate ids from imported data', () => {
    const imported = JSON.stringify({
      version: 1,
      activeCaseId: 'case-001',
      discoveredClueIds: ['note', 'note'],
      solvedPuzzleIds: [],
      completedCaseIds: []
    });
    expect(parseGameSave(imported).discoveredClueIds).toEqual(['note']);
  });

  it('rejects unknown versions rather than overwriting old progress', () => {
    expect(() => parseGameSave(JSON.stringify({
      version: 99,
      activeCaseId: 'case-001',
      discoveredClueIds: [],
      solvedPuzzleIds: [],
      completedCaseIds: []
    }))).toThrow('Unsupported game save version');
  });

  it('rejects malformed save shapes', () => {
    expect(() => parseGameSave('{"version":1}')).toThrow('invalid shape');
    expect(() => parseGameSave('not-json')).toThrow();
  });
});
