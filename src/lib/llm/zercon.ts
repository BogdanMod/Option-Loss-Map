import { callLLMJson } from './client';
import {
  ZerconRewriteBatchJsonSchema,
  ZerconRewriteBatchSchema,
  type ZerconRewriteBatch,
  type ZerconRewriteNode
} from './schemas';
import type { MapModel, MapNode } from '@/lib/map/types';
import type { DecisionInput, AnchorPack } from '@/lib/map/engine';
import type { ExtractedDecision } from './schemas';
import { buildZerconRewritePromptV2 } from './prompts';

const ABSTRACT_WORDS = [
  'улучшение',
  'развитие',
  'оптимизация',
  'стабилизация',
  'усиление',
  'ускорение',
  'эффективность',
  'прогресс',
  'качество',
  'масштабирование'
];

// Маркеры измеримости (обязательны в detail)
const MEASURABILITY_MARKERS = {
  time: [
    /через\s+\d+[–-]\d+\s+(недел|месяц|год)/i,
    /в\s+течение\s+\d+\s+(недел|месяц|год)/i,
    /через\s+полгода/i,
    /через\s+\d+\s+месяц/i,
    /откат\s+займ[ёе]т\s+(недел|месяц|год)/i,
    /со\s+временем/i,
    /месяц/i,
    /недел/i,
    /год/i,
    /\d+\s+(недел|месяц|год)/
  ],
  money: [
    /ежемесячн/i,
    /фиксированн/i,
    /обязательств/i,
    /стоимость/i,
    /дорог/i,
    /расход/i,
    /бюджет/i,
    /денег/i,
    /затрат/i
  ],
  people: [
    /\+?\d+\s+(рол|человек|сотрудник)/i,
    /ожидание\s+загрузки/i,
    /требует\s+вовлечения/i,
    /зависимость\s+от/i,
    /конкретн/i,
    /люд/i,
    /команд/i,
    /руководител/i
  ],
  processes: [
    /согласован/i,
    /процесс/i,
    /изменен/i,
    /мгновенн/i,
    /решен/i,
    /проход/i
  ],
  contracts: [
    /долгосрочн/i,
    /обязательств/i,
    /контракт/i,
    /обещан/i,
    /отмен/i,
    /устойчив/i
  ]
};

// Проверка наличия маркеров измеримости в тексте
function hasMeasurabilityMarkers(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const category of Object.values(MEASURABILITY_MARKERS)) {
    for (const pattern of category) {
      if (pattern.test(lowerText)) {
        return true;
      }
    }
  }
  return false;
}

// Weakness scoring: определяет, нужно ли переписывать узел
export function isNodeWeak(node: MapNode): boolean {
  const title = node.title.trim();
  const detail = node.detail?.trim() || node.fixation?.trim() || '';
  const summary = node.summary?.trim() || '';

  // Title слишком короткий
  if (title.length < 12) return true;

  // Title содержит абстрактные слова
  const titleLower = title.toLowerCase();
  if (ABSTRACT_WORDS.some((word) => titleLower.includes(word))) return true;

  // Detail отсутствует или слишком короткий
  if (detail.length < 120) return true;

  // ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: detail должен содержать маркеры измеримости
  if (!hasMeasurabilityMarkers(detail)) return true;

  // Summary отсутствует И title слишком общий
  if (!summary && title.length < 20) return true;

  return false;
}

