import type { DecisionRecord } from '@/lib/history/types';
import type { HiddenRule, HiddenRuleReport } from './types';
import { humanizeTag } from './tagDictionary';

type RecordFeatures = {
  record: DecisionRecord;
  worstOptionId: string;
  worstOptionLossPct: number;
  worstIrreversibility: number;
  pnrAny: boolean;
  topTags: string[];
};

type ClusterDefinition = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

const clusters: ClusterDefinition[] = [
  {
    id: 'org_lock',
    title: 'Раннее закрепление ролей и процессов',
    description: 'Повторяются признаки организационной фиксации, что сужает пространство отката.',
    tags: ['hiring_lock', 'org_inertia']
  },
  {
    id: 'financial_lock',
    title: 'Фиксация инфраструктуры через обязательства',
    description: 'В нескольких решениях повторяются капитальные или невозвратные затраты.',
    tags: ['fixed_cost', 'sunk_cost']
  },
  {
    id: 'vendor_lock',
    title: 'Зависимость от поставщика как общий паттерн',
    description: 'Выборы приводят к повторяемой зависимости от поставщиков или экосистем.',
    tags: ['vendor_lockin']
  },
  {
    id: 'long_timeline',
    title: 'Склонность к длинному циклу отката',
    description: 'Медленный возврат к альтернативам встречается в нескольких случаях.',
    tags: ['long_timeline', 'slow_revert']
  },
  {
    id: 'strategic_closure',
    title: 'Сужение альтернативных стратегических направлений',
    description: 'Повторяются признаки закрытия стратегических альтернатив.',
    tags: ['strategic_closure']
  },
  {
    id: 'speed_vs_flex',
    title: 'Ускорение ценой гибкости экспериментов',
    description: 'Быстрый запуск сочетается со снижением гибкости.',
    tags: ['speed_high', 'flexibility_low']
  }
];

const round = (value: number) => Math.round(value);

const buildFeatures = (record: DecisionRecord): RecordFeatures => {
  const lossByOption = record.summary.optionLossPctByOption;
  const worstOptionId = Object.entries(lossByOption).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'A';
  const worstOptionLossPct = lossByOption[worstOptionId] ?? 0;
  const worstIrreversibility = record.summary.irreversibilityByOption[worstOptionId] ?? 0;
  const pnrAny = Object.values(record.summary.pnrByOption).some(Boolean);
  const topTags = record.summary.topTagsByOption[worstOptionId] ?? [];

  return {
    record,
    worstOptionId,
    worstOptionLossPct,
    worstIrreversibility,
    pnrAny,
    topTags
  };
};

export function generateHiddenRuleReport(records: DecisionRecord[]): HiddenRuleReport {
  const features = records.map(buildFeatures);

  const tagCounts = new Map<string, number>();
  features.forEach((item) => {
    item.topTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    });
  });

  const topTagsOverall = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  const avgOptionLossOverall = round(
    features.reduce((sum, item) => sum + item.worstOptionLossPct, 0) / (features.length || 1)
  );
  const avgIrreversibilityOverall = round(
    features.reduce((sum, item) => sum + item.worstIrreversibility, 0) / (features.length || 1)
  );
  const pnrOverallRate = features.length
    ? features.filter((item) => item.pnrAny).length / features.length
    : 0;

  const rules: HiddenRule[] = clusters
    .map((cluster) => {
      const matched = features.filter((item) => item.topTags.some((tag) => cluster.tags.includes(tag)));
      if (matched.length === 0) return null;

      const avgOptionLossPct = round(
        matched.reduce((sum, item) => sum + item.worstOptionLossPct, 0) / matched.length
      );
      const avgIrreversibility = round(
        matched.reduce((sum, item) => sum + item.worstIrreversibility, 0) / matched.length
      );
      const pnrRate = matched.length ? matched.filter((item) => item.pnrAny).length / matched.length : 0;

      const indicators = [
        ...cluster.tags.map((tag) => humanizeTag(tag)),
        avgOptionLossPct >= 60 ? 'высокая потеря опциональности' : 'умеренная потеря опциональности',
        avgIrreversibility >= 60 ? 'высокая необратимость' : 'умеренная необратимость',
        pnrRate >= 0.5 ? 'часто встречается точка невозврата' : 'точка невозврата встречается редко'
      ];

      const examples = matched.slice(0, 4).map((item) => {
        const tagLabel = humanizeTag(item.topTags[0] ?? cluster.tags[0] ?? '');
        return `В «${item.record.title}» повторяется: ${tagLabel} (потеря ${item.worstOptionLossPct}%, необратимость ${item.worstIrreversibility}%).`;
      });

      const coverage = matched.length;
      const impactHigh = avgOptionLossPct >= 65 || avgIrreversibility >= 65;
      let confidence: HiddenRule['confidence'] = 'Средняя';
      if (coverage >= 4 || (coverage >= 3 && impactHigh)) confidence = 'Высокая';
      else if (coverage <= 2 && !impactHigh) confidence = 'Низкая';

      const rule: HiddenRule = {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description,
        evidence: {
          records: matched.map((item) => ({
            recordId: item.record.id,
            title: item.record.title,
            when: item.record.createdAt,
            optionId: item.worstOptionId
          })),
          indicators,
          examples
        },
        impact: {
          avgOptionLossPct,
          avgIrreversibility,
          pnrRate
        },
        confidence,
        tags: cluster.tags.slice(0, 6)
      };

      return rule;
    })
    .filter(Boolean) as HiddenRule[];

  const filteredRules = rules.filter((rule) => rule.evidence.records.length >= (records.length >= 6 ? 3 : 2));

  const sortedRules = filteredRules
    .sort((a, b) => {
      const aScore = a.impact.avgOptionLossPct + a.impact.avgIrreversibility;
      const bScore = b.impact.avgOptionLossPct + b.impact.avgIrreversibility;
      return bScore - aScore;
    })
    .slice(0, 6);

  return {
    generatedAt: Date.now(),
    totalRecords: records.length,
    rules: sortedRules,
    meta: {
      topTagsOverall,
      avgOptionLossOverall,
      avgIrreversibilityOverall,
      pnrOverallRate
    }
  };
}
