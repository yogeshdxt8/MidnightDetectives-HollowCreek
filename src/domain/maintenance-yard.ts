export type MaintenanceYardStatus = 'locked' | 'available' | 'searched' | 'regulator-recovered' | 'deduction-complete';
export interface MaintenanceYardDefinition {
  readonly id: string;
  readonly requiredLeadId: string;
  readonly regulatorId: string;
  readonly evidenceIds: readonly string[];
  readonly correctDeductionId: string;
}
export interface MaintenanceYardState {
  readonly status: MaintenanceYardStatus;
  readonly discoveredEvidenceIds: readonly string[];
  readonly regulatorCollected: boolean;
  readonly deductionId: string | null;
  readonly feedback: string;
}
export interface YardActionResult { readonly state: MaintenanceYardState; readonly accepted: boolean; readonly completed: boolean; }
export function createMaintenanceYardState(definition: MaintenanceYardDefinition, trackedLeadIds: readonly string[] = []): MaintenanceYardState {
  const unlocked = trackedLeadIds.includes(definition.requiredLeadId);
  return { status: unlocked ? 'available' : 'locked', discoveredEvidenceIds: [], regulatorCollected: false, deductionId: null, feedback: unlocked ? 'The maintenance yard is accessible. Search the work area.' : 'Track the keeper’s lead to unlock the maintenance yard.' };
}
export function searchMaintenanceYard(state: MaintenanceYardState, definition: MaintenanceYardDefinition): YardActionResult {
  if (state.status !== 'available') return { state, accepted: false, completed: false };
  return { state: { ...state, status: 'searched', discoveredEvidenceIds: [...definition.evidenceIds], feedback: 'You find the brass regulator, a fresh tool mark, and a torn work order bearing a distinctive initials stamp.' }, accepted: true, completed: true };
}
export function collectYardRegulator(state: MaintenanceYardState, definition: MaintenanceYardDefinition, distance: number, maxDistance: number): YardActionResult {
  if (state.status !== 'searched' || state.regulatorCollected || !Number.isFinite(distance) || distance < 0 || distance > maxDistance) return { state, accepted: false, completed: false };
  return { state: { ...state, status: 'regulator-recovered', regulatorCollected: true, feedback: `The ${definition.regulatorId} is recovered. The work order and matching tool mark remain as evidence.` }, accepted: true, completed: true };
}
export function submitYardDeduction(state: MaintenanceYardState, definition: MaintenanceYardDefinition, deductionId: string): YardActionResult {
  if (state.status !== 'regulator-recovered' || state.deductionId !== null) return { state, accepted: false, completed: false };
  if (!state.discoveredEvidenceIds.every(id => definition.evidenceIds.includes(id))) return { state, accepted: false, completed: false };
  const correct = deductionId === definition.correctDeductionId;
  return { state: { ...state, status: correct ? 'deduction-complete' : 'regulator-recovered', deductionId: correct ? deductionId : null, feedback: correct ? 'The initials on the work order match the maker’s stamp on the tool mark. Someone with access to the yard moved the regulator and left in a hurry.' : 'That conclusion is not supported by the physical evidence. Compare the work order with the tool mark and try again.' }, accepted: true, completed: correct };
}
