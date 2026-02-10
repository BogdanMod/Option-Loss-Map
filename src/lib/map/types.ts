export type NodeType = 'current' | 'future' | 'merged';

export type Confidence = 'low' | 'medium' | 'high';

export type MapNode = {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  consequence?: string;
  fixation?: string; // Hover-level 2: развёрнутая фиксация необратимости
  severity?: 'low' | 'medium' | 'high';
  irreversibility?: Array<'F' | 'T' | 'O' | 'S'>;
  optionId?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type MapEdgeMetrics = {
  optionLossPct: number; // 0..100
  irreversibilityScore: number; // 0..100
  F: number;
  T: number;
  O: number;
  S: number;
  confidence: Confidence;
  pnrFlag: boolean;
  pnrText?: string;
};

export type MapEdge = {
  id: string;
  source: string;
  target: string;
  optionId: string;
  metrics: MapEdgeMetrics;
  closedFutures: {
    title: string;
    category?: 'strategy' | 'org' | 'budget';
    relatedNodeIds?: string[];
    relatedTags?: string[];
  }[];
  evidence: string[];
};

export type MapSummary = {
  totalFutureStates: number;
  bestForOptionsPreserved: string;
  worstLockIn: string;
};

export type MapModel = {
  nodes: MapNode[];
  edges: MapEdge[];
  summary: MapSummary;
};
