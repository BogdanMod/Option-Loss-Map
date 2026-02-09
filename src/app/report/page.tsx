'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DecisionRecord } from '@/lib/history/types';
import { loadHistory } from '@/lib/history/storage';
import { generateHiddenRuleReport } from '@/lib/rules/ruleEngine';
import { humanizeTag } from '@/lib/rules/tagDictionary';
import type { HiddenRuleReport } from '@/lib/rules/types';
import { encodeSharePayload } from '@/lib/share/encode';
import { t } from '@/lib/i18n';
import { usePlan } from '@/lib/billing/usePlan';
import { trackEvent } from '@/lib/analytics/track';

type ExampleRow = {
  recordId: string;
  title: string;
  when: number;
  loss: number;
  irreversibility: number;
  pnr: boolean;
  topTags: string[];
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

const buildExampleRows = (records: DecisionRecord[]): ExampleRow[] =>
  records.map((record) => {
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

function ReportPageInner() {
  const [records, setRecords] = useState<DecisionRecord[]>([]);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<'pdf' | 'share'>('share');
  const { features, plan } = usePlan();
  const params = useSearchParams();
  const isPrint = params?.get('print') === '1';

  useEffect(() => {
    setRecords(loadHistory());
  }, []);

  const report = useMemo(() => {
    if (records.length < 3) return null;
    return generateHiddenRuleReport(records);
  }, [records]);

  const examples = useMemo(() => buildExampleRows(records), [records]);

  useEffect(() => {
    if (isPrint) {
      requestAnimationFrame(() => window.print());
    }
  }, [isPrint]);

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
    trackEvent('share_link_created', { page: '/report', plan, source: 'report' });
    setTimeout(() => setShareNotice(null), 2000);
  };

  return (
    <main className={`min-h-screen bg-transparent px-8 py-12 ${isPrint ? 'print:bg-white' : ''}`}>
      <div className={`mx-auto flex max-w-[1280px] flex-col gap-6 ${isPrint ? 'print:max-w-none' : ''}`}>
        <header className={`ui-section px-6 py-5 backdrop-blur ${isPrint ? 'print:shadow-none' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[13px] uppercase tracking-[0.3em] text-white/60">ZER · CON</div>
              <div className="text-[15px] text-white/50">Option Loss Map</div>
              <h1 className="mt-3 ui-heading-lg">{t('reportTitle')}</h1>
              <p className="mt-2 text-[15px] text-white/60">{t('reportSubtitle')}</p>
              <div className="mt-3 text-[13px] text-white/40">
                {t('reportDate')}: {formatShortDate(Date.now())}
              </div>
            </div>
            {!isPrint ? (
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
                    trackEvent('export_pdf', { page: '/report', plan, source: 'report' });
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
              </div>
            ) : null}
          </div>
          {shareNotice ? (
            <div className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
              {shareNotice}
            </div>
          ) : null}
        </header>

        {records.length < 3 || !report ? (
          <div className="ui-section px-6 py-8 text-center backdrop-blur">
            <div className="ui-heading">{t('reportEmptyTitle')}</div>
            <div className="mt-2 text-[15px] text-white/60">{t('reportEmptySubtitle')}</div>
          </div>
        ) : (
          <>
            <section className={`ui-section px-6 py-5 backdrop-blur ${isPrint ? 'print:shadow-none' : ''}`}>
              <div className="ui-caption uppercase tracking-wide">{t('reportSummary')}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('reportAvgLoss')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatPercent(report.meta.avgOptionLossOverall)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('reportAvgIrreversibility')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatPercent(report.meta.avgIrreversibilityOverall)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('reportPnrRate')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {formatRate(report.meta.pnrOverallRate)}
                  </div>
                </div>
                <div className="ui-card px-4 py-4">
                  <div className="text-[13px] text-white/50">{t('reportTotal')}</div>
                  <div className="mt-2 text-[20px] font-semibold text-white">
                    {report.totalRecords}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="ui-caption uppercase tracking-wide">{t('reportTopRules')}</div>
              {report.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`ui-card px-6 py-5 backdrop-blur ${isPrint ? 'print:shadow-none' : ''}`}
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
                  {!isPrint ? (
                    <details className="mt-4 ui-card px-4 py-3 text-[13px] text-white/70">
                      <summary className="cursor-pointer font-semibold">{t('reportExamples')}</summary>
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
                  ) : null}
                </div>
              ))}
            </section>

            <section className={`ui-section px-6 py-5 backdrop-blur ${isPrint ? 'print:shadow-none' : ''}`}>
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
                    {examples.map((row) => (
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

            <section className={`ui-section px-6 py-5 text-[13px] text-white/70 backdrop-blur ${isPrint ? 'print:shadow-none' : ''}`}>
              <div className="ui-caption uppercase tracking-wide">{t('reportMethodology')}</div>
              <ul className="mt-3 list-disc space-y-2 pl-4">
                <li>{t('reportMethodLoss')}</li>
                <li>{t('reportMethodIrreversibility')}</li>
                <li>{t('reportMethodPnr')}</li>
                <li>{t('reportMethodRules')}</li>
              </ul>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          a,
          button,
          summary,
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 24px !important;
          }
          .shadow-soft {
            box-shadow: none !important;
          }
        }
      `}</style>

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

export default function ReportPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-transparent px-8 py-12" />}>
      <ReportPageInner />
    </Suspense>
  );
}
