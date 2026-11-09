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