// Генерация fallback detail из доступного контекста с обязательными маркерами измеримости
function generateFallbackDetail(node: MapNode, context: { title: string; currentState: string }): string {
  const parts: string[] = [];

  // Используем description или consequence если есть
  if (node.description) {
    parts.push(node.description);
  }
  if (node.consequence) {
    parts.push(node.consequence);
  }

  // Добавляем информацию из tags с маркерами измеримости
  if (node.tags && node.tags.length > 0) {
    const tagDescriptions: Record<string, string> = {
      fixed_cost: 'Появляются фиксированные ежемесячные расходы, которые нельзя просто выключить.',
      vendor_lockin: 'Зависимость от конкретного поставщика делает смену решения дорогой — откат займёт месяцы и потребует дополнительных затрат.',
      org_inertia: 'Организационные процессы закрепляются и требуют времени на изменение — через 2–3 месяца откат становится сложным.',
      strategic_closure: 'Направление фиксируется, альтернативы становятся недоступными. Изменение курса потребует времени и ресурсов.',
      long_timeline: 'Сроки растягиваются на месяцы, откат требует времени и дополнительных затрат.',
      sunk_cost: 'Вложенные средства делают изменение направления дорогим — через полгода откат становится почти невозможным.',
      hiring_lock: 'Появляется постоянная роль, которая требует загрузки и внимания руководителя.',
      short_timeline: 'Сроки становятся жёсткими, каждое изменение требует согласований и задерживает процесс.'
    };

    const relevantTag = node.tags.find((tag) => tagDescriptions[tag]);
    if (relevantTag && !parts.some((p) => p.includes(tagDescriptions[relevantTag]))) {
      parts.push(tagDescriptions[relevantTag]);
    }
  }

  // Если всё ещё недостаточно, добавляем общее описание с маркерами измеримости
  if (parts.length < 2 || !hasMeasurabilityMarkers(parts.join(' '))) {
    const measurabilityParts = [
      'Решение фиксирует текущее направление и делает откат сложным.',
      'Изменение потребует времени (2–4 недели минимум), дополнительных затрат и перестройки процессов.',
      'Через несколько месяцев откат становится дорогим и требует вовлечения команды.'
    ];
    parts.push(...measurabilityParts);
  }

  const result = parts.slice(0, 3).join(' ').trim();
  
  // Гарантируем наличие маркеров измеримости
  if (!hasMeasurabilityMarkers(result)) {
    return `${result} Откат займёт время и потребует дополнительных ресурсов.`;
  }

  return result;
}

// Валидация узла после переписывания
export function validateZerconNodeText(node: MapNode): { valid: boolean; needsFallback: boolean } {
  const detail = node.detail?.trim() || '';
  const title = node.title?.trim() || '';

  if (!title || title.length < 3) {
    return { valid: false, needsFallback: true };
  }

  if (!detail || detail.length < 120) {
    return { valid: false, needsFallback: true };
  }

  // ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: detail должен содержать маркеры измеримости
  if (!hasMeasurabilityMarkers(detail)) {
    return { valid: false, needsFallback: true };
  }

  return { valid: true, needsFallback: false };
}

// Генерация кэш-ключа для батча (включает originalTitle+originalDetail+decisionTitle+variantLabel+nodeKind)
function generateCacheKey(
  nodeIds: string[],
  originalTexts: string[],
  extractedHash: string,
  decisionTitle: string,
  variantLabels: string[],
  nodeKinds: string[],
  version: string = 'zercon_v2_grounded'
): string {
  const ids = nodeIds.sort().join('|');
  const texts = originalTexts.join('||');
  const variants = variantLabels.sort().join('|');
  const kinds = nodeKinds.sort().join('|');
  return `${version}::${extractedHash}::${decisionTitle}::${variants}::${kinds}::${ids}::${texts}`;
}

// Простой хэш для extracted (для кэша)
function hashExtracted(extracted: ExtractedDecision | null): string {
  if (!extracted) return 'no-extracted';
  const key = [
    extracted.domain,
    extracted.actors.join(','),
    extracted.resources.join(','),
    extracted.commitments.join(',')
  ].join('::');
  // Простой хэш
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const cache = new Map<string, ZerconRewriteBatch>();

// Нормализация текста для overlap проверки
const STOP_WORDS_OVERLAP = new Set([
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
  'быть',
  'есть',
  'был',
  'была',
  'было',
  'были',
  'стать',
  'становиться',
  'становится',
  'не',
  'нет',
  'без',
  'или',
  'а',
  'но',
  'же',
  'ли',
  'уже',
  'ещё',
  'еще',
  'все',
  'всё',
  'всего',
  'всего',
  'только',
  'можно',
  'нужно',
  'должен',
  'должна',
  'должно',
  'должны'
]);

function extractSignificantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS_OVERLAP.has(word))
      .filter(Boolean)
  );
}

