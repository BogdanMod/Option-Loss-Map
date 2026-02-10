import type { DecisionDomain } from './domains';
import { domainTemplates } from './domains';
import type { MapEdge, MapEdgeMetrics, MapModel, MapNode } from './types';
import { extractDecision } from '@/lib/llm/extractDecision';
import type { ExtractedDecision } from '@/lib/llm/schemas';
import { applyZerconLanguage } from '@/lib/llm/zercon';

export type DecisionInput = {
  domain: DecisionDomain;
  title: string;
  currentStateText: string;
  options: { id: string; label: string; description?: string }[];
  constraints: string[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickCount = (base: number, min: number, max: number) => {
  const range = max - min + 1;
  return min + (base % range);
};

const pickTemplates = (optionId: string, templates: typeof domainTemplates[DecisionDomain]) => {
  const hashed = hashString(optionId);
  const count = pickCount(hashed, 5, 7);
  const sorted = [...templates].sort((a, b) => (a.title > b.title ? 1 : -1));
  const start = hashed % sorted.length;
  const picked: typeof templates = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(sorted[(start + i) % sorted.length]);
  }
  return picked;
};

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const tagSimilarity = (a: string[], b: string[]) => {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((tag) => setB.has(tag)).length;
  const maxSize = Math.max(setA.size, setB.size, 1);
  return intersection / maxSize;
};

const dedupeFutureStates = (states: MapNode[]) => {
  const unique: MapNode[] = [];
  states.forEach((state) => {
    const normalized = normalizeTitle(state.title);
    const tags = state.tags ?? [];
    const existingIndex = unique.findIndex((item) => normalizeTitle(item.title) === normalized);
    if (existingIndex !== -1) {
      const existing = unique[existingIndex];
      const prefer = (state.description?.length ?? 0) > (existing.description?.length ?? 0) ? state : existing;
      unique[existingIndex] = prefer;
      return;
    }

    const similarIndex = unique.findIndex((item) => tagSimilarity(tags, item.tags ?? []) >= 0.8);
    if (similarIndex !== -1) {
      const existing = unique[similarIndex];
      const prefer = (state.description?.length ?? 0) > (existing.description?.length ?? 0) ? state : existing;
      unique[similarIndex] = prefer;
      return;
    }

    unique.push(state);
  });
  return unique;
};

const macroGroupSignature = (tags: string[]) => {
  const set = new Set(tags);
  if (set.has('vendor_lockin') || set.has('fixed_cost') || set.has('sunk_cost')) return 'platform_lock';
  if (set.has('org_inertia') || set.has('hiring_lock')) return 'org_inertia';
  if (set.has('strategic_closure')) return 'strategic_closure';
  if (set.has('speed_high') || set.has('short_timeline')) return 'fast_start';
  if (set.has('scope_growth')) return 'scope_growth';
  return 'stabilization';
};

const macroGroupLabel = (signature: string) => {
  switch (signature) {
    case 'platform_lock':
      return 'Платформа становится дорогим якорем';
    case 'org_inertia':
      return 'Согласования начинают съедать скорость';
    case 'strategic_closure':
      return 'Альтернативы закрываются надолго';
    case 'fast_start':
      return 'Быстрый старт оставляет долг';
    case 'scope_growth':
      return 'Объём работ начинает расползаться';
    default:
      return 'Откат становится дорогим';
  }
};

const tagWeights = {
  fixed_cost: { F: 22, T: 6, O: 8, S: 10 },
  sunk_cost: { F: 18, T: 6, O: 6, S: 12 },
  infra_contracts: { F: 24, T: 10, O: 8, S: 12 },
  long_timeline: { F: 6, T: 22, O: 8, S: 8 },
  slow_revert: { F: 8, T: 20, O: 10, S: 10 },
  org_inertia: { F: 6, T: 10, O: 22, S: 10 },
  hiring_lock: { F: 8, T: 10, O: 22, S: 8 },
  process_change: { F: 6, T: 8, O: 18, S: 8 },
  vendor_lockin: { F: 8, T: 8, O: 10, S: 26 },
  strategic_closure: { F: 6, T: 6, O: 8, S: 28 },
  platform_commitment: { F: 8, T: 8, O: 10, S: 22 },
  reversibility_low: { F: 6, T: 10, O: 10, S: 16 }
} as const;

const buildMetricsFromTags = (
  tags: string[],
  optionLossPct: number,
  confidence: MapEdgeMetrics['confidence'],
  pnrFlag: boolean,
  pnrText?: string,
  minScores?: { F?: number; T?: number; O?: number; S?: number }
): MapEdgeMetrics => {
  let F = 10;
  let T = 10;
  let O = 10;
  let S = 10;

  tags.forEach((tag) => {
    const weight = tagWeights[tag as keyof typeof tagWeights];
    if (weight) {
      F += weight.F;
      T += weight.T;
      O += weight.O;
      S += weight.S;
    }
  });

  if (minScores?.F) F = Math.max(F, minScores.F);
  if (minScores?.T) T = Math.max(T, minScores.T);
  if (minScores?.O) O = Math.max(O, minScores.O);
  if (minScores?.S) S = Math.max(S, minScores.S);

  F = clamp(F);
  T = clamp(T);
  O = clamp(O);
  S = clamp(S);

  const irreversibilityScore = clamp(Math.round(F * 0.2 + T * 0.2 + O * 0.25 + S * 0.35));

  return {
    optionLossPct,
    irreversibilityScore,
    F,
    T,
    O,
    S,
    confidence,
    pnrFlag,
    pnrText
  };
};

const determineConfidence = (input: DecisionInput): MapEdgeMetrics['confidence'] => {
  const hasCurrent = input.currentStateText.trim().length > 0;
  const hasConstraints = input.constraints.filter(Boolean).length >= 2;
  const hasDescriptions = input.options.some((option) => option.description && option.description.trim().length > 0);
  if (hasCurrent && (hasConstraints || hasDescriptions)) return 'high';
  if (hasCurrent || hasConstraints) return 'medium';
  return 'low';
};

const buildEvidence = (input: DecisionInput) => {
  const evidence: string[] = [];
  if (input.currentStateText.trim()) {
    evidence.push(`Контекст: ${input.currentStateText}`);
  }
  input.constraints.slice(0, 2).forEach((constraint) => {
    if (constraint.trim()) {
      evidence.push(`Ограничение: ${constraint}`);
    }
  });
  input.options.slice(0, 2).forEach((option) => {
    evidence.push(`Вариант: ${option.label}`);
  });
  return evidence.slice(0, 4);
};

const categorizeClosedFuture = (title: string, tags?: string[]) => {
  const lower = title.toLowerCase();
  if (tags?.some((tag) => tag.includes('org') || tag.includes('hiring'))) return 'org' as const;
  if (tags?.some((tag) => tag.includes('fixed_cost') || tag.includes('infra'))) return 'budget' as const;
  if (lower.includes('бюджет') || lower.includes('капзат') || lower.includes('инфра')) return 'budget' as const;
  if (lower.includes('команда') || lower.includes('процесс') || lower.includes('найм')) return 'org' as const;
  return 'strategy' as const;
};

const tagsFromTitle = (title: string) => {
  const lower = title.toLowerCase();
  const tags: string[] = [];
  if (lower.includes('платформ') || lower.includes('вендор') || lower.includes('контракт')) {
    tags.push('vendor_lockin');
  }
  if (lower.includes('гибк') || lower.includes('манёвр')) {
    tags.push('flexibility_low');
  }
  if (lower.includes('инфраструктур') || lower.includes('капитал') || lower.includes('затрат')) {
    tags.push('fixed_cost');
  }
  if (lower.includes('найм') || lower.includes('команда') || lower.includes('роль')) {
    tags.push('hiring_lock');
  }
  if (lower.includes('срок') || lower.includes('цикл')) {
    tags.push('long_timeline');
  }
  if (lower.includes('стратег')) {
    tags.push('strategic_closure');
  }
  if (lower.includes('масштаб') || lower.includes('расшир')) {
    tags.push('scope_growth');
  }
  return Array.from(new Set(tags));
};

const buildPnr = (input: DecisionInput, tags: string[]) => {
  const textSource = `${input.currentStateText} ${input.constraints.join(' ')}`.toLowerCase();
  const keywordMatch = ['контракт', 'найм', 'инфраструктур', 'штат', '3 года', 'подпис'].some((key) =>
    textSource.includes(key)
  );
  const tagMatch = tags.some((tag) => tag === 'infra_contracts' || tag === 'hiring_lock');
  const pnrFlag = keywordMatch || tagMatch;
  const pnrText = pnrFlag
    ? 'После найма 6+ инженеров и подписания 3‑летних инфраструктурных контрактов'
    : 'Фиксации пока нет, остаётся пространство для отката';
  return { pnrFlag, pnrText };
};

export const lastLLMArtifacts: {
  extracted: ExtractedDecision | null;
} = {
  extracted: null
};

export function buildMapFromDecision(input: DecisionInput): MapModel {
  // Здесь позже будет LLM: генерация вариантов и тегов из текста.
  const domain = input.domain;
  const templates = domainTemplates[domain];
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  const currentNode: MapNode = {
    id: 'current',
    type: 'current',
    title: input.title || 'Текущее состояние',
    description: input.currentStateText,
    detail: input.currentStateText || '', // Будет переписано ZerCon если слабый
    tags: ['current_state']
  };
  nodes.push(currentNode);

  const mergedNodes: MapNode[] = [];
  const mergedByGroup: Record<string, MapNode> = {};

  const optionFutureNodes: Record<string, MapNode[]> = {};

  const mergedCap = 2;
  const perOptionMax = Math.min(
    6,
    Math.max(5, Math.floor((18 - mergedCap) / Math.max(input.options.length, 1)))
  );

  input.options.forEach((option) => {
    const picked = pickTemplates(option.id, templates);
    const rawNodes: MapNode[] = picked.map((template, index) => ({
      id: `${option.id}-future-${index + 1}`,
      type: 'future',
      title: template.title,
      description: template.subtitle,
      detail: template.subtitle || '', // Будет переписано ZerCon если слабый
      optionId: option.id,
      tags: template.tags
    }));
    const optionNodes = dedupeFutureStates(rawNodes).slice(0, perOptionMax);
    optionFutureNodes[option.id] = optionNodes;
    nodes.push(...optionNodes);

    optionNodes.forEach((node) => {
      const signature = macroGroupSignature(node.tags ?? []);
      if (!mergedByGroup[signature]) {
        mergedByGroup[signature] = {
          id: `merged-${signature}`,
          type: 'merged',
          title: macroGroupLabel(signature),
          description: 'Назад дороги почти не остаётся. Любой откат требует времени и денег.',
          detail: 'Назад дороги почти не остаётся. Любой откат требует времени и денег.', // Будет переписано ZerCon если слабый
          tags: ['merge', signature]
        };
      }
    });
  });

  const mergedList = Object.values(mergedByGroup).slice(0, mergedCap);
  mergedNodes.push(...mergedList);
  nodes.push(...mergedNodes);

  const totalFutureStates = new Set(
    nodes.filter((node) => node.type === 'future' || node.type === 'merged').map((node) => node.id)
  ).size;

  const optionReachableCounts: Record<string, number> = {};
  const optionLossMap: Record<string, number> = {};

  input.options.forEach((option) => {
    const futureNodes = optionFutureNodes[option.id] || [];

    const edgeIds = futureNodes.map((node) => `edge-${option.id}-${node.id}`);
    edgeIds.forEach((edgeId, index) => {
      const futureNode = futureNodes[index];
      const signature = macroGroupSignature(futureNode.tags ?? []);
      const mergeTarget = mergedByGroup[signature] ?? mergedNodes[0];
      edges.push({
        id: edgeId,
        source: currentNode.id,
        target: futureNode.id,
        optionId: option.id,
        metrics: {
          optionLossPct: 0,
          irreversibilityScore: 0,
          F: 0,
          T: 0,
          O: 0,
          S: 0,
          confidence: 'medium',
          pnrFlag: false
        },
        closedFutures: [],
        evidence: []
      });

      edges.push({
        id: `edge-${futureNode.id}-${mergeTarget.id}`,
        source: futureNode.id,
        target: mergeTarget.id,
        optionId: option.id,
        metrics: {
          optionLossPct: 0,
          irreversibilityScore: 0,
          F: 0,
          T: 0,
          O: 0,
          S: 0,
          confidence: 'medium',
          pnrFlag: false
        },
        closedFutures: [],
        evidence: []
      });
    });

    const reachable = new Set<string>();
    const adjacency: Record<string, string[]> = {};
    edges
      .filter((edge) => edge.optionId === option.id)
      .forEach((edge) => {
        if (!adjacency[edge.source]) adjacency[edge.source] = [];
        adjacency[edge.source].push(edge.target);
      });

    const queue = ['current'];
    while (queue.length) {
      const current = queue.shift() as string;
      const targets = adjacency[current] ?? [];
      targets.forEach((target) => {
        if (!reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      });
    }

    optionReachableCounts[option.id] = reachable.size;
    optionLossMap[option.id] = clamp(Math.round((1 - reachable.size / totalFutureStates) * 100));
  });

  const confidence = determineConfidence(input);

  input.options.forEach((option) => {
    const futureNodes = optionFutureNodes[option.id] || [];
    const tags = futureNodes.flatMap((node) => node.tags ?? []);
    const { pnrFlag, pnrText } = buildPnr(input, tags);
    const metrics = buildMetricsFromTags(tags, optionLossMap[option.id], confidence, pnrFlag, pnrText);

    const reachable = new Set<string>();
    const adjacency: Record<string, string[]> = {};
    edges
      .filter((edge) => edge.optionId === option.id)
      .forEach((edge) => {
        if (!adjacency[edge.source]) adjacency[edge.source] = [];
        adjacency[edge.source].push(edge.target);
      });

    const queue = ['current'];
    while (queue.length) {
      const current = queue.shift() as string;
      const targets = adjacency[current] ?? [];
      targets.forEach((target) => {
        if (!reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      });
    }

    const closedFutures = nodes
      .filter((node) => node.type === 'future' || node.type === 'merged')
      .filter((node) => !reachable.has(node.id))
      .map((node) => {
        const relatedTags = node.tags && node.tags.length ? node.tags : tagsFromTitle(node.title);
        return {
          title: node.title,
          category: categorizeClosedFuture(node.title, node.tags),
          relatedNodeIds: [node.id],
          relatedTags
        };
      });

    const evidence = buildEvidence(input);

    edges.forEach((edge) => {
      if (edge.optionId === option.id) {
        edge.metrics = metrics;
        edge.closedFutures = closedFutures;
        edge.evidence = evidence;
      }
    });
  });

  const sortedOptions = [...input.options].sort((a, b) => optionLossMap[a.id] - optionLossMap[b.id]);

  return {
    nodes,
    edges,
    summary: {
      totalFutureStates,
      bestForOptionsPreserved: sortedOptions[0]?.id ?? input.options[0]?.id ?? 'A',
      worstLockIn: sortedOptions[sortedOptions.length - 1]?.id ?? input.options[0]?.id ?? 'A'
    }
  };
}

const computeReachable = (edges: MapEdge[], optionId: string) => {
  const reachable = new Set<string>();
  const adjacency: Record<string, string[]> = {};
  edges
    .filter((edge) => edge.optionId === optionId)
    .forEach((edge) => {
      if (!adjacency[edge.source]) adjacency[edge.source] = [];
      adjacency[edge.source].push(edge.target);
    });

  const queue = ['current'];
  while (queue.length) {
    const current = queue.shift() as string;
    const targets = adjacency[current] ?? [];
    targets.forEach((target) => {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    });
  }

  return reachable;
};

const buildEvidenceFromSources = (input: DecisionInput, extracted: ExtractedDecision) => {
  const fromConstraints = input.constraints.map((item) => `Ограничение: ${item}`);
  const pool = [...extracted.evidence, ...fromConstraints];
  const unique = Array.from(new Set(pool.map((item) => item.trim()).filter(Boolean)));
  return unique.slice(0, 4);
};

// Создание Anchor Pack для grounding
export type AnchorPack = {
  decisionTitle: string;
  decisionDescription: string;
  options: Array<{ id: string; label: string; description: string }>;
  constraints: string[];
  actors: string[];
  resources: string[];
  obligations: string[];
  irreversibleSignals: {
    financial: string[];
    time: string[];
    organizational: string[];
    strategic: string[];
  };
  normalizedAnchors: string[]; // Нормализованные ключевые фразы для проверки
};

// Стоп-слова для нормализации
const STOP_WORDS = new Set([
  'и',
  'в',
  'на',
  'с',
  'по',
  'для',
  'от',
  'до',
  'из',
  'к',
  'о',
  'об',
  'при',
  'про',
  'со',
  'то',
  'что',
  'как',
  'так',
  'это',
  'этот',
  'эта',
  'эти',
  'этот',
  'быть',
  'есть',
  'был',
  'была',
  'было',
  'были',
  'стать',
  'становиться',
  'становится'
]);

// Нормализация текста для anchors
function normalizeAnchor(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .filter(Boolean);
}

// Извлечение ключевых фраз (2-3 слова)
function extractKeyPhrases(words: string[]): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  return phrases;
}

export function buildAnchorPack(input: DecisionInput, extracted: ExtractedDecision | null): AnchorPack {
  const anchors: string[] = [];

  // Decision title и description
  if (input.title) {
    anchors.push(input.title);
    const titleWords = normalizeAnchor(input.title);
    anchors.push(...extractKeyPhrases(titleWords));
  }
  if (input.currentStateText) {
    anchors.push(input.currentStateText);
    const descWords = normalizeAnchor(input.currentStateText);
    anchors.push(...extractKeyPhrases(descWords));
  }

  // Options
  input.options.forEach((opt) => {
    if (opt.label) {
      anchors.push(opt.label);
      const labelWords = normalizeAnchor(opt.label);
      anchors.push(...extractKeyPhrases(labelWords));
    }
    if (opt.description) {
      anchors.push(opt.description);
      const descWords = normalizeAnchor(opt.description);
      anchors.push(...extractKeyPhrases(descWords));
    }
  });

  // Constraints
  input.constraints.forEach((constraint) => {
    if (constraint.trim()) {
      anchors.push(constraint);
      const constraintWords = normalizeAnchor(constraint);
      anchors.push(...extractKeyPhrases(constraintWords));
    }
  });

  // Extracted data
  if (extracted) {
    extracted.actors.forEach((actor) => {
      if (actor.trim()) {
        anchors.push(actor);
        const actorWords = normalizeAnchor(actor);
        anchors.push(...extractKeyPhrases(actorWords));
      }
    });
    extracted.resources.forEach((resource) => {
      if (resource.trim()) {
        anchors.push(resource);
        const resourceWords = normalizeAnchor(resource);
        anchors.push(...extractKeyPhrases(resourceWords));
      }
    });
    extracted.commitments.forEach((commitment) => {
      if (commitment.trim()) {
        anchors.push(commitment);
        const commitmentWords = normalizeAnchor(commitment);
        anchors.push(...extractKeyPhrases(commitmentWords));
      }
    });
    [
      ...extracted.irreversibilitySignals.financial,
      ...extracted.irreversibilitySignals.time,
      ...extracted.irreversibilitySignals.organizational,
      ...extracted.irreversibilitySignals.strategic
    ].forEach((signal) => {
      if (signal.trim()) {
        anchors.push(signal);
        const signalWords = normalizeAnchor(signal);
        anchors.push(...extractKeyPhrases(signalWords));
      }
    });
  }

  // Удаляем дубликаты и нормализуем
  const normalizedAnchors = Array.from(
    new Set(
      anchors
        .map((anchor) => anchor.toLowerCase().trim())
        .filter((anchor) => anchor.length > 3)
        .filter((anchor) => !STOP_WORDS.has(anchor))
    )
  ).sort();

  return {
    decisionTitle: input.title,
    decisionDescription: input.currentStateText,
    options: input.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      description: opt.description || ''
    })),
    constraints: input.constraints.filter(Boolean),
    actors: extracted?.actors || [],
    resources: extracted?.resources || [],
    obligations: extracted?.commitments || [],
    irreversibleSignals: extracted
      ? {
          financial: extracted.irreversibilitySignals.financial,
          time: extracted.irreversibilitySignals.time,
          organizational: extracted.irreversibilitySignals.organizational,
          strategic: extracted.irreversibilitySignals.strategic
        }
      : {
          financial: [],
          time: [],
          organizational: [],
          strategic: []
        },
    normalizedAnchors
  };
}

