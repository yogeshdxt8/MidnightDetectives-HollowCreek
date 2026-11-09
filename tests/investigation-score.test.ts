import { describe, expect, it } from 'vitest';
import { createNewGameSave } from '../src/domain/game-save';
import { calculateInvestigationScore } from '../src/domain/investigation-score';

describe('persistent investigation score', () => {
  it('scores one stable dimension from unique saved progress', () => {
    const base = createNewGameSave();
    const save = {
      ...base,
      discoveredClueIds: ['note', 'print', 'note'],
      solvedPuzzleIds: ['fountain-seal'],
      investigation: {
        ...base.investigation,
        solvedPuzzleIds: ['service-panel-sequence'],
        recoveredObjectIds: ['fountain-relic'],
        completedDeductionIds: ['town-square-deduction']
      }
    };
    expect(calculateInvestigationScore(save)).toBe(3 * 100 + 2 * 250 + 300 + 500);
  });

  it('returns zero for a new save and never produces fractional scores', () => {
    expect(calculateInvestigationScore(createNewGameSave())).toBe(0);
    expect(Number.isSafeInteger(calculateInvestigationScore(createNewGameSave()))).toBe(true);
  });
});
