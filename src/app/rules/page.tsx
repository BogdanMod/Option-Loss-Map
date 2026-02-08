'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadHistory } from '@/lib/history/storage';
import type { DecisionRecord } from '@/lib/history/types';
import { generateHiddenRuleReport } from '@/lib/rules/ruleEngine';
import { humanizeTag } from '@/lib/rules/tagDictionary';
import type { HiddenRuleReport } from '@/lib/rules/types';
import { t } from '@/lib/i18n';
import { encodeSharePayload } from '@/lib/share/encode';
import { usePlan } from '@/lib/billing/usePlan';

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatRate = (value: number) => `${Math.round(value * 100)}%`;

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

type ExampleRow = {
  recordId: string;
  title: string;
  when: number;
  loss: number;
  irreversibility: number;
  pnr: boolean;
  topTags: string[];
};

const buildExampleRows = (items: DecisionRecord[]): ExampleRow[] =>
  items.map((record) => {
    const lossByOption = record.summary.optionLossPctByOption;
    const worstOptionId = Object.entries(lossByOption).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'A';
    return {
      recordId: record.id,
      title: record.title,
      when: record.createdAt,
      loss: lossByOption[worstOptionId] ?? 0,
      irreversibility: record.summary.irreversibilityByOption[worstOptionId] ?? 0,
      pnr: record.summary.pnrByOption[worstOptionId] ?? false,
      topTags: record.summary.topTagsByOption[worstOptionId] ?? []
    };
  });

const buildSharePayload = (report: HiddenRuleReport, examples: ExampleRow[]) => ({
  generatedAt: report.generatedAt,
  totalRecords: report.totalRecords,
  rules: report.rules,
  meta: report.meta,
  examples
});

