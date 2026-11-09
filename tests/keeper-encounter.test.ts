import { describe, expect, it } from 'vitest';
import {
  askKeeperAbout,
  createKeeperEncounterState,
  presentEvidenceToKeeper,
  unlockKeeperEncounter,
  type KeeperEncounterDefinition
} from '../src/domain/keeper-encounter';

const keeper: KeeperEncounterDefinition = {
  id: 'clock-tower-keeper',
  name: 'Clock Tower Keeper',
  requiredEvidenceIds: ['three-line-imprint', 'keeper-message'],
  presentedEvidenceId: 'keeper-message',
  evidenceResponse: 'The keeper recognizes the seal. The brass regulator was moved to the old maintenance yard before the bell stopped.',
  followUpLeadId: 'regulator-at-maintenance-yard',
  followUpLeadTitle: 'The missing brass regulator',
  topics: [
    { id: 'clock', label: 'The stopped bell', response: 'The bell stopped at 11:17. I heard no strike after that.' },
    { id: 'maintenance', label: 'Tower maintenance', response: 'Only I have the service keys. Someone opened the panel from the inside.' },
    { id: 'missing-object', label: 'Something moved', response: 'A heavy part was taken from the regulator housing.' }
  ]
};

describe('clock tower keeper encounter', () => {
  it('is unavailable until explicitly unlocked', () => {
    expect(createKeeperEncounterState().status).toBe('unavailable');
  });

  it('becomes available after the service-panel message unlocks the encounter', () => {
    expect(unlockKeeperEncounter(createKeeperEncounterState()).status).toBe('available');
  });

  it('returns a response for a selected topic and prevents repeated questions', () => {
    const state = unlockKeeperEncounter(createKeeperEncounterState());
    const result = askKeeperAbout(state, keeper, 'clock');
    expect(result.accepted).toBe(true);
    expect(result.state.feedback).toContain('11:17');
    expect(askKeeperAbout(result.state, keeper, 'clock').accepted).toBe(false);
  });

  it('rejects unknown topics and unavailable conversations', () => {
    const initial = createKeeperEncounterState();
    expect(askKeeperAbout(initial, keeper, 'clock').accepted).toBe(false);
    expect(askKeeperAbout(unlockKeeperEncounter(initial), keeper, 'unknown-topic' as never).accepted).toBe(false);
  });

  it('requires all prerequisite evidence before evidence can be presented', () => {
    const state = unlockKeeperEncounter(createKeeperEncounterState());
    expect(presentEvidenceToKeeper(state, keeper, 'keeper-message', ['keeper-message']).accepted).toBe(false);
  });

  it('unlocks a new lead when the correct evidence is presented', () => {
    const state = unlockKeeperEncounter(createKeeperEncounterState());
    const result = presentEvidenceToKeeper(state, keeper, 'keeper-message', keeper.requiredEvidenceIds);
    expect(result.accepted).toBe(true);
    expect(result.unlockedLead).toBe(true);
    expect(result.state.leadUnlocked).toBe(true);
    expect(result.state.feedback).toContain('regulator');
  });

  it('prevents presenting the same evidence twice', () => {
    const state = unlockKeeperEncounter(createKeeperEncounterState());
    const first = presentEvidenceToKeeper(state, keeper, 'keeper-message', keeper.requiredEvidenceIds);
    expect(presentEvidenceToKeeper(first.state, keeper, 'keeper-message', keeper.requiredEvidenceIds).accepted).toBe(false);
  });
});
