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

const tagStatements: Record<FutureState['tags'][number], { title: string; explanation: string; consequence: string }> = {
  flexibility_low: {
    title: 'Манёвр становится дорогим и долгим',
    explanation: 'Любой поворот требует переделок и людей',
    consequence: 'Откат занимает месяцы, а не недели'
  },
  flexibility_high: {
    title: 'Манёвр остаётся, но стоит усилий',
    explanation: 'Нужно держать людей и время на каждый сдвиг',
    consequence: 'Поддержка нескольких ходов съедает недели'
  },
  vendor_lockin: {
    title: 'Смена поставщика станет почти нереальной',
    explanation: 'Контракты и интеграции держат за горло',
    consequence: 'Уход = новый проект на 6–12 месяцев'
  },
  open_standards: {
    title: 'Стандарты требуют постоянного обслуживания',
    explanation: 'Нужно держать совместимость и проверки',
    consequence: 'Любое изменение тянет время команды'
  },
  fixed_cost: {
    title: 'Постоянные расходы будут давить каждый месяц',
    explanation: 'Бюджет закреплён и не двигается быстро',
    consequence: 'Сократить затраты без боли почти невозможно'
  },
  variable_cost: {
    title: 'Стоимость растёт вместе с объёмом',
    explanation: 'Каждая новая задача добавляет прямые траты',
    consequence: 'Рост быстро превращается в рост расходов'
  },
  sunk_cost: {
    title: 'Назад дороги почти не будет',
    explanation: 'Вложенные деньги и время уже не вернуть',
    consequence: 'Поворот требует нового бюджета'
  },
  low_sunk_cost: {
    title: 'Откат возможен, но не бесплатный',
    explanation: 'Часть работ всё равно придётся выбросить',
    consequence: 'На разворот уйдут недели команды'
  },
  org_inertia: {
    title: 'Любое решение становится через людей',
    explanation: 'Появляются согласования и роли',
    consequence: 'Скорость падает, циклы растут'
  },
  hiring_lock: {
    title: 'Команда фиксируется, как якорь',
    explanation: 'Людей нужно удерживать и загружать',
    consequence: 'Сократить состав быстро не получится'
  },
  long_timeline: {
    title: 'Сроки уедут далеко вперёд',
    explanation: 'Работа тянется длинными циклами',
    consequence: 'Результаты приходят через месяцы'
  },
  short_timeline: {
    title: 'Сроки становятся жёсткими и сжатыми',
    explanation: 'Нужно быстро закрывать этапы',
    consequence: 'Каждый сбой стоит недели'
  },
  speed_high: {
    title: 'Скорость растёт ценой переделок',
    explanation: 'Часть решений делается на бегу',
    consequence: 'Позже придётся исправлять за деньги'
  },
  speed_low: {
    title: 'Скорость падает из-за сложных шагов',
    explanation: 'Каждый этап требует подготовки',
    consequence: 'Запуск тянется на месяцы'
  },
  scope_growth: {
    title: 'Объём работ начинает расползаться',
    explanation: 'Каждое добавление тянет новое',
    consequence: 'Команда тонет в задачах'
  },
  scope_limit: {
    title: 'Часть задач придётся выкинуть',
    explanation: 'Объём жёстко ограничен рамками',
    consequence: 'Некоторые запросы просто не помещаются'
  },
  strategic_closure: {
    title: 'Часть направлений будет закрыта',
    explanation: 'Фокус не позволяет держать альтернативы',
    consequence: 'Поворот стоит дорого и долго'
  },
  strategic_opening: {
    title: 'Открытые направления требуют поддержки',
    explanation: 'Нужно держать несколько линий работ',
    consequence: 'Команда рассеивает время и деньги'
  },
  compliance_risk: {
    title: 'Согласования становятся обязательными',
    explanation: 'Появляются регуляторные требования',
    consequence: 'Запуски откладываются на недели'
  },
  integration_risk: {
    title: 'Интеграции начинают ломать сроки',
    explanation: 'Любое изменение цепляет соседние системы',
    consequence: 'Сроки переезжают на месяцы'
  }
};

const buildStatement = (tags: string[]) => {
  const tag = tags.find(isAllowedTag);
  if (!tag) {
    return {
      title: 'Откат становится дорогим и долгим',
      subtitle: 'Пояснение: изменения требуют больше людей и времени. Следствие: возврат стоит месяцев и денег.',
      tags: []
    };
  }
  const statement = tagStatements[tag];
  return {
    title: statement.title,
    subtitle: `Пояснение: ${statement.explanation}. Следствие: ${statement.consequence}.`,
    tags: [tag]
  };
};

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
    ...buildStatement(template.tags),
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
      system:
        'Ты формулируешь последствия решений языком ZerCon. Никаких абстракций, только конкретные последствия. Ответ строго на русском.',
      user: prompt,
      schema: FutureStateArrayJsonSchema
    });

    const parsed = FutureStateArraySchema.parse(result);
    const { sanitized, needsRetry } = sanitizeFutureStates(parsed);

    if (needsRetry) {
      const retry = await callLLMJson<FutureState[]>({
        model,
        system:
          'Ответь строго на русском без латиницы. Никаких советов и абстракций. Только структура с последствиями.',
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
