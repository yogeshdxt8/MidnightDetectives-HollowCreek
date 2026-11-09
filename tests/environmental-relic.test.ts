import { describe, expect, it } from 'vitest';
import {
  collectRelic,
  createRelicState,
  updateRelicAvailability,
  type EnvironmentalRelicDefinition
} from '../src/domain/environmental-relic';

const relic: EnvironmentalRelicDefinition = {
  id: 'fountain-relic',
  name: 'Fountain relic',
  description: 'A small golden relic hidden beneath the fountain seal.',
  requiredPuzzleId: 'fountain-seal'
};

describe('environmental relic interaction', () => {
  it('keeps the relic locked until its puzzle is solved', () => {
    const state = createRelicState(relic);
    const result = collectRelic(state, relic, 0, 2);
    expect(state.status).toBe('locked');
    expect(result.collected).toBe(false);
    expect(result.state.feedback).toContain('Solve the environmental mechanism');
  });

  it('becomes available when the required puzzle is solved', () => {
    const locked = createRelicState(relic);
    const unlocked = updateRelicAvailability(locked, relic, ['fountain-seal']);
    expect(unlocked.status).toBe('available');
  });

  it('does not change an already collected relic back to available', () => {
    const collected = { status: 'collected' as const, feedback: 'Collected.' };
    expect(updateRelicAvailability(collected, relic, [])).toBe(collected);
  });

  it('rejects collection when the player is outside interaction range', () => {
    const available = createRelicState(relic, ['fountain-seal']);
    const result = collectRelic(available, relic, 3, 2);
    expect(result.accepted).toBe(false);
    expect(result.collected).toBe(false);
    expect(result.state.status).toBe('available');
    expect(result.state.feedback).toContain('Move closer');
  });

  it('collects once when the player is within range', () => {
    const available = createRelicState(relic, ['fountain-seal']);
    const result = collectRelic(available, relic, 1.2, 2);
    expect(result).toMatchObject({
      accepted: true,
      collected: true,
      state: { status: 'collected' }
    });
    expect(result.state.feedback).toContain('added to your inventory');
  });

  it('prevents duplicate collection', () => {
    const collected = { status: 'collected' as const, feedback: 'Already collected.' };
    const result = collectRelic(collected, relic, 0, 2);
    expect(result.accepted).toBe(false);
    expect(result.collected).toBe(false);
    expect(result.state).toBe(collected);
  });

  it('rejects invalid distance and range values', () => {
    const available = createRelicState(relic, ['fountain-seal']);
    expect(collectRelic(available, relic, Number.NaN, 2).collected).toBe(false);
    expect(collectRelic(available, relic, 1, -1).collected).toBe(false);
  });
});
