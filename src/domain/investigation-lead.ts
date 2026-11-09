export type InvestigationLeadStatus = 'hidden' | 'revealed' | 'tracked';

export interface InvestigationLeadDefinition {
  readonly id: string;
  readonly title: string;
  readonly sourceRelicId: string;
  readonly sourceEvidenceId?: string;
  readonly observation: string;
  readonly nextObjective: string;
  readonly locationHint: string;
}

export interface InvestigationLeadState {
  readonly status: InvestigationLeadStatus;
  readonly feedback: string;
}

export function createInvestigationLeadState(): InvestigationLeadState {
  return { status: 'hidden', feedback: '' };
}

export function revealInvestigationLead(
  state: InvestigationLeadState,
  definition: InvestigationLeadDefinition,
  collectedRelicIds: readonly string[]
): InvestigationLeadState {
  if (state.status !== 'hidden') return state;
  if (!collectedRelicIds.includes(definition.sourceRelicId) && (!definition.sourceEvidenceId || !collectedRelicIds.includes(definition.sourceEvidenceId))) return state;
  return {
    status: 'revealed',
    feedback: `New lead uncovered: ${definition.title}`
  };
}

export function trackInvestigationLead(
  state: InvestigationLeadState
): InvestigationLeadState {
  if (state.status !== 'revealed') return state;
  return {
    status: 'tracked',
    feedback: 'Lead added to the active case. Follow the new objective.'
  };
}