// Hard guard: проверка overlap для защиты от галлюцинаций
export function calculateOverlapRatio(
  responseText: string,
  allowedTokens: Set<string>
): number {
  const responseTokens = extractSignificantTokens(responseText);
  if (responseTokens.size === 0) return 0;

  let matches = 0;
  responseTokens.forEach((token) => {
    // Проверяем точное совпадение
    if (allowedTokens.has(token)) {
      matches += 1;
      return;
    }
    // Проверяем частичное совпадение (токен содержит или содержится в allowed)
    for (const allowed of allowedTokens) {
      if (token.includes(allowed) || allowed.includes(token)) {
        matches += 1;
        return;
      }
    }
  });

  return matches / responseTokens.size;
}

// Проверка релевантности узла: считает overlap между evidence и anchors
function calculateRelevanceScore(
  evidence: string[],
  detail: string,
  anchors: string[]
): { score: number; hasMeasurability: boolean; anchorMatches: string[] } {
  const detailLower = detail.toLowerCase();
  const anchorMatches: string[] = [];
  let anchorScore = 0;

  // Проверяем, какие anchors встречаются в evidence или detail
  anchors.forEach((anchor) => {
    const anchorLower = anchor.toLowerCase();
    // Проверяем в evidence
    if (evidence.some((ev) => ev.toLowerCase().includes(anchorLower) || anchorLower.includes(ev.toLowerCase()))) {
      anchorMatches.push(anchor);
      anchorScore += 1;
    }
    // Проверяем в detail (более мягкая проверка)
    else if (detailLower.includes(anchorLower) || anchorLower.split(/\s+/).some((word) => detailLower.includes(word))) {
      anchorMatches.push(anchor);
      anchorScore += 0.5;
    }
  });

  // Проверяем маркеры измеримости
  const hasMeasurability = hasMeasurabilityMarkers(detail);

  // Минимум 2 anchor должны быть использованы
  const anchorRequirementMet = anchorScore >= 2;

  // Итоговый score: anchor matches (0-1) + measurability (0-1)
  const score = (anchorRequirementMet ? 1 : anchorScore / 2) + (hasMeasurability ? 1 : 0);

  return { score, hasMeasurability, anchorMatches };
}

