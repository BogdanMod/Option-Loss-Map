import type { DecisionInput } from '@/lib/map/engine';
import { callLLMJson } from './client';
import {
  ExtractedDecisionJsonSchema,
  ExtractedDecisionSchema,
  type ExtractedDecision
} from './schemas';
import { buildExtractPrompt } from './prompts';

const sanitizeToRussian = (value: string) => {
  const hasLatin = /[A-Za-z]/.test(value);
  if (!hasLatin) return { value, needsRetry: false };
  const cleaned = value.replace(/[A-Za-z]+/g, '').replace(/\s{2,}/g, ' ').trim();
  return {
    value: cleaned || 'Без данных на русском',
    needsRetry: true
  };
};

const sanitizeExtracted = (data: ExtractedDecision) => {
  let needsRetry = false;
  const mapArray = (items: string[]) =>
    items.map((item) => {
      const result = sanitizeToRussian(item);
      if (result.needsRetry) needsRetry = true;
      return result.value;
    });

  const sanitized: ExtractedDecision = {
    ...data,
    domain: sanitizeToRussian(data.domain).value,
    actors: mapArray(data.actors),
    resources: mapArray(data.resources),
    commitments: mapArray(data.commitments),
    keyConstraints: mapArray(data.keyConstraints),
    irreversibilitySignals: {
      financial: mapArray(data.irreversibilitySignals.financial),
      time: mapArray(data.irreversibilitySignals.time),
      organizational: mapArray(data.irreversibilitySignals.organizational),
      strategic: mapArray(data.irreversibilitySignals.strategic),
      pnrCandidates: data.irreversibilitySignals.pnrCandidates.map((item) => {
        const trigger = sanitizeToRussian(item.trigger);
        const why = sanitizeToRussian(item.why);
        if (trigger.needsRetry || why.needsRetry) needsRetry = true;
        return { trigger: trigger.value, why: why.value };
      })
    },
    evidence: mapArray(data.evidence)
  };

  return { sanitized, needsRetry };
};

const removeLatinStrings = (items: string[]) => items.filter((item) => !/[A-Za-z]/.test(item));

const ruleBasedFallback = (input: DecisionInput): ExtractedDecision => {
  const timeMatch = input.constraints.join(' ').match(/(\d+)\s*(недел|месяц|год)/i);
  const value = timeMatch ? Number(timeMatch[1]) : null;
  const unitRaw = timeMatch?.[2]?.toLowerCase();
  const unit = unitRaw?.includes('нед') ? 'недели' : unitRaw?.includes('год') ? 'годы' : unitRaw ? 'месяцы' : null;

  return {
    domain: input.domain,
    timeHorizon: { value, unit },
    actors: [],
    resources: [],
    commitments: [],
    keyConstraints: input.constraints.filter(Boolean),
    irreversibilitySignals: {
      financial: input.constraints.filter((c) => c.toLowerCase().includes('бюджет') || c.toLowerCase().includes('капзат')),
      time: input.constraints.filter((c) => c.toLowerCase().includes('срок')),
      organizational: [],
      strategic: [],
      pnrCandidates: []
    },
    evidence: [
      input.currentStateText ? `Контекст: ${input.currentStateText}` : 'Контекст не задан',
      ...input.constraints.slice(0, 2).map((item) => `Ограничение: ${item}`)
    ].filter(Boolean)
  };
};

export async function extractDecision(input: DecisionInput): Promise<ExtractedDecision> {
  const prompt = buildExtractPrompt(input);

  try {
    const result = await callLLMJson<ExtractedDecision>({
      system: 'Ты работаешь как модуль извлечения структуры. Только факты из текста. Ответ строго на русском.',
      user: prompt,
      schema: ExtractedDecisionJsonSchema
    });

    const parsed = ExtractedDecisionSchema.parse(result);
    const { sanitized, needsRetry } = sanitizeExtracted(parsed);

    if (needsRetry) {
      const retry = await callLLMJson<ExtractedDecision>({
        system: 'Ответь строго на русском без латиницы. Никаких рекомендаций. Только факты.',
        user: prompt,
        schema: ExtractedDecisionJsonSchema
      });
      const parsedRetry = ExtractedDecisionSchema.parse(retry);
      return {
        ...parsedRetry,
        domain: /[A-Za-z]/.test(parsedRetry.domain) ? 'Без данных на русском' : parsedRetry.domain,
        actors: removeLatinStrings(parsedRetry.actors),
        resources: removeLatinStrings(parsedRetry.resources),
        commitments: removeLatinStrings(parsedRetry.commitments),
        keyConstraints: removeLatinStrings(parsedRetry.keyConstraints),
        irreversibilitySignals: {
          financial: removeLatinStrings(parsedRetry.irreversibilitySignals.financial),
          time: removeLatinStrings(parsedRetry.irreversibilitySignals.time),
          organizational: removeLatinStrings(parsedRetry.irreversibilitySignals.organizational),
          strategic: removeLatinStrings(parsedRetry.irreversibilitySignals.strategic),
          pnrCandidates: parsedRetry.irreversibilitySignals.pnrCandidates
            .map((item) => ({
              trigger: item.trigger,
              why: item.why
            }))
            .filter((item) => !/[A-Za-z]/.test(item.trigger) && !/[A-Za-z]/.test(item.why))
        },
        evidence: removeLatinStrings(parsedRetry.evidence)
      };
    }

    return sanitized;
  } catch (error) {
    console.error('extractDecision fallback:', error);
    return ruleBasedFallback(input);
  }
}
