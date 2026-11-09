export type PumpHouseStatus = 'locked' | 'available' | 'searched' | 'mechanism-open' | 'ledger-recovered' | 'deduction-complete';
export interface PumpHouseDefinition {
  readonly id: string;
  readonly requiredLeadId: string;
  readonly mechanismSequence: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly correctDeductionId: string;
}
export interface PumpHouseState {
  readonly status: PumpHouseStatus;
  readonly mechanismProgress: number;
  readonly discoveredEvidenceIds: readonly string[];
  readonly ledgerRecovered: boolean;
  readonly deductionId: string | null;
  readonly feedback: string;
}
export interface PumpHouseResult { readonly state: PumpHouseState; readonly accepted: boolean; readonly completed: boolean; }
export function createPumpHouseState(definition: PumpHouseDefinition, trackedLeadIds: readonly string[] = []): PumpHouseState {
 const unlocked=trackedLeadIds.includes(definition.requiredLeadId);
 return {status:unlocked?'available':'locked',mechanismProgress:0,discoveredEvidenceIds:[],ledgerRecovered:false,deductionId:null,feedback:unlocked?'The pump house is accessible. Search the pump assembly.':'Track the sealed-ledger lead to unlock the pump house.'};
}
export function searchPumpHouse(state:PumpHouseState,definition:PumpHouseDefinition):PumpHouseResult {
 if(state.status!=='available')return {state,accepted:false,completed:false};
 return {state:{...state,status:'searched',discoveredEvidenceIds:[...definition.evidenceIds],feedback:'Behind the pump housing you find a four-notch selector and a fresh strip of blue sealing wax.'},accepted:true,completed:true};
}
export function turnPumpHouseMechanism(state:PumpHouseState,definition:PumpHouseDefinition,symbol:string):PumpHouseResult {
 if(state.status!=='searched')return {state,accepted:false,completed:false};
 const expected=definition.mechanismSequence[state.mechanismProgress];
 if(symbol!==expected)return {state:{...state,mechanismProgress:0,feedback:'The selector clicks back. The wax impression suggests a different order.'},accepted:true,completed:false};
 const progress=state.mechanismProgress+1;
 const complete=progress===definition.mechanismSequence.length;
 return {state:{...state,status:complete?'mechanism-open':'searched',mechanismProgress:progress,feedback:complete?'The pump lock releases. A narrow drawer slides out beneath the flywheel.':`Notch ${progress} aligns. Continue the sequence.`},accepted:true,completed:complete};
}
export function recoverPumpHouseLedger(state:PumpHouseState):PumpHouseResult {
 if(state.status!=='mechanism-open'||state.ledgerRecovered)return {state,accepted:false,completed:false};
 return {state:{...state,status:'ledger-recovered',ledgerRecovered:true,feedback:'The sealed ledger is recovered. One order is signed only with a crescent-shaped mark, not a name.'},accepted:true,completed:true};
}
export function submitPumpHouseDeduction(state:PumpHouseState,definition:PumpHouseDefinition,deductionId:string):PumpHouseResult {
 if(state.status!=='ledger-recovered'||state.deductionId!==null)return {state,accepted:false,completed:false};
 const correct=deductionId===definition.correctDeductionId;
 return {state:{...state,status:correct?'deduction-complete':'ledger-recovered',deductionId:correct?deductionId:null,feedback:correct?'The ledger shows the regulator order was authorized by the same unknown source that marked the earlier evidence. The identity remains concealed.':'The ledger does not support that conclusion. Re-examine the repeated crescent seal.'},accepted:true,completed:correct};
}
