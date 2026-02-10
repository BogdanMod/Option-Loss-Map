import { callLLMJson } from './client';
import { ZerconNodeJsonSchema, ZerconNodeSchema, type ZerconNode } from './schemas';
import type { MapModel, MapNode } from '@/lib/map/types';

const SYSTEM_PROMPT =
  'Ты — аналитическая система ZerCon.\n' +
  'Твоя задача — переписывать последствия решений\n' +
  'в операционном, конкретном и болезненном виде.\n\n' +
  'Запрещены абстракции, консультантский язык,\n' +
  'общие слова без последствий.\n\n' +
  'Каждый узел ОБЯЗАН содержать:\n' +
  '1) Заголовок (5–7 слов, разговорный)\n' +
  '2) Пояснение (что реально меняется)\n' +
  '3) Следствие (время / деньги / необратимость)\n\n' +
  'Если узел не содержит цены или фиксации — перепиши его.';

const cache = new Map<string, ZerconNode>();

const resolveZerconType = (node: MapNode) => {
  if (node.type === 'merged') return 'lock-in';
  const tags = node.tags ?? [];
  if (tags.some((tag) => ['strategic_closure', 'vendor_lockin', 'sunk_cost', 'reversibility_low'].includes(tag))) {
    return 'irreversible';
  }
  return 'future';
};

const buildUserPrompt = (inputTitle: string, inputContext: string, node: MapNode) => {
  const rawLabel = [node.title, node.description].filter(Boolean).join(' — ');
  return [
    `Название решения: ${inputTitle || 'Без названия'}`,
    `Краткое описание решения: ${inputContext || 'Нет описания'}`,
    `Исходный текст узла: ${rawLabel}`,
    `Тип узла: ${resolveZerconType(node)}`,
    'Ответ только в JSON по схеме.'
  ].join('\n');
};

const applyToNode = async (node: MapNode, inputTitle: string, inputContext: string) => {
  const cacheKey = `${inputTitle}::${inputContext}::${node.id}::${node.title}::${node.description ?? ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as ZerconNode;
  const prompt = buildUserPrompt(inputTitle, inputContext, node);
  try {
    const result = await callLLMJson<ZerconNode>({
      system: SYSTEM_PROMPT,
      user: prompt,
      schema: ZerconNodeJsonSchema
    });
    const parsed = ZerconNodeSchema.parse(result);
    cache.set(cacheKey, parsed);
    return parsed;
  } catch {
    const retry = await callLLMJson<ZerconNode>({
      system: SYSTEM_PROMPT,
      user: prompt,
      schema: ZerconNodeJsonSchema
    });
    const parsed = ZerconNodeSchema.parse(retry);
    cache.set(cacheKey, parsed);
    return parsed;
  }
};

export async function applyZerconLanguage(
  graph: MapModel,
  inputTitle: string,
  inputContext: string
): Promise<MapModel> {
  const nodes = await Promise.all(
    graph.nodes.map(async (node) => {
      if (node.type === 'current') return node;
      try {
        const zercon = await applyToNode(node, inputTitle, inputContext);
        return {
          ...node,
          title: zercon.title,
          description: zercon.description,
          consequence: zercon.consequence,
          severity: zercon.severity,
          irreversibility: zercon.irreversibility,
          meta: {
            ...(node.meta ?? {}),
            rawTitle: node.title,
            rawDescription: node.description,
            zerconApplied: true
          }
        };
      } catch {
        return {
          ...node,
          meta: {
            ...(node.meta ?? {}),
            zerconApplied: false
          }
        };
      }
    })
  );
  return { ...graph, nodes };
}

