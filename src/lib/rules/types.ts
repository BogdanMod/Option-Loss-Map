export type HiddenRule = {
  id: string;
  title: string;
  description: string;
  evidence: {
    records: { recordId: string; title: string; when: number; optionId?: string }[];
    indicators: string[];
    examples: string[];
  };
  impact: {
    avgOptionLossPct: number;
    avgIrreversibility: number;
    pnrRate: number;
  };
  confidence: 'Низкая' | 'Средняя' | 'Высокая';
  tags: string[];
};

export type HiddenRuleReport = {
  generatedAt: number;
  totalRecords: number;
  rules: HiddenRule[];
  meta: {
    topTagsOverall: { tag: string; count: number }[];
    avgOptionLossOverall: number;
    avgIrreversibilityOverall: number;
    pnrOverallRate: number;
  };
};
