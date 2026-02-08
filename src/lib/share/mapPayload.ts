import type { MapModel } from '@/lib/map/types';

export type MapSharePayload = {
  title: string;
  context: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
  summary: {
    optionLossPct: number;
    pnrFlag: boolean;
    pnrText?: string;
    mainEffect: string;
    totalFutureStates: number;
  };
  map: MapModel;
  highlightIds: { nodeIds: string[]; edgeIds: string[] };
  generatedAt: number;
};

