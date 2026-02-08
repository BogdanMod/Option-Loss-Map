'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { decodeSharePayload } from '@/lib/share/encode';
import { humanizeTag } from '@/lib/rules/tagDictionary';
import { t } from '@/lib/i18n';

type SharedExample = {
  recordId: string;
  title: string;
  when: number;
  loss: number;
  irreversibility: number;
  pnr: boolean;
  topTags: string[];
};

type SharedPayload = {
  generatedAt: number;
  totalRecords: number;
  rules: {
    id: string;
    title: string;
    description: string;
    impact: { avgOptionLossPct: number; avgIrreversibility: number; pnrRate: number };
    confidence: string;
    evidence: {
      records: { recordId: string; title: string; when: number }[];
      indicators: string[];
      examples: string[];
    };
    tags: string[];
  }[];
  meta: {
    topTagsOverall: { tag: string; count: number }[];
    avgOptionLossOverall: number;
    avgIrreversibilityOverall: number;
    pnrOverallRate: number;
  };
  examples: SharedExample[];
};

const formatShortDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) {
    return `сегодня ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date >= startOfYesterday) {
    return `вчера ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatRate = (value: number) => `${Math.round(value * 100)}%`;

export default function SharePage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const payload = useMemo(() => {
    try {
      return decodeSharePayload<SharedPayload>(token);
    } catch {
      return null;
    }
  }, [token]);

  if (!payload) {
    return (
      <main className="min-h-screen bg-transparent px-6 py-8">
        <div className="mx-auto max-w-3xl ui-section px-6 py-8 text-center backdrop-blur">
          <div className="text-[15px] font-semibold text-white">{t('shareInvalid')}</div>
          <Link
            href="/map"
            className="mt-4 ui-button-secondary"
          >
            {t('rulesBack')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="text-[13px] uppercase tracking-[0.3em] text-white/60">ZER · CON</div>
          <div className="text-[15px] text-white/50">Option Loss Map</div>
          <h1 className="mt-3 ui-heading-lg">{t('reportTitle')}</h1>
          <p className="mt-2 text-[15px] text-white/60">{t('reportSubtitle')}</p>
          <div className="mt-3 text-[13px] text-white/40">
            {t('reportDate')}: {formatShortDate(payload.generatedAt)}
          </div>
        </header>

        <section className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('reportSummary')}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="ui-card px-4 py-4">
              <div className="text-[13px] text-white/50">{t('reportAvgLoss')}</div>
              <div className="mt-2 text-[20px] font-semibold text-white">
                {formatPercent(payload.meta.avgOptionLossOverall)}
              </div>
            </div>
            <div className="ui-card px-4 py-4">
              <div className="text-[13px] text-white/50">{t('reportAvgIrreversibility')}</div>
              <div className="mt-2 text-[20px] font-semibold text-white">
                {formatPercent(payload.meta.avgIrreversibilityOverall)}
              </div>
            </div>
            <div className="ui-card px-4 py-4">
              <div className="text-[13px] text-white/50">{t('reportPnrRate')}</div>
              <div className="mt-2 text-[20px] font-semibold text-white">
                {formatRate(payload.meta.pnrOverallRate)}
              </div>
            </div>
            <div className="ui-card px-4 py-4">
              <div className="text-[13px] text-white/50">{t('reportTotal')}</div>
              <div className="mt-2 text-[20px] font-semibold text-white">
                {payload.totalRecords}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="ui-caption uppercase tracking-wide">{t('reportTopRules')}</div>
          {payload.rules.map((rule) => (
            <div
              key={rule.id}
              className="ui-card px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-white">{rule.title}</div>
                  <div className="mt-1 text-[13px] text-white/60">{rule.description}</div>
                </div>
                <div className="ui-chip text-white/60">
                  {t('rulesConfidence')}: {rule.confidence}
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-[13px] text-white/60 sm:grid-cols-3">
                <div className="ui-card px-3 py-3">
                  <div>{t('reportImpactLoss')}</div>
                  <div className="mt-1 text-[15px] font-semibold text-white">
                    {formatPercent(rule.impact.avgOptionLossPct)}
                  </div>
                </div>
                <div className="ui-card px-3 py-3">
                  <div>{t('reportImpactIrreversibility')}</div>
                  <div className="mt-1 text-[15px] font-semibold text-white">
                    {formatPercent(rule.impact.avgIrreversibility)}
                  </div>
                </div>
                <div className="ui-card px-3 py-3">
                  <div>{t('reportImpactPnr')}</div>
                  <div className="mt-1 text-[15px] font-semibold text-white">
                    {formatRate(rule.impact.pnrRate)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px] text-white/60">
                {rule.tags.map((tag) => (
                  <span
                    key={tag}
                    title={humanizeTag(tag)}
                    className="ui-chip"
                  >
                    {humanizeTag(tag)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('reportExamplesTable')}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px] text-white/60">
              <thead className="text-[13px] uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-2 pr-3">{t('reportTableDecision')}</th>
                  <th className="py-2 pr-3">{t('reportTableDate')}</th>
                  <th className="py-2 pr-3">{t('reportTableLoss')}</th>
                  <th className="py-2 pr-3">{t('reportTableIrreversibility')}</th>
                  <th className="py-2 pr-3">{t('reportTablePnr')}</th>
                  <th className="py-2">{t('reportTableTags')}</th>
                </tr>
              </thead>
              <tbody>
                {payload.examples.map((row) => (
                  <tr key={row.recordId} className="border-t border-white/10">
                    <td className="py-2 pr-3 text-white">{row.title}</td>
                    <td className="py-2 pr-3">{formatShortDate(row.when)}</td>
                    <td className="py-2 pr-3">{formatPercent(row.loss)}</td>
                    <td className="py-2 pr-3">{formatPercent(row.irreversibility)}</td>
                    <td className="py-2 pr-3">{row.pnr ? t('yes') : t('no')}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {row.topTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            title={humanizeTag(tag)}
                            className="ui-chip"
                          >
                            {humanizeTag(tag)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ui-section px-6 py-5 text-[13px] text-white/70 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('reportMethodology')}</div>
          <ul className="mt-3 list-disc space-y-2 pl-4">
            <li>{t('reportMethodLoss')}</li>
            <li>{t('reportMethodIrreversibility')}</li>
            <li>{t('reportMethodPnr')}</li>
            <li>{t('reportMethodRules')}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
