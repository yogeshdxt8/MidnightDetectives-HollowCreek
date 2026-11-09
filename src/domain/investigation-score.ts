import type { GameSaveData } from './game-save';

/**
 * One stable score dimension: persistent investigation progress.
 * Values are derived only from cloud-save data so YouTube's best score
 * can never exceed the best score represented by the player's save.
 */
export function calculateInvestigationScore(save: GameSaveData): number {
  const clues = new Set(save.discoveredClueIds).size;
  const puzzles = new Set([...save.solvedPuzzleIds, ...save.investigation.solvedPuzzleIds]).size;
  const recovered = new Set(save.investigation.recoveredObjectIds).size;
  const deductions = new Set(save.investigation.completedDeductionIds).size;
  return clues * 100 + puzzles * 250 + recovered * 300 + deductions * 500;
}
