export type RecordsOfficeStatus='locked'|'available'|'searched'|'classification-open'|'classified'|'historical-discovery';
export interface ArchiveDocument { readonly id:string; readonly title:string; readonly category:string; readonly description:string; }
export interface RecordsOfficeDefinition { readonly id:string; readonly requiredLeadId:string; readonly documents:readonly ArchiveDocument[]; readonly classificationSequence:readonly string[]; readonly historicalEvidenceId:string; }
export interface RecordsOfficeState { readonly status:RecordsOfficeStatus; readonly discoveredDocumentIds:readonly string[]; readonly classificationProgress:number; readonly classifiedDocumentIds:readonly string[]; readonly historicalEvidenceDiscovered:boolean; readonly feedback:string; }
export interface RecordsOfficeResult { readonly state:RecordsOfficeState; readonly accepted:boolean; readonly completed:boolean; }
export function createRecordsOfficeState(definition:RecordsOfficeDefinition,trackedLeadIds:readonly string[]=[]):RecordsOfficeState {
 const unlocked=trackedLeadIds.includes(definition.requiredLeadId);
 return {status:unlocked?'available':'locked',discoveredDocumentIds:[],classificationProgress:0,classifiedDocumentIds:[],historicalEvidenceDiscovered:false,feedback:unlocked?'The records office is open. Search the archive shelves and filing cabinets.':'Track the crescent-seal lead to unlock the records office.'};
}
export function searchRecordsOffice(state:RecordsOfficeState,definition:RecordsOfficeDefinition):RecordsOfficeResult {
 if(state.status!=='available')return {state,accepted:false,completed:false};
 return {state:{...state,status:'searched',discoveredDocumentIds:definition.documents.map(d=>d.id),feedback:'Three documents carry the crescent seal: an incident report, a transfer order and a witness statement. Classify them by record type.'},accepted:true,completed:true};
}
export function classifyArchiveDocument(state:RecordsOfficeState,definition:RecordsOfficeDefinition,documentId:string):RecordsOfficeResult {
 if(state.status!=='searched'&&state.status!=='classification-open')return {state,accepted:false,completed:false};
 const document=definition.documents.find(d=>d.id===documentId);
 if(!document||state.classifiedDocumentIds.includes(documentId))return {state,accepted:false,completed:false};
 const expected=definition.classificationSequence[state.classificationProgress];
 if(document.category!==expected)return {state:{...state,status:'classification-open',classificationProgress:0,classifiedDocumentIds:[],feedback:'That document does not fit the archive index order. The index resets; re-examine the sequence and try again.'},accepted:true,completed:false};
 const classified=[...state.classifiedDocumentIds,documentId];
 const progress=state.classificationProgress+1;
 const complete=progress===definition.classificationSequence.length;
 return {state:{...state,status:complete?'classified':'classification-open',classificationProgress:progress,classifiedDocumentIds:classified,feedback:complete?'The documents align with a hidden historical index. A sealed incident file is released.':`Document classified: ${document.title}. Find the next record type.`},accepted:true,completed:complete};
}
export function revealHistoricalIncident(state:RecordsOfficeState,definition:RecordsOfficeDefinition):RecordsOfficeResult {
 if(state.status!=='classified'||state.historicalEvidenceDiscovered)return {state,accepted:false,completed:false};
 return {state:{...state,status:'historical-discovery',historicalEvidenceDiscovered:true,feedback:'The incident file describes an earlier event at Hollow Creek. The crescent seal appears on an authorization sheet dated years before the missing regulator was moved.'},accepted:true,completed:true};
}
