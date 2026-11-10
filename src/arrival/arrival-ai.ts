export type ArrivalWorkflowState =
  | 'approaching-dropoff'
  | 'parking'
  | 'opening-driver-door'
  | 'driver-exiting'
  | 'closing-driver-door'
  | 'opening-passenger-door'
  | 'passenger-exiting'
  | 'player-clearing-car'
  | 'greeting-approach'
  | 'greeting'
  | 'returning-to-car'
  | 'boarding'
  | 'seated'
  | 'closing-driver-door-after-boarding'
  | 'departing'
  | 'departed';

export type ArrivalWorkflowEvent =
  | 'dropoff-reached'
  | 'car-parked'
  | 'driver-door-opened'
  | 'driver-exited'
  | 'driver-door-closed'
  | 'passenger-door-opened'
  | 'passenger-exited'
  | 'player-clear-of-car'
  | 'greeting-position-reached'
  | 'greeting-finished'
  | 'driver-at-door'
  | 'driver-boarded'
  | 'driver-door-close-requested'
  | 'driver-door-closed-after-boarding'
  | 'departure-route-completed';

const transitions: Readonly<Record<ArrivalWorkflowState, Partial<Record<ArrivalWorkflowEvent, ArrivalWorkflowState>>>> = {
  'approaching-dropoff': { 'dropoff-reached': 'parking' },
  parking: { 'car-parked': 'opening-driver-door' },
  'opening-driver-door': { 'driver-door-opened': 'driver-exiting' },
  'driver-exiting': { 'driver-exited': 'closing-driver-door' },
  'closing-driver-door': { 'driver-door-closed': 'opening-passenger-door' },
  'opening-passenger-door': { 'passenger-door-opened': 'passenger-exiting' },
  'passenger-exiting': { 'passenger-exited': 'player-clearing-car' },
  'player-clearing-car': { 'player-clear-of-car': 'greeting-approach' },
  'greeting-approach': { 'greeting-position-reached': 'greeting' },
  greeting: { 'greeting-finished': 'returning-to-car' },
  'returning-to-car': { 'driver-at-door': 'boarding' },
  boarding: { 'driver-boarded': 'seated' },
  seated: { 'driver-door-close-requested': 'closing-driver-door-after-boarding' },
  'closing-driver-door-after-boarding': { 'driver-door-closed-after-boarding': 'departing' },
  departing: { 'departure-route-completed': 'departed' },
  departed: {}
};

/**
 * Deterministic event-driven arrival AI.
 *
 * The controller does not advance on elapsed-time guesses. Every transition
 * requires a physical/animation completion event emitted by the scene driver.
 * Invalid, duplicate, or out-of-order events are ignored and recorded for tests.
 */
export class ArrivalWorkflowAI {
  private currentState: ArrivalWorkflowState = 'approaching-dropoff';
  private readonly eventHistory: ArrivalWorkflowEvent[] = [];
  private rejectedEventCount = 0;

  get state(): ArrivalWorkflowState {
    return this.currentState;
  }

  get history(): readonly ArrivalWorkflowEvent[] {
    return this.eventHistory;
  }

  get rejectedEvents(): number {
    return this.rejectedEventCount;
  }

  emit(event: ArrivalWorkflowEvent): boolean {
    const next = transitions[this.currentState][event];
    if (!next) {
      this.rejectedEventCount += 1;
      return false;
    }
    this.eventHistory.push(event);
    this.currentState = next;
    return true;
  }

  isComplete(): boolean {
    return this.currentState === 'departed';
  }
}
