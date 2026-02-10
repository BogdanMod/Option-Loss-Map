import { z } from 'zod';

const NodeTypeSchema = z.enum(['current', 'future', 'merged']);
const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const MapNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  consequence: z.string().optional(),
  fixation: z.string().optional(), // Hover-level 2: развёрнутая фиксация необратимости
  severity: z.enum(['low', 'medium', 'high']).optional(),
  irreversibility: z.array(z.enum(['F', 'T', 'O', 'S'])).optional(),
  optionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional()
});

export const MapEdgeMetricsSchema = z.object({
  optionLossPct: z.number().min(0).max(100),
  irreversibilityScore: z.number().min(0).max(100),
  F: z.number().min(0).max(100),
  T: z.number().min(0).max(100),
  O: z.number().min(0).max(100),
  S: z.number().min(0).max(100),
  confidence: ConfidenceSchema,
  pnrFlag: z.boolean(),
  pnrText: z.string().optional()
});

export const MapEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  optionId: z.string().min(1),
  metrics: MapEdgeMetricsSchema,
  closedFutures: z
    .array(
      z.object({
        title: z.string().min(1),
        category: z.enum(['strategy', 'org', 'budget']).optional(),
        relatedNodeIds: z.array(z.string()).optional(),
        relatedTags: z.array(z.string()).optional()
      })
    )
    .default([]),
  evidence: z.array(z.string().min(1)).default([])
});

export const MapSummarySchema = z.object({
  totalFutureStates: z.number().min(0),
  bestForOptionsPreserved: z.string().min(1),
  worstLockIn: z.string().min(1)
});

export const MapModelSchema = z.object({
  nodes: z.array(MapNodeSchema).min(1),
  edges: z.array(MapEdgeSchema).min(1),
  summary: MapSummarySchema
});

export type MapModelSchemaType = z.infer<typeof MapModelSchema>;
