export interface Clue { readonly id: string; readonly title: string; readonly description: string; }
export interface InvestigationState { readonly discoveredClueIds: readonly string[]; }
export const initialState: InvestigationState = { discoveredClueIds: [] };
export function discoverClue(state: InvestigationState, id: string, clues: readonly Clue[]): InvestigationState {
  if (!clues.some((clue) => clue.id === id) || state.discoveredClueIds.includes(id)) return state;
  return { discoveredClueIds: [...state.discoveredClueIds, id] };
}

export function isClueWithinRange(playerX:number,playerZ:number,clueX:number,clueZ:number,range:number):boolean {
  const dx=playerX-clueX;
  const dz=playerZ-clueZ;
  return dx*dx+dz*dz<=range*range;
}

export interface DeductionOption { readonly id:string; readonly title:string; readonly explanation:string; }
export interface DeductionResult { readonly correct:boolean; readonly feedback:string; }
export const prototypeDeductionOptions:readonly DeductionOption[]=[
 {id:'footprint-key',title:'The key was dropped by someone crossing the square.',explanation:'The muddy footprint and the key are both physical traces in the same area.'},
 {id:'wind',title:'The wind carried the key from the noticeboard.',explanation:'There is no evidence showing the key was near the noticeboard.'},
 {id:'clock',title:'The clock tower caused the key to appear.',explanation:'Nothing in the collected evidence supports this explanation.'}
];
export function evaluatePrototypeDeduction(discoveredClueIds:readonly string[],optionId:string):DeductionResult {
 if(discoveredClueIds.length<3)return {correct:false,feedback:'Collect all three clues before making a deduction.'};
 if(!prototypeDeductionOptions.some(option=>option.id===optionId))return {correct:false,feedback:'Choose one of the available theories.'};
 if(optionId==='footprint-key'&&discoveredClueIds.includes('print')&&discoveredClueIds.includes('key'))return {correct:true,feedback:'Reasonable deduction. The footprint and key support the same sequence of events.'};
 return {correct:false,feedback:'The evidence does not support that theory yet. Compare the physical clues and try again.'};
}
