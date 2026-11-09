export type ValeTopic = 'transfer-order' | 'regulator' | 'keeper';
export type ValeEncounterStatus = 'locked' | 'available' | 'confronted';
export interface ValeTopicOption { readonly id: ValeTopic; readonly label: string; readonly response: string; }
export interface ValeEncounterDefinition {
  readonly id: string;
  readonly requiredEvidenceIds: readonly string[];
  readonly topics: readonly ValeTopicOption[];
  readonly decisiveEvidenceId: string;
  readonly response: string;
  readonly followUpLeadId: string;
  readonly followUpLeadTitle: string;
}
export interface ValeEncounterState {
  readonly status: ValeEncounterStatus;
  readonly askedTopicIds: readonly ValeTopic[];
  readonly presentedEvidenceIds: readonly string[];
  readonly leadUnlocked: boolean;
  readonly feedback: string;
}
export interface ValeInteractionResult { readonly state: ValeEncounterState; readonly accepted: boolean; readonly unlockedLead: boolean; }
export function createValeEncounterState(): ValeEncounterState {
  return { status:'locked', askedTopicIds:[], presentedEvidenceIds:[], leadUnlocked:false, feedback:'Elias is not ready to talk.' };
}
export function unlockValeEncounter(state: ValeEncounterState): ValeEncounterState {
  return state.status==='locked' ? {...state,status:'available',feedback:'Elias watches you approach, then turns away.'} : state;
}
export function askValeAbout(state: ValeEncounterState, definition: ValeEncounterDefinition, topic: ValeTopic): ValeInteractionResult {
  if(state.status!=='available'||state.askedTopicIds.includes(topic)) return {state,accepted:false,unlockedLead:false};
  const option=definition.topics.find(item=>item.id===topic);
  if(!option) return {state,accepted:false,unlockedLead:false};
  return {state:{...state,askedTopicIds:[...state.askedTopicIds,topic],feedback:option.response},accepted:true,unlockedLead:false};
}
export function presentEvidenceToVale(state: ValeEncounterState, definition: ValeEncounterDefinition, evidenceId: string, discoveredEvidenceIds: readonly string[]): ValeInteractionResult {
  if(state.status!=='available'||!definition.requiredEvidenceIds.every(id=>discoveredEvidenceIds.includes(id))) return {state,accepted:false,unlockedLead:false};
  if(evidenceId!==definition.decisiveEvidenceId||state.presentedEvidenceIds.includes(evidenceId)) return {state,accepted:false,unlockedLead:false};
  return {state:{...state,status:'confronted',presentedEvidenceIds:[...state.presentedEvidenceIds,evidenceId],leadUnlocked:true,feedback:definition.response},accepted:true,unlockedLead:true};
}
