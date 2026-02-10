export type NodeType = 'current' | 'future' | 'merged';

export type Confidence = 'low' | 'medium' | 'high';

export type MapNode = {
  id: string;
  type: NodeType;
  title: string;
  summary?: string; // Краткое резюме (1 строка)
  detail: string; // Hover-level 2: развёрнутая фиксация (обязательно, 2-4 предложения)
  description?: string; // Legacy: для обратной совместимости
  consequence?: string; // Legacy: для обратной совместимости
  fixation?: string; // Legacy: алиас для detail
  severity?: 'low' | 'medium' | 'high';
  irreversibility?: Array<'F' | 'T' | 'O' | 'S'>;
  optionId?: string;
  tags?: string[];
  signals?: string[]; // Сигналы необратимости (F/T/O/S в текстовом виде)
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
