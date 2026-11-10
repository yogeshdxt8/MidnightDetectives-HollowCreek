import { describe, expect, it } from 'vitest';
import { ArrivalWorkflowAI, type ArrivalWorkflowEvent } from '../src/arrival/arrival-ai';

describe('ArrivalWorkflowAI', () => {
  it('requires physical completion events for every arrival phase', () => {
    const ai = new ArrivalWorkflowAI();
    const sequence: ArrivalWorkflowEvent[] = [
      'dropoff-reached',
      'car-parked',
      'driver-door-opened',
      'driver-exited',
      'driver-door-closed',
      'passenger-door-opened',
      'passenger-exited',
      'player-clear-of-car',
      'greeting-position-reached',
      'greeting-finished',
      'driver-at-door',
      'driver-boarded',
      'driver-door-close-requested',
      'driver-door-closed-after-boarding',
      'departure-route-completed'
    ];

    for (const event of sequence) expect(ai.emit(event), event).toBe(true);
    expect(ai.state).toBe('departed');
    expect(ai.isComplete()).toBe(true);
    expect(ai.history).toEqual(sequence);
  });

  it('rejects out-of-order events without skipping required phases', () => {
    const ai = new ArrivalWorkflowAI();
    expect(ai.emit('passenger-door-opened')).toBe(false);
    expect(ai.state).toBe('approaching-dropoff');
    expect(ai.rejectedEvents).toBe(1);

    expect(ai.emit('dropoff-reached')).toBe(true);
    expect(ai.emit('car-parked')).toBe(true);
    expect(ai.emit('driver-door-opened')).toBe(true);
    expect(ai.state).toBe('driver-exiting');
    expect(ai.emit('driver-boarded')).toBe(false);
    expect(ai.state).toBe('driver-exiting');
  });

  it('does not accept duplicate or post-completion events', () => {
    const ai = new ArrivalWorkflowAI();
    expect(ai.emit('dropoff-reached')).toBe(true);
    expect(ai.emit('dropoff-reached')).toBe(false);
    expect(ai.state).toBe('parking');
    expect(ai.rejectedEvents).toBe(1);
  });
});
