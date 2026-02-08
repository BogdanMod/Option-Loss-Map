import { domainTemplates } from '@/lib/map/domains';
import type { DecisionInput } from '@/lib/map/engine';
import { callLLMJson } from './client';
import {
  FutureStateArrayJsonSchema,
  FutureStateArraySchema,
  type ExtractedDecision,
  type FutureState
} from './schemas';
import { buildFutureStatesPrompt } from './prompts';

const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini-2024-07-18';

const allowedTags = new Set<FutureState['tags'][number]>([
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
]);

const isAllowedTag = (tag: string): tag is FutureState['tags'][number] =>
  allowedTags.has(tag as FutureState['tags'][number]);

const sanitizeToRussian = (value: string) => {
  const hasLatin = /[A-Za-z]/.test(value);
  if (!hasLatin) return { value, needsRetry: false };
  const cleaned = value.replace(/[A-Za-z]+/g, '').replace(/\s{2,}/g, ' ').trim();
  return {
    value: cleaned || 'Без данных на русском',
    needsRetry: true
  };
};

const sanitizeFutureStates = (items: FutureState[]) => {
  let needsRetry = false;
  const sanitized = items.map((item) => {
    const title = sanitizeToRussian(item.title);
    const subtitle = sanitizeToRussian(item.subtitle);
    const evidence = item.evidence.map((evidenceItem) => {
      const sanitizedEvidence = sanitizeToRussian(evidenceItem);
      if (sanitizedEvidence.needsRetry) needsRetry = true;
      return sanitizedEvidence.value;
    });
    if (title.needsRetry || subtitle.needsRetry) needsRetry = true;
    return {
      ...item,
      title: title.value,
      subtitle: subtitle.value,
      tags: item.tags.filter(isAllowedTag),
      evidence
    };
  });
  return { sanitized, needsRetry };
};

const fallbackFutureStates = (input: DecisionInput, option: { id: string; label: string }): FutureState[] => {
  const templates = domainTemplates[input.domain] ?? domainTemplates.custom;
  return templates.slice(0, 7).map((template, index) => ({
    title: template.title,
    subtitle: template.subtitle,
    tags: template.tags.filter(isAllowedTag),
    category: template.tags.some((tag) => tag.includes('org') || tag.includes('hiring'))
      ? 'org'
      : template.tags.some((tag) => tag.includes('fixed_cost') || tag.includes('infra'))
        ? 'budget'
        : 'strategy',
    evidence: [
      `Вариант ${option.id}: ${option.label}`,
      input.currentStateText ? `Контекст: ${input.currentStateText}` : 'Контекст не задан'
    ].slice(0, 3)
  }));
};

export async function generateFutureStates(
  input: DecisionInput,
  extracted: ExtractedDecision,
  option: { id: string; label: string; description?: string }
): Promise<FutureState[]> {
  const prompt = buildFutureStatesPrompt(extracted, option);

  try {
    const result = await callLLMJson<FutureState[]>({
      model,
      system: 'Ты генерируешь классы будущих состояний. Только структура. Ответ строго на русском.',
      user: prompt,
      schema: FutureStateArrayJsonSchema
    });

    const parsed = FutureStateArraySchema.parse(result);
    const { sanitized, needsRetry } = sanitizeFutureStates(parsed);

    if (needsRetry) {
      const retry = await callLLMJson<FutureState[]>({
        model,
        system: 'Ответь строго на русском без латиницы. Никаких рекомендаций. Только структура.',
        user: prompt,
        schema: FutureStateArrayJsonSchema
      });
      return FutureStateArraySchema.parse(retry);
    }

    return sanitized.slice(0, 7);
  } catch (error) {
    console.error('generateFutureStates fallback:', error);
    return fallbackFutureStates(input, option);
  }
}
