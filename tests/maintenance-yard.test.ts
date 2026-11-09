import { describe, expect, it } from 'vitest';
import { collectYardRegulator, createMaintenanceYardState, searchMaintenanceYard, submitYardDeduction, type MaintenanceYardDefinition } from '../src/domain/maintenance-yard';
const definition: MaintenanceYardDefinition = { id:'old-maintenance-yard', requiredLeadId:'regulator-at-maintenance-yard', regulatorId:'brass-regulator', evidenceIds:['signed-work-order','matching-tool-mark'], correctDeductionId:'keeper-assistant' };
describe('old maintenance yard investigation', () => {
  it('remains locked until the keeper lead is tracked', () => expect(createMaintenanceYardState(definition).status).toBe('locked'));
  it('unlocks from the tracked keeper lead', () => expect(createMaintenanceYardState(definition,[definition.requiredLeadId]).status).toBe('available'));
  it('searches once and reveals both physical evidence items', () => {
    const state=createMaintenanceYardState(definition,[definition.requiredLeadId]);
    const result=searchMaintenanceYard(state,definition);
    expect(result.accepted).toBe(true);
    expect(result.state.discoveredEvidenceIds).toEqual(definition.evidenceIds);
    expect(searchMaintenanceYard(result.state,definition).accepted).toBe(false);
  });
  it('requires a searched yard and proximity to recover the regulator', () => {
    const state=searchMaintenanceYard(createMaintenanceYardState(definition,[definition.requiredLeadId]),definition).state;
    expect(collectYardRegulator(state,definition,5,2).accepted).toBe(false);
    expect(collectYardRegulator(state,definition,1,2).state.regulatorCollected).toBe(true);
  });
  it('accepts only an evidence-backed deduction after recovering the regulator', () => {
    const searched=searchMaintenanceYard(createMaintenanceYardState(definition,[definition.requiredLeadId]),definition).state;
    const recovered=collectYardRegulator(searched,definition,1,2).state;
    expect(submitYardDeduction(recovered,definition,'random-person').completed).toBe(false);
    const result=submitYardDeduction(recovered,definition,'keeper-assistant');
    expect(result.completed).toBe(true);
    expect(result.state.status).toBe('deduction-complete');
  });
  it('prevents changing a completed deduction', () => {
    const searched=searchMaintenanceYard(createMaintenanceYardState(definition,[definition.requiredLeadId]),definition).state;
    const recovered=collectYardRegulator(searched,definition,1,2).state;
    const solved=submitYardDeduction(recovered,definition,definition.correctDeductionId).state;
    expect(submitYardDeduction(solved,definition,'other').accepted).toBe(false);
  });
});
