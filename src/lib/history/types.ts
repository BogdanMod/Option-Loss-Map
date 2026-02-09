import type { DecisionInput } from '@/lib/map/engine';
import type { MapModel } from '@/lib/map/types';

export type DecisionRecord = {
  id: string;
  anonUserId?: string;
  createdAt: number;
  title: string;
  domain: string;
  input: DecisionInput;
  map: MapModel;
  summary: {
    optionLossPctByOption: Record<string, number>;
    irreversibilityByOption: Record<string, number>;
    pnrByOption: Record<string, boolean>;
    topTagsByOption: Record<string, string[]>;
  };
  notes?: string;
};
