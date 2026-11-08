export interface Clue { readonly id: string; readonly title: string; readonly description: string; }
export interface InvestigationState { readonly discoveredClueIds: readonly string[]; }
export const initialState: InvestigationState = { discoveredClueIds: [] };
export function discoverClue(state: InvestigationState, id: string, clues: readonly Clue[]): InvestigationState {
  if (!clues.some((clue) => clue.id === id) || state.discoveredClueIds.includes(id)) return state;
  return { discoveredClueIds: [...state.discoveredClueIds, id] };
}
