import { describe, expect, it } from 'vitest';
import { createRelicState, collectRelic, type EnvironmentalRelicDefinition } from '../src/domain/environmental-relic';
import { createInvestigationLeadState, revealInvestigationLead, trackInvestigationLead, type InvestigationLeadDefinition } from '../src/domain/investigation-lead';
import { createInvestigationChainState, unlockInvestigationLocation, searchInvestigationLocation, type InvestigationLocationDefinition } from '../src/domain/investigation-chain';
import { createServicePanelPuzzleState, interactWithServicePanel, type ServicePanelPuzzleDefinition } from '../src/domain/service-panel-puzzle';
import { createKeeperEncounterState, unlockKeeperEncounter, askKeeperAbout, presentEvidenceToKeeper, type KeeperEncounterDefinition } from '../src/domain/keeper-encounter';
import { createMaintenanceYardState, searchMaintenanceYard, collectYardRegulator, submitYardDeduction, type MaintenanceYardDefinition } from '../src/domain/maintenance-yard';

const relic: EnvironmentalRelicDefinition = { id: 'fountain-relic', name: 'Fountain relic', description: 'Recovered relic', requiredPuzzleId: 'fountain-seal' };
const firstLead: InvestigationLeadDefinition = { id: 'clocktower-service-door', title: 'A mark pointing to the clock tower', sourceRelicId: relic.id, observation: 'A three-line mark is cut into the relic.', nextObjective: 'Find the matching mark.', locationHint: 'Clock tower service entrance.' };
const location: InvestigationLocationDefinition = { id: 'clocktower-service-entrance', title: 'Clock Tower Service Entrance', requiredLeadId: firstLead.id, evidence: { id: 'three-line-imprint', title: 'Three-line metal imprint', description: 'A matching mark on the service panel.' }, followUpPuzzleId: 'service-panel-sequence', followUpPuzzleTitle: 'The service-panel sequence' };
const panel: ServicePanelPuzzleDefinition = { id: 'service-panel-sequence', title: 'The service-panel sequence', sequence: ['three-line', 'crescent', 'keyhole'], requiredEvidenceId: location.evidence.id, maxMistakes: 3 };
const messageLead: InvestigationLeadDefinition = { id: 'message-in-the-wall', title: 'A message behind the service panel', sourceRelicId: '', sourceEvidenceId: 'three-line-imprint', observation: 'A note asks the player to question the keeper.', nextObjective: 'Ask what was moved before the bell stopped.', locationHint: 'The clock tower.' };
const keeper: KeeperEncounterDefinition = { id: 'clock-tower-keeper', name: 'Clock Tower Keeper', requiredEvidenceIds: ['three-line-imprint', 'keeper-message'], presentedEvidenceId: 'keeper-message', evidenceResponse: 'The brass regulator was moved to the maintenance yard.', followUpLeadId: 'regulator-at-maintenance-yard', followUpLeadTitle: 'The missing brass regulator', topics: [{ id: 'clock', label: 'The stopped bell', response: 'The bell stopped at 11:17.' }, { id: 'maintenance', label: 'Tower maintenance', response: 'The service panel was opened from inside.' }, { id: 'missing-object', label: 'What was moved?', response: 'A brass regulator was removed.' }] };
const yardLead: InvestigationLeadDefinition = { id: keeper.followUpLeadId, title: keeper.followUpLeadTitle, sourceRelicId: '', sourceEvidenceId: 'keeper-message', observation: 'The keeper identified the missing regulator.', nextObjective: 'Search the maintenance yard.', locationHint: 'Beyond the service lane.' };
const yard: MaintenanceYardDefinition = { id: 'old-maintenance-yard', requiredLeadId: yardLead.id, regulatorId: 'brass-regulator', evidenceIds: ['signed-work-order', 'matching-tool-mark'], correctDeductionId: 'keeper-assistant' };

