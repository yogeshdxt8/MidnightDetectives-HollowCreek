import { describe, expect, it } from 'vitest';
import {
  createPuzzleState,
  interactWithPuzzle,
  resetPuzzle,
  type EnvironmentalPuzzleDefinition
} from '../src/domain/environmental-puzzle';

const puzzle: EnvironmentalPuzzleDefinition = {
  id: 'fountain-sequence',
  title: 'Fountain seal',
  description: 'Align the three symbols in the order suggested by the inscription.',
  sequence: ['moon', 'star', 'bell'],
  requiredClueIds: ['inscription'],
  maxMistakes: 3,
  successFeedback: 'The fountain seal releases and a hidden compartment opens.'
};

describe('environmental puzzle state engine', () => {
  it('starts locked until required evidence is discovered', () => {
    const state = createPuzzleState(puzzle);
    expect(state.status).toBe('locked');
    const blocked = interactWithPuzzle(state, puzzle, 'moon');
    expect(blocked.accepted).toBe(false);
    expect(blocked.state.status).toBe('locked');
    expect(blocked.state.progress).toBe(0);
  });

  it('unlocks when all required evidence is present', () => {
    expect(createPuzzleState(puzzle, ['inscription']).status).toBe('active');
  });

  it('advances only when the expected interaction is performed', () => {
    const start = createPuzzleState(puzzle, ['inscription']);
    const first = interactWithPuzzle(start, puzzle, 'moon', ['inscription']);
    expect(first.accepted).toBe(true);
    expect(first.state.progress).toBe(1);
    const second = interactWithPuzzle(first.state, puzzle, 'star', ['inscription']);
    expect(second.state.progress).toBe(2);
    expect(second.state.status).toBe('active');
  });

  it('resets sequence progress after a wrong interaction and gives feedback', () => {
    const start = createPuzzleState(puzzle, ['inscription']);
    const first = interactWithPuzzle(start, puzzle, 'moon', ['inscription']);
    const wrong = interactWithPuzzle(first.state, puzzle, 'bell', ['inscription']);
    expect(wrong.accepted).toBe(false);
    expect(wrong.state.progress).toBe(0);
    expect(wrong.state.mistakes).toBe(1);
    expect(wrong.state.feedback).toContain('sequence has reset');
  });

  it('fails after the configured number of mistakes', () => {
    let state = createPuzzleState(puzzle, ['inscription']);
    for (let attempt = 0; attempt < puzzle.maxMistakes; attempt++) {
      state = interactWithPuzzle(state, puzzle, 'bell', ['inscription']).state;
    }
    expect(state.status).toBe('failed');
    expect(state.mistakes).toBe(3);
    expect(interactWithPuzzle(state, puzzle, 'moon', ['inscription']).accepted).toBe(false);
  });

  it('solves once the full sequence is entered and prevents further changes', () => {
    let state = createPuzzleState(puzzle, ['inscription']);
    for (const symbol of puzzle.sequence) {
      state = interactWithPuzzle(state, puzzle, symbol, ['inscription']).state;
    }
    expect(state.status).toBe('solved');
    expect(state.progress).toBe(3);
    expect(state.feedback).toBe(puzzle.successFeedback);
    expect(interactWithPuzzle(state, puzzle, 'moon', ['inscription']).state).toBe(state);
  });

  it('resets a failed or active puzzle for a fresh attempt', () => {
    const start = createPuzzleState(puzzle, ['inscription']);
    const failed = interactWithPuzzle(start, puzzle, 'wrong', ['inscription']);
    const reset = resetPuzzle(failed.state);
    expect(reset.status).toBe('active');
    expect(reset.progress).toBe(0);
    expect(reset.mistakes).toBe(0);
  });

  it('does not reset a locked puzzle into an active state', () => {
    const locked = createPuzzleState(puzzle);
    expect(resetPuzzle(locked)).toBe(locked);
  });
});
