import { describe, expect, it } from 'vitest';
import {
  createServicePanelPuzzleState,
  interactWithServicePanel,
  resetServicePanelPuzzle,
  type ServicePanelPuzzleDefinition
} from '../src/domain/service-panel-puzzle';

const definition: ServicePanelPuzzleDefinition = {
  id: 'service-panel-sequence',
  title: 'The service-panel sequence',
  sequence: ['three-line', 'crescent', 'keyhole'],
  requiredEvidenceId: 'three-line-imprint',
  maxMistakes: 3
};
const evidence = [definition.requiredEvidenceId];

describe('service panel puzzle state machine', () => {
  it('starts locked until the matching imprint is discovered', () => {
    expect(createServicePanelPuzzleState(definition).status).toBe('locked');
    expect(createServicePanelPuzzleState(definition, evidence).status).toBe('active');
  });

  it('rejects interaction while locked', () => {
    const state = createServicePanelPuzzleState(definition);
    const result = interactWithServicePanel(state, definition, 'three-line', []);
    expect(result.accepted).toBe(false);
    expect(result.state.status).toBe('locked');
  });

  it('advances only when the expected symbol is entered', () => {
    const state = createServicePanelPuzzleState(definition, evidence);
    const wrong = interactWithServicePanel(state, definition, 'keyhole', evidence);
    expect(wrong.state.progress).toBe(0);
    expect(wrong.state.mistakes).toBe(1);
    const right = interactWithServicePanel(wrong.state, definition, 'three-line', evidence);
    expect(right.state.progress).toBe(1);
    expect(right.state.mistakes).toBe(1);
  });

  it('solves after the complete correct sequence', () => {
    let state = createServicePanelPuzzleState(definition, evidence);
    for (const symbol of definition.sequence) {
      state = interactWithServicePanel(state, definition, symbol, evidence).state;
    }
    expect(state.status).toBe('solved');
    expect(state.progress).toBe(3);
  });

  it('fails after the configured number of mistakes', () => {
    let state = createServicePanelPuzzleState(definition, evidence);
    for (let i = 0; i < definition.maxMistakes; i++) {
      state = interactWithServicePanel(state, definition, 'incorrect', evidence).state;
    }
    expect(state.status).toBe('failed');
    expect(interactWithServicePanel(state, definition, 'three-line', evidence).accepted).toBe(false);
  });

  it('resets progress and mistakes while preserving the evidence gate', () => {
    let state = createServicePanelPuzzleState(definition, evidence);
    state = interactWithServicePanel(state, definition, 'incorrect', evidence).state;
    const reset = resetServicePanelPuzzle(state, definition, evidence);
    expect(reset.status).toBe('active');
    expect(reset.progress).toBe(0);
    expect(reset.mistakes).toBe(0);
    expect(resetServicePanelPuzzle(reset, definition, []).status).toBe('locked');
  });

  it('does not solve from a partial sequence', () => {
    const state = createServicePanelPuzzleState(definition, evidence);
    const result = interactWithServicePanel(state, definition, 'three-line', evidence);
    expect(result.completed).toBe(false);
    expect(result.state.status).toBe('active');
  });
});
