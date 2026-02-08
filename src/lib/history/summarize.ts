import type { MapModel } from '@/lib/map/types';
import type { DecisionRecord } from './types';

export function summarizeMap(map: MapModel): DecisionRecord['summary'] {
  const optionLossPctByOption: Record<string, number> = {};
  const irreversibilityByOption: Record<string, number> = {};
  const pnrByOption: Record<string, boolean> = {};
  const topTagsByOption: Record<string, string[]> = {};

  const metricsByOption = new Map<string, MapModel['edges'][number]['metrics']>();
  map.edges.forEach((edge) => {
    if (!metricsByOption.has(edge.optionId)) {
      metricsByOption.set(edge.optionId, edge.metrics);
    }
  });

  metricsByOption.forEach((metrics, optionId) => {
    optionLossPctByOption[optionId] = Math.round(metrics.optionLossPct);
    irreversibilityByOption[optionId] = Math.round(metrics.irreversibilityScore);
    pnrByOption[optionId] = Boolean(metrics.pnrFlag);
  });

  const tagsByOption: Record<string, Record<string, number>> = {};
  map.nodes
    .filter((node) => node.type === 'future')
    .forEach((node) => {
      if (!node.optionId) return;
      if (!tagsByOption[node.optionId]) tagsByOption[node.optionId] = {};
      (node.tags ?? []).forEach((tag) => {
        tagsByOption[node.optionId][tag] = (tagsByOption[node.optionId][tag] ?? 0) + 1;
      });
    });

  Object.entries(tagsByOption).forEach(([optionId, tagCounts]) => {
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 5);
    topTagsByOption[optionId] = sorted;
  });

  return {
    optionLossPctByOption,
    irreversibilityByOption,
    pnrByOption,
    topTagsByOption
  };
}
