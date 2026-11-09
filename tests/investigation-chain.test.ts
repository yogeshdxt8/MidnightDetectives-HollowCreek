import { describe, expect, it } from 'vitest';
import {
  createInvestigationChainState,
  searchInvestigationLocation,
  unlockInvestigationLocation,
  type InvestigationLocationDefinition
} from '../src/domain/investigation-chain';

const location: InvestigationLocationDefinition = {
  id: 'clocktower-service-entrance',
  title: 'Clock Tower Service Entrance',
  requiredLeadId: 'clocktower-service-door',
  evidence: {
    id: 'three-line-imprint',
    title: 'Three-line metal imprint',
    description: 'A matching three-line mark is pressed into a service-panel screw plate.'
  },
  followUpPuzzleId: 'service-panel-sequence',
  followUpPuzzleTitle: 'The service-panel sequence'
};

describe('investigation location chain', () => {
  it('starts locked', () => {
    expect(createInvestigationChainState().locationStatus).toBe('locked');
  });

  it('does not unlock until its required lead is tracked', () => {
    const state = createInvestigationChainState();
    expect(unlockInvestigationLocation(state, [], location)).toBe(state);
  });

  it('unlocks when the required lead is tracked', () => {
    const state = createInvestigationChainState();
    expect(unlockInvestigationLocation(state, [location.requiredLeadId], location).locationStatus).toBe('unlocked');
  });

  it('searches once, discovers evidence, and unlocks the follow-up puzzle', () => {
    const unlocked = unlockInvestigationLocation(createInvestigationChainState(), [location.requiredLeadId], location);
    const result = searchInvestigationLocation(unlocked, location.id, location);
    expect(result.accepted).toBe(true);
    expect(result.discoveredEvidence).toBe(true);
    expect(result.unlockedPuzzle).toBe(true);
    expect(result.state.discoveredEvidenceIds).toContain(location.evidence.id);
    expect(result.state.unlockedPuzzleIds).toContain(location.followUpPuzzleId);
    expect(result.state.locationStatus).toBe('searched');
  });

  it('prevents searching a locked or unrelated location', () => {
    const state = createInvestigationChainState();
    expect(searchInvestigationLocation(state, location.id, location).accepted).toBe(false);
    expect(searchInvestigationLocation(state, 'another-place', location).accepted).toBe(false);
  });

  it('prevents duplicate evidence and puzzle rewards', () => {
    const unlocked = unlockInvestigationLocation(createInvestigationChainState(), [location.requiredLeadId], location);
    const searched = searchInvestigationLocation(unlocked, location.id, location).state;
    const repeated = searchInvestigationLocation(searched, location.id, location);
    expect(repeated.accepted).toBe(false);
    expect(repeated.state.discoveredEvidenceIds).toHaveLength(1);
    expect(repeated.state.unlockedPuzzleIds).toHaveLength(1);
  });
});
