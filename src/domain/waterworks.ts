export type WaterworksStatus='locked'|'available'|'searched'|'mechanism-damaged'|'timeline-open'|'incident-reconstructed';
export interface WaterworksDefinition { readonly id:string; readonly requiredLeadId:string; readonly timingMechanismEvidenceId:string; readonly witnessEvidenceId:string; readonly stopTime:'11:17'; readonly timelineSequence:readonly string[]; readonly historicalLinkEvidenceId:string; }
export interface WaterworksState { readonly status:WaterworksStatus; readonly searchedObjectIds:readonly string[]; readonly discoveredEvidenceIds:readonly string[]; readonly timingMechanismRecovered:boolean; readonly timelineProgress:number; readonly reconstructedEvents:readonly string[]; readonly historicalLinkDiscovered:boolean; readonly feedback:string; }
export interface WaterworksResult { readonly state:WaterworksState; readonly accepted:boolean; readonly completed:boolean; }
export function createWaterworksState(definition:WaterworksDefinition,trackedLeadIds:readonly string[]=[]):WaterworksState {
 const unlocked=trackedLeadIds.includes(definition.requiredLeadId);
 return {status:unlocked?'available':'locked',searchedObjectIds:[],discoveredEvidenceIds:[],timingMechanismRecovered:false,timelineProgress:0,reconstructedEvents:[],historicalLinkDiscovered:false,feedback:unlocked?'The old waterworks is accessible. Search the control room, channels and maintenance bench.':'Track the earlier-incident lead to unlock the old waterworks.'};
}
export function searchWaterworksObject(state:WaterworksState,definition:WaterworksDefinition,objectId:string):WaterworksResult {
 if(state.status!=='available'||state.searchedObjectIds.includes(objectId)||!['control-room','water-channel','maintenance-bench'].includes(objectId))return {state,accepted:false,completed:false};
 const searched=[...state.searchedObjectIds,objectId];
 const evidence=objectId==='control-room'?['incident-log','clock-stop-record']:objectId==='water-channel'?['witness-sound-trace']:['damaged-timing-mechanism',definition.timingMechanismEvidenceId];
 const discovered=[...new Set([...state.discoveredEvidenceIds,...evidence])];
 const allSearched=['control-room','water-channel','maintenance-bench'].every(id=>searched.includes(id));
 return {state:{...state,status:allSearched?'searched':'available',searchedObjectIds:searched,discoveredEvidenceIds:discovered,timingMechanismRecovered:discovered.includes(definition.timingMechanismEvidenceId),feedback:allSearched?'All three areas have been searched. The damaged timing mechanism can be examined against the witness statement and the 11:17 clock stop.':objectId==='control-room'?'The control room log records a pressure failure shortly before 11:17.':objectId==='water-channel'?'A witness trace suggests three bell-like impacts travelled through the water channel.':'A damaged timing mechanism is found on the maintenance bench.'},accepted:true,completed:allSearched};
}
export function beginWaterworksTimeline(state:WaterworksState,definition:WaterworksDefinition):WaterworksResult {
 if(state.status!=='searched'||!state.discoveredEvidenceIds.includes(definition.witnessEvidenceId)||!state.timingMechanismRecovered)return {state,accepted:false,completed:false};
 return {state:{...state,status:'timeline-open',feedback:'Reconstruct the incident: pressure failure, three channel impacts, then the clock stops at 11:17.'},accepted:true,completed:false};
}
export function placeWaterworksTimelineEvent(state:WaterworksState,definition:WaterworksDefinition,eventId:string):WaterworksResult {
 if(state.status!=='timeline-open'||state.reconstructedEvents.includes(eventId)||!definition.timelineSequence.includes(eventId))return {state,accepted:false,completed:false};
 const expected=definition.timelineSequence[state.timelineProgress];
 if(eventId!==expected)return {state:{...state,timelineProgress:0,reconstructedEvents:[],feedback:'The sequence conflicts with the witness and timing evidence. The timeline has been cleared; try again.'},accepted:true,completed:false};
 const events=[...state.reconstructedEvents,eventId];
 const progress=state.timelineProgress+1;
 const complete=progress===definition.timelineSequence.length;
 return {state:{...state,status:complete?'incident-reconstructed':'timeline-open',timelineProgress:progress,reconstructedEvents:events,feedback:complete?'The timeline is reconstructed. The mechanism stopped at 11:17 after the channel impacts, matching the old incident record.':'Event placed. Continue reconstructing the sequence.'},accepted:true,completed:complete};
}
export function revealWaterworksHistoricalLink(state:WaterworksState,definition:WaterworksDefinition):WaterworksResult {
 if(state.status!=='incident-reconstructed'||state.historicalLinkDiscovered)return {state,accepted:false,completed:false};
 return {state:{...state,historicalLinkDiscovered:true,discoveredEvidenceIds:[...state.discoveredEvidenceIds,definition.historicalLinkEvidenceId],feedback:'The damaged mechanism carries the same internal crescent notch as the regulator assembly. The old incident and the current disappearance used the same modified mechanism design.'},accepted:true,completed:true};
}