// Применение ZerCon Rewrite v2 к батчу узлов (строгий перефразер с hard guard)
async function applyZerconRewriteBatch(
  nodes: MapNode[],
  context: {
    decisionTitle: string;
    decisionDomain: string;
    currentState: string;
    constraints: string[];
    options: DecisionInput['options'];
    extracted: ExtractedDecision | null;
    anchorPack: AnchorPack;
  },
  strictMode: boolean = false
): Promise<Map<string, ZerconRewriteNode>> {
  const extractedHash = hashExtracted(context.extracted);
  const nodeIds = nodes.map((n) => n.id);
  const originalTexts = nodes.map((n) => `${n.title}::${n.detail || n.fixation || n.description || ''}`);
  const variantLabels = nodes
    .map((n) => {
      const opt = context.options.find((o) => o.id === n.optionId);
      return opt?.label || '';
    })
    .filter(Boolean);
  const nodeKinds = nodes.map((n) => n.type || 'unknown');
  const cacheKey = generateCacheKey(
    nodeIds,
    originalTexts,
    extractedHash,
    context.decisionTitle,
    variantLabels,
    nodeKinds
  );

  // Проверка кэша
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    const result = new Map<string, ZerconRewriteNode>();
    cached.nodes.forEach((node) => {
      result.set(node.id, node);
    });
    return result;
  }

  // Собираем allowed tokens для hard guard
  const allowedTexts = [
    context.decisionTitle,
    context.currentState,
    ...context.constraints,
    ...context.options.map((o) => `${o.label} ${o.description || ''}`).filter(Boolean),
    ...(context.extracted?.actors || []),
    ...(context.extracted?.resources || []),
    ...(context.extracted?.commitments || []),
    ...(context.anchorPack.normalizedAnchors || [])
  ].filter(Boolean);
  const allowedTokens = new Set<string>();
  allowedTexts.forEach((text) => {
    const tokens = extractSignificantTokens(text);
    tokens.forEach((token) => allowedTokens.add(token));
  });

  try {
    const prompt = buildZerconRewritePromptV2(nodes, context, strictMode);
    const systemPrompt = strictMode
      ? 'СТРОГИЙ РЕЖИМ: Используй ТОЛЬКО слова и фразы из anchors. НЕ придумывай новые сущности. Каждый detail ОБЯЗАН содержать минимум 2 якоря из anchors и 1 маркер измеримости. Если якорей недостаточно, верни detail: "Нужны данные: <какие именно>".'
      : 'Ты — аналитическая система ZerCon. Переписываешь последствия решений в операционном, конкретном виде. Запрещены абстракции, консультантский язык, общие слова без последствий. НЕЛЬЗЯ придумывать новые домены/сущности ("пакеты", "сегменты", "поддержка", "рынок", "клиенты", "продажи", "маркетинг") если их нет в anchors. Каждый узел ОБЯЗАН содержать: title (3–6 слов, конкретная фиксация), detail (2–4 предложения: что фиксируется, почему откат дорог, что закрывается). Detail ДОЛЖЕН содержать минимум 2 якоря из anchors (точные слова/фразы или очевидные парафразы) и 1 маркер измеримости. КРИТИЧЕСКИ ВАЖНО: detail ДОЛЖЕН содержать хотя бы ОДИН явный маркер измеримости (время: "через 2–4 недели", деньги: "ежемесячные расходы", люди: "+1 роль", процессы: "согласования", контракты: "обязательства"). БЕЗ МАРКЕРА ИЗМЕРИМОСТИ УЗЕЛ НЕДОПУСТИМ!';

    const result = await callLLMJson<ZerconRewriteBatch>({
      system: systemPrompt,
      user: prompt,
      schema: ZerconRewriteBatchJsonSchema
    });

    const parsed = ZerconRewriteBatchSchema.parse(result);

    // Hard guard: проверка релевантности для каждого узла
    const validatedNodes: ZerconRewriteNode[] = [];
    const nodesNeedingFallback: MapNode[] = [];

    parsed.nodes.forEach((rewrittenNode) => {
      const originalNode = nodes.find((n) => n.id === rewrittenNode.id);
      if (!originalNode) {
        validatedNodes.push(rewrittenNode);
        return;
      }

      // Проверяем relevance_score и uncertainty из ответа LLM
      const llmRelevanceScore = rewrittenNode.relevance_score ?? 0;
      const llmUncertainty = rewrittenNode.uncertainty ?? 'high';

      // Проверяем overlap ratio (hard guard)
      const combinedText = `${rewrittenNode.title} ${rewrittenNode.detail}`;
      const overlapRatio = calculateOverlapRatio(combinedText, allowedTokens);

      // Проверяем маркер измеримости
      const hasMeasurability = hasMeasurabilityMarkers(rewrittenNode.detail);

      // Критерии отклонения:
      // - relevance_score < 0.6 ИЛИ uncertainty == "high" ИЛИ overlap_ratio < 0.18
      const shouldReject =
        llmRelevanceScore < 0.6 ||
        llmUncertainty === 'high' ||
        overlapRatio < 0.18 ||
        !hasMeasurability;

      if (shouldReject) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[ZerCon] Node ${rewrittenNode.id} rejected: relevance=${llmRelevanceScore}, uncertainty=${llmUncertainty}, overlap=${overlapRatio.toFixed(2)}, hasMeasurability=${hasMeasurability}`
          );
        }
        nodesNeedingFallback.push(originalNode);
      } else {
        validatedNodes.push(rewrittenNode);
      }
    });

    // Для отклонённых узлов используем fallback
    nodesNeedingFallback.forEach((node) => {
      const fallback = generateSafeFallbackDetail(node, context.anchorPack, {
        title: context.decisionTitle,
        currentState: context.currentState
      });
      // Добавляем measurable_marker в конец detail, если его нет
      const detailWithMarker = fallback.detail + (fallback.detail.includes(fallback.measureType) ? '' : ` (${fallback.measureType})`);
      validatedNodes.push({
        id: node.id,
        title: node.title, // Сохраняем оригинальный title
        detail: detailWithMarker,
        measurable_marker: `через 4–12 недель`, // Нейтральный маркер
        relevance_score: 0.5,
        uncertainty: 'high',
        notes: 'Fallback: низкая релевантность LLM ответа',
        measureType: fallback.measureType,
        evidence: fallback.evidence,
        tags: node.tags,
        signals: node.signals
      });
    });

    // Обновляем кэш только если все узлы прошли валидацию
    if (nodesNeedingFallback.length === 0 && !strictMode) {
      cache.set(cacheKey, { nodes: validatedNodes });
    }

    const resultMap = new Map<string, ZerconRewriteNode>();
    validatedNodes.forEach((node) => {
      resultMap.set(node.id, node);
    });

    return resultMap;
  } catch (error) {
    console.error('ZerCon Rewrite v2 batch error:', error);
    throw error;
  }
}

// Безопасный rule-based fallback с anchors
function generateSafeFallbackDetail(
  node: MapNode,
  anchorPack: AnchorPack,
  context: { title: string; currentState: string }
): { detail: string; measureType: 'time' | 'money' | 'role' | 'process' | 'contract'; evidence: string[] } {
  const evidence: string[] = [];
  const parts: string[] = [];

  // Используем anchors из decision
  if (anchorPack.decisionTitle) {
    evidence.push(anchorPack.decisionTitle);
    parts.push(`Фиксация: ${anchorPack.decisionTitle}.`);
  }

  // Используем anchors из options
  if (node.optionId) {
    const option = anchorPack.options.find((opt) => opt.id === node.optionId);
    if (option) {
      evidence.push(option.label);
      parts.push(`Изменение: ${option.label}.`);
    }
  }

  // Используем anchors из constraints
  if (anchorPack.constraints.length > 0) {
    const constraint = anchorPack.constraints[0];
    evidence.push(constraint);
    parts.push(`Ограничение: ${constraint}.`);
  }

  // Добавляем маркер измеримости на основе tags
  let measureType: 'time' | 'money' | 'role' | 'process' | 'contract' = 'time';
  if (node.tags?.includes('fixed_cost') || node.tags?.includes('sunk_cost')) {
    measureType = 'money';
    parts.push('Маркер: постоянные ежемесячные расходы.');
  } else if (node.tags?.includes('hiring_lock') || node.tags?.includes('org_inertia')) {
    measureType = 'role';
    parts.push('Маркер: +1 постоянная роль, требует внимания руководителя.');
  } else if (node.tags?.includes('long_timeline') || node.tags?.includes('short_timeline')) {
    measureType = 'time';
    parts.push('Маркер: через 2–4 недели откат становится сложным.');
  } else {
    measureType = 'time';
    parts.push('Маркер: через несколько месяцев откат требует времени и ресурсов.');
  }

  const detail = parts.join(' ').trim();
  return { detail, measureType, evidence: Array.from(new Set(evidence)) };
}

// Основная функция: ZerCon Rewrite v2 с батчами
export async function applyZerconLanguage(
  graph: MapModel,
  inputTitle: string,
  inputContext: string,
  input?: DecisionInput,
  extracted?: ExtractedDecision | null,
  anchorPack?: AnchorPack
): Promise<MapModel> {
  // Собираем узлы для переписывания (слабые узлы + опционально current)
  const nodesToRewrite: MapNode[] = [];
  const nodeMap = new Map<string, MapNode>();

  graph.nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    const isWeak = isNodeWeak(node);
    const isCurrent = node.type === 'current';

    // НЕ переписываем current node (как указано в требованиях)
    if (isCurrent) {
      // Пропускаем current node
      return;
    }

    // Для future/merged переписываем если слабый
    if (isWeak) {
      nodesToRewrite.push(node);
    }
  });

  // Убеждаемся, что все узлы имеют detail (для hover-level 2)
  const ensureDetail = (node: MapNode): MapNode => {
    if (!node.detail && !node.fixation) {
      const fallbackDetail = generateFallbackDetail(node, {
        title: inputTitle,
        currentState: inputContext
      });
      return {
        ...node,
        detail: fallbackDetail,
        fixation: fallbackDetail // Legacy alias
      };
    }
    // Если есть fixation но нет detail, копируем
    if (!node.detail && node.fixation) {
      return {
        ...node,
        detail: node.fixation
      };
    }
    return node;
  };

  if (nodesToRewrite.length === 0) {
    // Если нет узлов для переписывания, но нужно добавить detail для hover-level 2
    const enrichedNodes = graph.nodes.map(ensureDetail);
    return { ...graph, nodes: enrichedNodes };
  }

  // Разбиваем на батчи по 10-20 узлов
  const BATCH_SIZE = 15;
  const batches: MapNode[][] = [];
  for (let i = 0; i < nodesToRewrite.length; i += BATCH_SIZE) {
    batches.push(nodesToRewrite.slice(i, i + BATCH_SIZE));
  }

  // Контекст для промпта
  const defaultAnchorPack: AnchorPack = anchorPack || {
    decisionTitle: inputTitle,
    decisionDescription: inputContext,
    options: (input?.options || []).map((opt) => ({
      id: opt.id,
      label: opt.label,
      description: opt.description || ''
    })),
    constraints: input?.constraints || [],
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
    normalizedAnchors: []
  };

  const context = {
    decisionTitle: inputTitle,
    decisionDomain: input?.domain || 'unknown',
    currentState: inputContext,
    constraints: input?.constraints || [],
    options: input?.options || [],
    extracted: extracted || null,
    anchorPack: defaultAnchorPack
  };

  const RELEVANCE_THRESHOLD = 1.5; // Минимум: 1 anchor match + 1 measurability

  // Обрабатываем батчи с проверкой релевантности и retry
  const rewriteResults = new Map<string, ZerconRewriteNode>();
  for (const batch of batches) {
    try {
      let batchResults = await applyZerconRewriteBatch(batch, context, false);

      // Проверка релевантности для каждого узла
      const nodesNeedingRetry: MapNode[] = [];
      batchResults.forEach((result, id) => {
        const originalNode = batch.find((n) => n.id === id);
        if (!originalNode) return;

        const relevance = calculateRelevanceScore(
          result.evidence || [],
          result.detail,
          defaultAnchorPack.normalizedAnchors
        );

        // Диагностика в dev режиме
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ZerCon] Node ${id}:`, {
            relevanceScore: relevance.score,
            hasMeasurability: relevance.hasMeasurability,
            anchorMatches: relevance.anchorMatches.length,
            evidence: result.evidence,
            measureType: result.measureType
          });
        }

        // Если релевантность низкая или evidence пустой — нужен retry
        if (relevance.score < RELEVANCE_THRESHOLD || (result.evidence || []).length < 2) {
          nodesNeedingRetry.push(originalNode);
        } else {
          rewriteResults.set(id, result);
        }
      });

      // Retry для узлов с низкой релевантностью
      if (nodesNeedingRetry.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[ZerCon] Retrying ${nodesNeedingRetry.length} nodes in STRICT MODE`);
        }
        try {
          const retryResults = await applyZerconRewriteBatch(nodesNeedingRetry, context, true);
          retryResults.forEach((result, id) => {
            const relevance = calculateRelevanceScore(
              result.evidence || [],
              result.detail,
              defaultAnchorPack.normalizedAnchors
            );
            if (relevance.score >= RELEVANCE_THRESHOLD && (result.evidence || []).length >= 2) {
              rewriteResults.set(id, result);
            } else {
              // Fallback: rule-based с anchors
              const originalNode = nodesNeedingRetry.find((n) => n.id === id);
              if (originalNode) {
                const fallback = generateSafeFallbackDetail(originalNode, defaultAnchorPack, {
                  title: inputTitle,
                  currentState: inputContext
                });
                rewriteResults.set(id, {
                  id,
                  title: originalNode.title,
                  detail: fallback.detail,
                  measurable_marker: 'через 4–12 недель', // Нейтральный маркер
                  relevance_score: 0.5,
                  uncertainty: 'high',
                  notes: 'Fallback: низкая релевантность LLM ответа',
                  measureType: fallback.measureType,
                  evidence: fallback.evidence
                });
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[ZerCon] Using rule-based fallback for node ${id}`);
                }
              }
            }
          });
        } catch (retryError) {
          // Если retry тоже упал — используем fallback для всех
          nodesNeedingRetry.forEach((node) => {
            const fallback = generateSafeFallbackDetail(node, defaultAnchorPack, {
              title: inputTitle,
              currentState: inputContext
            });
            rewriteResults.set(node.id, {
              id: node.id,
              title: node.title,
              detail: fallback.detail,
              measurable_marker: 'через 4–12 недель', // Нейтральный маркер
              relevance_score: 0.5,
              uncertainty: 'high',
              notes: 'Fallback: ошибка retry',
              measureType: fallback.measureType,
              evidence: fallback.evidence
            });
          });
        }
      }
    } catch (error) {
      console.warn(`ZerCon Rewrite v2 batch failed for nodes: ${batch.map((n) => n.id).join(', ')}`, error);
      // Fallback для всего батча
      batch.forEach((node) => {
        const fallback = generateSafeFallbackDetail(node, defaultAnchorPack, {
          title: inputTitle,
          currentState: inputContext
        });
        rewriteResults.set(node.id, {
          id: node.id,
          title: node.title,
          detail: fallback.detail,
          measurable_marker: 'через 4–12 недель', // Нейтральный маркер
          relevance_score: 0.5,
          uncertainty: 'high',
          notes: 'Fallback: ошибка батча',
          measureType: fallback.measureType,
          evidence: fallback.evidence
        });
      });
    }
  }

  // Применяем результаты переписывания
  const enrichedNodes = graph.nodes.map((node) => {
    const rewrite = rewriteResults.get(node.id);
    if (rewrite) {
      // Проверяем релевантность для диагностики
      const relevance = calculateRelevanceScore(
        rewrite.evidence || [],
        rewrite.detail,
        defaultAnchorPack.normalizedAnchors
      );

      const updated: MapNode = {
        ...node,
        title: rewrite.title,
        summary: rewrite.summary,
        detail: rewrite.detail,
        fixation: rewrite.detail, // Legacy alias
        tags: rewrite.tags || node.tags,
        signals: rewrite.signals || node.signals,
        meta: {
          ...(node.meta ?? {}),
          rawTitle: node.title,
          rawDescription: node.description,
          rawDetail: node.detail || node.fixation,
          measurable_marker: rewrite.measurable_marker,
          relevance_score: rewrite.relevance_score,
          uncertainty: rewrite.uncertainty,
          notes: rewrite.notes,
          zerconApplied: true,
          zerconVersion: 'v2',
          // Диагностика в dev режиме
          ...(process.env.NODE_ENV === 'development'
            ? {
                evidence: rewrite.evidence || [],
                measureType: rewrite.measureType,
                relevanceScore: relevance.score,
                anchorMatches: relevance.anchorMatches,
                hasMeasurability: relevance.hasMeasurability
              }
            : {})
        }
      };

      // Валидация
      const validation = validateZerconNodeText(updated);
      if (!validation.valid && validation.needsFallback) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`zercon rewrite fallback for node ${node.id}: detail too short or missing measurability`);
        }
        // Используем safe fallback с anchors
        const fallback = generateSafeFallbackDetail(node, defaultAnchorPack, {
          title: inputTitle,
          currentState: inputContext
        });
        updated.detail = fallback.detail;
        updated.fixation = fallback.detail;
        if (process.env.NODE_ENV === 'development') {
          updated.meta = {
            ...updated.meta,
            evidence: fallback.evidence,
            measureType: fallback.measureType,
            fallbackUsed: true
          };
        }
      }

      return updated;
    }

    // Если узел не был переписан, но нет detail — добавляем fallback
    return ensureDetail(node);
  });

  return { ...graph, nodes: enrichedNodes };
}
