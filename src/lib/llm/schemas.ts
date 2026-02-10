import { z } from 'zod';

export const ExtractedDecisionSchema = z.object({
  domain: z.string().min(1),
  timeHorizon: z.object({
    value: z.number().nullable(),
    unit: z.enum(['недели', 'месяцы', 'годы']).nullable()
  }),
  actors: z.array(z.string()),
  resources: z.array(z.string()),
  commitments: z.array(z.string()),
  keyConstraints: z.array(z.string()),
  irreversibilitySignals: z.object({
    financial: z.array(z.string()),
    time: z.array(z.string()),
    organizational: z.array(z.string()),
    strategic: z.array(z.string()),
    pnrCandidates: z.array(
      z.object({
        trigger: z.string(),
        why: z.string()
      })
    )
  }),
  evidence: z.array(z.string())
});

export type ExtractedDecision = z.infer<typeof ExtractedDecisionSchema>;

export const FutureStateSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  tags: z.array(
    z.enum([
      'flexibility_high',
      'flexibility_low',
      'vendor_lockin',
      'open_standards',
      'fixed_cost',
      'variable_cost',
      'sunk_cost',
      'low_sunk_cost',
      'org_inertia',
      'hiring_lock',
      'long_timeline',
      'short_timeline',
      'speed_high',
      'speed_low',
      'scope_growth',
      'scope_limit',
      'strategic_closure',
      'strategic_opening',
      'compliance_risk',
      'integration_risk'
    ])
  ),
  category: z.enum(['strategy', 'org', 'budget']),
  evidence: z.array(z.string())
});

export const FutureStateArraySchema = z.array(FutureStateSchema);

export type FutureState = z.infer<typeof FutureStateSchema>;

export const ZerconNodeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  consequence: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  irreversibility: z.array(z.enum(['F', 'T', 'O', 'S'])).optional()
});

export type ZerconNode = z.infer<typeof ZerconNodeSchema>;

export const ExtractedDecisionJsonSchema = {
  name: 'extracted_decision',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      domain: { type: 'string' },
      timeHorizon: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'], enum: ['недели', 'месяцы', 'годы', null] }
        },
        required: ['value', 'unit']
      },
      actors: { type: 'array', items: { type: 'string' } },
      resources: { type: 'array', items: { type: 'string' } },
      commitments: { type: 'array', items: { type: 'string' } },
      keyConstraints: { type: 'array', items: { type: 'string' } },
      irreversibilitySignals: {
        type: 'object',
        additionalProperties: false,
        properties: {
          financial: { type: 'array', items: { type: 'string' } },
          time: { type: 'array', items: { type: 'string' } },
          organizational: { type: 'array', items: { type: 'string' } },
          strategic: { type: 'array', items: { type: 'string' } },
          pnrCandidates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                trigger: { type: 'string' },
                why: { type: 'string' }
              },
              required: ['trigger', 'why']
            }
          }
        },
        required: ['financial', 'time', 'organizational', 'strategic', 'pnrCandidates']
      },
      evidence: { type: 'array', items: { type: 'string' } }
    },
    required: [
      'domain',
      'timeHorizon',
      'actors',
      'resources',
      'commitments',
      'keyConstraints',
      'irreversibilitySignals',
      'evidence'
    ]
  }
} as const;

export const FutureStateArrayJsonSchema = {
  name: 'future_states',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        tags: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'flexibility_high',
              'flexibility_low',
              'vendor_lockin',
              'open_standards',
              'fixed_cost',
              'variable_cost',
              'sunk_cost',
              'low_sunk_cost',
              'org_inertia',
              'hiring_lock',
              'long_timeline',
              'short_timeline',
              'speed_high',
              'speed_low',
              'scope_growth',
              'scope_limit',
              'strategic_closure',
              'strategic_opening',
              'compliance_risk',
              'integration_risk'
            ]
          }
        },
        category: { type: 'string', enum: ['strategy', 'org', 'budget'] },
        evidence: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'subtitle', 'tags', 'category', 'evidence']
    }
  }
} as const;

export const ZerconNodeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  consequence: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  irreversibility: z.array(z.enum(['F', 'T', 'O', 'S'])).optional()
});

export type ZerconNode = z.infer<typeof ZerconNodeSchema>;

export const ZerconNodeJsonSchema = {
  name: 'zercon_node',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      consequence: { type: 'string' },
      severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      irreversibility: { type: 'array', items: { type: 'string', enum: ['F', 'T', 'O', 'S'] } }
    },
    required: ['title', 'description', 'consequence']
  }
} as const;

// ZerCon Rewrite v2: батч-схема
export const ZerconRewriteNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  detail: z.string().min(120), // Минимум 120 символов для hover-level 2
  measureType: z.enum(['time', 'money', 'role', 'process', 'contract']).optional(),
  evidence: z.array(z.string()).default([]), // Якоря из anchors, использованные в detail
  tags: z.array(z.string()).optional(),
  signals: z.array(z.string()).optional()
});

export type ZerconRewriteNode = z.infer<typeof ZerconRewriteNodeSchema>;

export const ZerconRewriteBatchSchema = z.object({
  nodes: z.array(ZerconRewriteNodeSchema).min(1)
});

export type ZerconRewriteBatch = z.infer<typeof ZerconRewriteBatchSchema>;

export const ZerconRewriteBatchJsonSchema = {
  name: 'zercon_rewrite_batch',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            summary: { type: 'string' },
            detail: { type: 'string' },
            measureType: { type: 'string', enum: ['time', 'money', 'role', 'process', 'contract'] },
            evidence: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            signals: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'title', 'detail', 'evidence']
        },
        minItems: 1
      }
    },
    required: ['nodes']
  }
} as const;
