import { describe, expect, it } from 'vitest';
import {
  createInvestigationLeadState,
  revealInvestigationLead,
  trackInvestigationLead,
  type InvestigationLeadDefinition
} from '../src/domain/investigation-lead';

const lead: InvestigationLeadDefinition = {
  id: 'clocktower-service-door',
  title: 'A mark pointing to the clock tower',
  sourceRelicId: 'fountain-relic',
  observation: 'The relic carries a small three-line mark beneath its base.',
  nextObjective: 'Find where the same mark appears elsewhere in Hollow Creek.',
  locationHint: 'Begin with the clock tower service entrance.'
};

describe('relic-triggered investigation lead', () => {
  it('remains hidden until its source relic is collected', () => {
    const initial = createInvestigationLeadState();
    expect(revealInvestigationLead(initial, lead, []).status).toBe('hidden');
  });

  it('reveals the lead when the source relic is collected', () => {
    const result = revealInvestigationLead(createInvestigationLeadState(), lead, ['fountain-relic']);
    expect(result.status).toBe('revealed');
    expect(result.feedback).toContain(lead.title);
  });

  it('does not reveal the same lead more than once', () => {
    const revealed = revealInvestigationLead(createInvestigationLeadState(), lead, ['fountain-relic']);
    expect(revealInvestigationLead(revealed, lead, ['fountain-relic'])).toBe(revealed);
  });

  it('tracks a revealed lead but cannot track a hidden lead', () => {
    const hidden = createInvestigationLeadState();
    expect(trackInvestigationLead(hidden)).toBe(hidden);
    const revealed = revealInvestigationLead(hidden, lead, ['fountain-relic']);
    expect(trackInvestigationLead(revealed).status).toBe('tracked');
  });

  it('does not change a lead already added to the case', () => {
    const tracked = trackInvestigationLead(
      revealInvestigationLead(createInvestigationLeadState(), lead, ['fountain-relic'])
    );
    expect(trackInvestigationLead(tracked)).toBe(tracked);
  });
});

describe('evidence-originated investigation leads', () => {
  it('reveals a follow-up lead when its source evidence is discovered', () => {
    const followUp = { ...relicLead, id: 'message-in-the-wall', sourceRelicId: '', sourceEvidenceId: 'three-line-imprint' };
    const state = createInvestigationLeadState();
    expect(revealInvestigationLead(state, followUp, ['three-line-imprint']).status).toBe('revealed');
  });

  it('does not reveal an evidence-originated lead without its source evidence', () => {
    const followUp = { ...relicLead, id: 'message-in-the-wall', sourceRelicId: '', sourceEvidenceId: 'three-line-imprint' };
    const state = createInvestigationLeadState();
    expect(revealInvestigationLead(state, followUp, []).status).toBe('hidden');
  });
});