export default function RulesPage() {
  const [records, setRecords] = useState<DecisionRecord[]>([]);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<'pdf' | 'share'>('share');
  const { features } = usePlan();

  useEffect(() => {
    setRecords(loadHistory());
  }, []);

  const report: HiddenRuleReport | null = useMemo(() => {
    if (records.length < 3) return null;
    return generateHiddenRuleReport(records);
  }, [records]);

  const examples = useMemo(() => buildExampleRows(records), [records]);

  const handleShare = () => {
    if (!report) return;
    if (!features.allowShare) {
      setPaywallContext('share');
      setShowPaywall(true);
      return;
    }
    const shouldShare = window.confirm(t('shareWarning'));
    if (!shouldShare) return;
    const token = encodeSharePayload(buildSharePayload(report, examples));
    const url = `${window.location.origin}/share/${token}`;
    window.open(url, '_blank');
    navigator.clipboard?.writeText(url).catch(() => undefined);
    setShareNotice(t('shareCopied'));
    setTimeout(() => setShareNotice(null), 2000);
  };

  return (
    <main className="min-h-screen bg-transparent px-8 py-12">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('rulesTitle')}</div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="ui-heading-lg">{t('rulesTitle')}</h1>
              <p className="mt-2 text-[15px] text-white/60">{t('rulesSubtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/report"
                className="ui-button-secondary"
              >
                {t('reportOpen')}
              </Link>
              <button
                type="button"
                className="ui-button-secondary"
                onClick={() => {
                  if (!features.allowPdf) {
                    setPaywallContext('pdf');
                    setShowPaywall(true);
                    return;
                  }
                  window.open('/report?print=1', '_blank');
                }}
              >
                {t('reportDownload')}
              </button>
              <button
                type="button"
                className="ui-button-secondary"
                onClick={handleShare}
              >
                {t('reportShare')}
              </button>
              <Link
                href="/map"
                className="ui-button-secondary"
              >
                {t('rulesBack')}
              </Link>
            </div>
          </div>
          {shareNotice ? (
            <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              {shareNotice}
            </div>
          ) : null}
        </header>

        {!features.allowHiddenRules ? (
          <div className="ui-section px-6 py-8">
            <div className="text-[15px] font-semibold text-white">{t('rulesLockedTitle')}</div>
            <div className="mt-2 text-[13px] text-white/60">{t('rulesLockedText')}</div>
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="ui-card px-4 py-4 text-[13px] text-white/40 blur-[2px]"
                >
                  <div className="h-3 w-40 rounded-full bg-white/10" />
                  <div className="mt-2 h-2 w-64 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
            <Link
              href="/upgrade?from=rules"
              className="mt-5 ui-button-secondary"
            >
              {t('rulesUnlock')}
            </Link>
          </div>
        ) : records.length < 3 ? (
          <div className="ui-section px-6 py-8 text-center backdrop-blur">
            <div className="ui-heading">{t('rulesEmptyTitle')}</div>
            <div className="mt-2 text-[15px] text-white/60">{t('rulesEmptySubtitle')}</div>
          </div>
        ) : report ? (
          <>
            <section className="ui-section px-6 py-5 backdrop-blur">
              <div className="ui-caption uppercase tracking-wide">{t('rulesSummary')}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('rulesAvgLoss')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatPercent(report.meta.avgOptionLossOverall)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('rulesAvgIrreversibility')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatPercent(report.meta.avgIrreversibilityOverall)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('rulesPnrRate')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatRate(report.meta.pnrOverallRate)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('rulesTopTags')}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {report.meta.topTagsOverall.map((tag) => (
                      <span
                        key={tag.tag}
                        title={humanizeTag(tag.tag)}
                        className="ui-chip"
                      >
                        {humanizeTag(tag.tag)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[13px] text-white/40">{t('rulesTagHint')}</div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {report.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="ui-card px-6 py-5 backdrop-blur"
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
                      <div>{t('rulesImpactLoss')}</div>
                      <div className="mt-1 text-[15px] font-semibold text-white">
                        {formatPercent(rule.impact.avgOptionLossPct)}
                      </div>
                    </div>
                    <div className="ui-card px-3 py-3">
                      <div>{t('rulesImpactIrreversibility')}</div>
                      <div className="mt-1 text-[15px] font-semibold text-white">
                        {formatPercent(rule.impact.avgIrreversibility)}
                      </div>
                    </div>
                    <div className="ui-card px-3 py-3">
                      <div>{t('rulesImpactPnr')}</div>
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
                  <div className="mt-2 text-[13px] text-white/40">{t('rulesTagHint')}</div>

                  <details className="mt-4 ui-card px-4 py-3 text-[13px] text-white/70">
                    <summary className="cursor-pointer font-semibold">{t('rulesExamples')}</summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-[13px] uppercase tracking-wide text-white/50">
                          {t('rulesEvidenceRecords')}
                        </div>
                        <ul className="mt-2 space-y-1">
                          {rule.evidence.records.map((item) => (
                            <li key={item.recordId}>
                              {item.title} · {formatShortDate(item.when)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[13px] uppercase tracking-wide text-white/50">
                          {t('rulesEvidenceIndicators')}
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {rule.evidence.indicators.map((indicator) => (
                            <li key={indicator}>{indicator}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[13px] uppercase tracking-wide text-white/50">
                          {t('rulesEvidenceExamples')}
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {rule.evidence.examples.map((example) => (
                            <li key={example}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </div>

      {showPaywall ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 ui-backdrop-enter">
          <div className="w-full max-w-md ui-section px-6 py-5 text-white/70 shadow-soft backdrop-blur ui-modal-enter">
            <div className="text-[15px] font-semibold text-white">{t('paywallTitle')}</div>
            <div className="mt-2 text-[13px] text-white/60">{t('paywallText')}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="ui-button-secondary"
                onClick={() => setShowPaywall(false)}
              >
                {t('paywallLater')}
              </button>
              <Link
                href={`/upgrade?from=${paywallContext}`}
                className="ui-button-primary"
              >
                {t('unlockAction')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
