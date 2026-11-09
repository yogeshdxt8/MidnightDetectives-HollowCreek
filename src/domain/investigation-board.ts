export interface BoardEvidence { readonly id:string; readonly title:string; readonly description:string; }
export interface EvidenceConnection { readonly id:string; readonly evidenceIds:readonly [string,string]; readonly conclusion:string; }
export interface InvestigationBoardDefinition { readonly evidence:readonly BoardEvidence[]; readonly requiredConnections:readonly EvidenceConnection[]; }
export interface InvestigationBoardState { readonly discoveredEvidenceIds:readonly string[]; readonly selectedEvidenceIds:readonly string[]; readonly connections:readonly EvidenceConnection[]; readonly conclusionUnlocked:boolean; readonly feedback:string; }
export interface BoardResult { readonly state:InvestigationBoardState; readonly accepted:boolean; readonly completed:boolean; }
export function createInvestigationBoardState(discoveredEvidenceIds:readonly string[]=[]):InvestigationBoardState {
 return {discoveredEvidenceIds:[...new Set(discoveredEvidenceIds)],selectedEvidenceIds:[],connections:[],conclusionUnlocked:false,feedback:'Collect evidence from the investigation locations, then select two items to compare.'};
}
export function addBoardEvidence(state:InvestigationBoardState,evidenceId:string,definition:InvestigationBoardDefinition):InvestigationBoardState {
 if(!definition.evidence.some(item=>item.id===evidenceId)||state.discoveredEvidenceIds.includes(evidenceId))return state;
 return {...state,discoveredEvidenceIds:[...state.discoveredEvidenceIds,evidenceId],feedback:'New evidence added to the investigation board.'};
}
export function selectBoardEvidence(state:InvestigationBoardState,evidenceId:string):BoardResult {
 if(!state.discoveredEvidenceIds.includes(evidenceId))return {state,accepted:false,completed:false};
 if(state.selectedEvidenceIds.includes(evidenceId))return {state:{...state,selectedEvidenceIds:state.selectedEvidenceIds.filter(id=>id!==evidenceId),feedback:'Evidence deselected.'},accepted:true,completed:false};
 if(state.selectedEvidenceIds.length>=2)return {state,accepted:false,completed:false};
 return {state:{...state,selectedEvidenceIds:[...state.selectedEvidenceIds,evidenceId],feedback:state.selectedEvidenceIds.length===0?'Select one more item to compare.':'Two items selected. Connect them to test the relationship.'},accepted:true,completed:false};
}
export function connectBoardEvidence(state:InvestigationBoardState,definition:InvestigationBoardDefinition):BoardResult {
 if(state.selectedEvidenceIds.length!==2)return {state:{...state,feedback:'Select exactly two evidence items first.'},accepted:false,completed:false};
 const pair=[...state.selectedEvidenceIds].sort();
 const connection=definition.requiredConnections.find(item=>[...item.evidenceIds].sort().join('|')===pair.join('|'));
 if(!connection)return {state:{...state,selectedEvidenceIds:[],feedback:'These items do not establish a supported connection. Reconsider the evidence.'},accepted:true,completed:false};
 if(state.connections.some(item=>item.id===connection.id))return {state:{...state,selectedEvidenceIds:[],feedback:'This connection is already recorded.'},accepted:false,completed:false};
 const connections=[...state.connections,connection];
 const completed=definition.requiredConnections.every(item=>connections.some(found=>found.id===item.id));
 return {state:{...state,selectedEvidenceIds:[],connections,conclusionUnlocked:completed,feedback:completed?'The three connections form a consistent chain: the regulator transfer, the repeated crescent seal, and an unidentified authorizer.':'Connection recorded: '+connection.conclusion},accepted:true,completed};
}