export async function buildMapFromDecisionLLM(
  input: DecisionInput
): Promise<{ map: MapModel; extracted: ExtractedDecision | null; llmUsed: boolean }> {
  try {
    const extracted = await extractDecision(input);
    lastLLMArtifacts.extracted = extracted;

    const baseMap = buildMapFromDecision(input);

    const minScores = {
      F: extracted.irreversibilitySignals.financial.length ? 55 : undefined,
      T: extracted.irreversibilitySignals.time.length ? 55 : undefined,
      O: extracted.irreversibilitySignals.organizational.length ? 55 : undefined,
      S: extracted.irreversibilitySignals.strategic.length ? 55 : undefined
    };

    const pnrCandidate = extracted.irreversibilitySignals.pnrCandidates.find((item) => item.trigger);
    const pnrFromExtracted = pnrCandidate ? { pnrFlag: true, pnrText: pnrCandidate.trigger } : null;
    const evidence = buildEvidenceFromSources(input, extracted);

    const optionTags: Record<string, string[]> = {};
    baseMap.nodes.forEach((node) => {
      if (node.type === 'future' && node.optionId) {
        optionTags[node.optionId] = [...(optionTags[node.optionId] ?? []), ...(node.tags ?? [])];
      }
    });

    baseMap.edges.forEach((edge) => {
      const tags = optionTags[edge.optionId] ?? [];
      const { pnrFlag, pnrText } = pnrFromExtracted ?? buildPnr(input, tags);
      const metrics = buildMetricsFromTags(
        tags,
        edge.metrics.optionLossPct,
        edge.metrics.confidence,
        pnrFlag,
        pnrText,
        minScores
      );

      edge.metrics = metrics;
      edge.evidence = evidence;
    });

    const anchorPack = buildAnchorPack(input, extracted);
    const enriched = await applyZerconLanguage(baseMap, input.title, input.currentStateText, input, extracted, anchorPack);
    return { map: enriched, extracted, llmUsed: true };
  } catch (error) {
    console.error('buildMapFromDecisionLLM fallback:', error);
    lastLLMArtifacts.extracted = null;
    return { map: buildMapFromDecision(input), extracted: null, llmUsed: false };
  }
}