describe('end-to-end investigation chain', () => {
  it('progresses from the fountain relic through the clock tower, keeper, and maintenance-yard deduction', () => {
    // Fountain puzzle completion exposes the relic; collection reveals the first lead.
    const relicState = createRelicState(relic, ['fountain-seal']);
    const collected = collectRelic(relicState, relic, 1, 2);
    expect(collected.collected).toBe(true);
    let firstLeadState = revealInvestigationLead(createInvestigationLeadState(), firstLead, [relic.id]);
    expect(firstLeadState.status).toBe('revealed');
    firstLeadState = trackInvestigationLead(firstLeadState);
    expect(firstLeadState.status).toBe('tracked');

    // Tracking the lead unlocks the real searchable location and its evidence.
    let chain = unlockInvestigationLocation(createInvestigationChainState(), [firstLead.id], location);
    expect(chain.locationStatus).toBe('unlocked');
    const searched = searchInvestigationLocation(chain, location.id, location);
    expect(searched.accepted).toBe(true);
    chain = searched.state;
    expect(chain.discoveredEvidenceIds).toContain('three-line-imprint');
    expect(chain.unlockedPuzzleIds).toContain(panel.id);

    // The evidence gate protects the service-panel sequence.
    let puzzle = createServicePanelPuzzleState(panel, chain.discoveredEvidenceIds);
    expect(puzzle.status).toBe('active');
    for (const symbol of panel.sequence) {
      const result = interactWithServicePanel(puzzle, panel, symbol, chain.discoveredEvidenceIds);
      expect(result.accepted).toBe(true);
      puzzle = result.state;
    }
    expect(puzzle.status).toBe('solved');

    // The hidden message unlocks the keeper conversation and the next lead.
    const evidence = ['three-line-imprint', 'keeper-message'];
    const revealedMessage = revealInvestigationLead(createInvestigationLeadState(), messageLead, evidence);
    expect(revealedMessage.status).toBe('revealed');
    const keeperState = unlockKeeperEncounter(createKeeperEncounterState());
    const asked = askKeeperAbout(keeperState, keeper, 'missing-object');
    expect(asked.accepted).toBe(true);
    expect(asked.state.feedback).toContain('brass regulator');
    const presented = presentEvidenceToKeeper(asked.state, keeper, 'keeper-message', evidence);
    expect(presented.unlockedLead).toBe(true);
    expect(presented.state.status).toBe('informed');

    let nextLead = revealInvestigationLead(createInvestigationLeadState(), yardLead, ['keeper-message']);
    nextLead = trackInvestigationLead(nextLead);
    expect(nextLead.status).toBe('tracked');

    // The tracked keeper lead unlocks the yard, where evidence supports a deduction.
    let yardState = createMaintenanceYardState(yard, [yardLead.id]);
    expect(yardState.status).toBe('available');
    const yardSearch = searchMaintenanceYard(yardState, yard);
    expect(yardSearch.accepted).toBe(true);
    yardState = yardSearch.state;
    const recovered = collectYardRegulator(yardState, yard, 1, 2);
    expect(recovered.accepted).toBe(true);
    yardState = recovered.state;
    const deduction = submitYardDeduction(yardState, yard, 'keeper-assistant');
    expect(deduction.completed).toBe(true);
    expect(deduction.state.status).toBe('deduction-complete');
  });

  it('blocks progression when any upstream gate is skipped', () => {
    expect(collectRelic(createRelicState(relic), relic, 0, 2).accepted).toBe(false);
    expect(unlockInvestigationLocation(createInvestigationChainState(), [], location).locationStatus).toBe('locked');
    expect(createServicePanelPuzzleState(panel).status).toBe('locked');
    expect(askKeeperAbout(createKeeperEncounterState(), keeper, 'clock').accepted).toBe(false);
    expect(createMaintenanceYardState(yard).status).toBe('locked');
  });

  it('does not grant duplicate location evidence or repeat the same keeper evidence reward', () => {
    const unlocked = unlockInvestigationLocation(createInvestigationChainState(), [firstLead.id], location);
    const searched = searchInvestigationLocation(unlocked, location.id, location).state;
    expect(searchInvestigationLocation(searched, location.id, location).accepted).toBe(false);
    const keeperState = unlockKeeperEncounter(createKeeperEncounterState());
    const first = presentEvidenceToKeeper(keeperState, keeper, 'keeper-message', ['three-line-imprint', 'keeper-message']);
    expect(first.unlockedLead).toBe(true);
    expect(presentEvidenceToKeeper(first.state, keeper, 'keeper-message', ['three-line-imprint', 'keeper-message']).accepted).toBe(false);
  });
});
