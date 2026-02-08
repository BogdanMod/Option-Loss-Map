'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { DecisionRecord } from '@/lib/history/types';
import { clearHistory, deleteRecord, loadHistory } from '@/lib/history/storage';
import { humanizeTag } from '@/lib/rules/tagDictionary';
import { usePlan } from '@/lib/billing/usePlan';

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

const getDomainLabel = (domain: string) => {
  switch (domain) {
    case 'product':
      return t('domainProduct');
    case 'architecture':
      return t('domainArchitecture');
    case 'data':
      return t('domainData');
    case 'hiring':
      return t('domainHiring');
    case 'pricing':
      return t('domainPricing');
    case 'market':
      return t('domainMarket');
    case 'custom':
      return t('domainCustom');
    default:
      return domain;
  }
};

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<DecisionRecord[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const router = useRouter();
  const { features } = usePlan();

  useEffect(() => {
    setHistoryItems(loadHistory());
  }, []);

  const historySummaryById = useMemo(() => {
    const summary: Record<string, { loss: number; irreversibility: number; hasPnr: boolean; topTags: string[] }> = {};
    historyItems.forEach((record) => {
      const losses = Object.values(record.summary.optionLossPctByOption);
      const irreversibilities = Object.values(record.summary.irreversibilityByOption);
      const hasPnr = Object.values(record.summary.pnrByOption).some(Boolean);
      const loss = losses.length ? Math.max(...losses) : 0;
      const irreversibility = irreversibilities.length ? Math.max(...irreversibilities) : 0;
      const tagBuckets = Object.values(record.summary.topTagsByOption).flat();
      const tagCounts = new Map<string, number>();
      tagBuckets.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
      const topTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag)
        .slice(0, 3);
      summary[record.id] = { loss, irreversibility, hasPnr, topTags };
    });
    return summary;
  }, [historyItems]);

  const toggleCompareId = (id: string) => {
    if (!features.allowCompare) return;
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const compareRows = compareIds.map((id) => historyItems.find((item) => item.id === id)).filter(Boolean) as DecisionRecord[];

  const handleOpenRecord = (record: DecisionRecord) => {
    router.push(`/map?open=${record.id}`);
  };

  const handleDelete = (id: string) => {
    setHistoryItems(deleteRecord(id));
    setCompareIds((prev) => prev.filter((item) => item !== id));
  };

  const handleClear = () => {
    const shouldClear = window.confirm(t('historyClearConfirm'));
    if (!shouldClear) return;
    clearHistory();
    setHistoryItems([]);
    setCompareIds([]);
    setCompareOpen(false);
  };

  return (
    <main className="min-h-screen bg-transparent px-8 py-12">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="ui-caption uppercase tracking-wide">{t('historyTitle')}</div>
              <h1 className="mt-2 ui-heading-lg">{t('historyTitle')}</h1>
              <p className="mt-2 text-[15px] text-white/60">{t('historyEmptyHint')}</p>
            </div>
            <button
              type="button"
              className="ui-button-secondary"
              onClick={handleClear}
            >
              {t('historyClear')}
            </button>
          </div>
        </header>

        {historyItems.length === 0 ? (
          <div className="ui-section px-6 py-8 text-center backdrop-blur">
            <div className="ui-heading">{t('historyEmpty')}</div>
            <div className="mt-2 text-[15px] text-white/60">{t('historyEmptyHint')}</div>
          </div>
        ) : (
          <section className="space-y-4">
            {historyItems.map((record) => {
              const summary = historySummaryById[record.id];
              const badgeLoss = summary ? `${t('historyLoss')}: ${summary.loss}%` : '';
              const badgeIrrev = summary ? `${t('historyIrreversibility')}: ${summary.irreversibility}%` : '';
              return (
                <div
                  key={record.id}
                  className="ui-card px-6 py-5 backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[18px] font-semibold text-white">{record.title}</div>
                      <div className="mt-1 text-[13px] text-white/50">
                        {getDomainLabel(record.domain)} · {formatShortDate(record.createdAt)}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-[13px] text-white/50">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(record.id)}
                        disabled={!features.allowCompare}
                        onChange={() => toggleCompareId(record.id)}
                      />
                      {t('historyCompare')}
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-white/60">
                    {badgeLoss ? (
                      <span className="ui-chip">
                        {badgeLoss}
                      </span>
                    ) : null}
                    {badgeIrrev ? (
                      <span className="ui-chip">
                        {badgeIrrev}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="ui-button-secondary"
                      onClick={() => handleOpenRecord(record)}
                    >
                      {t('historyOpen')}
                    </button>
                    <button
                      type="button"
                      className="ui-button-secondary"
                      onClick={() => handleDelete(record.id)}
                    >
                      {t('historyDelete')}
                    </button>
                  </div>
                </div>
              );
            })}

            {historyItems.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 ui-section px-6 py-4 text-[13px] text-white/70 backdrop-blur">
                <div>
                  {t('historyCompareHint')}
                  {!features.allowCompare ? (
                    <span className="ml-2 text-[13px] text-white/40">
                      {t('compareLocked')}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={compareIds.length < 2 || !features.allowCompare}
                  className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCompareOpen((prev) => !prev)}
                >
                  {t('historyCompareSelected')}
                </button>
              </div>
            ) : null}

            {compareOpen && compareRows.length >= 2 ? (
              <div className="ui-section px-6 py-5 text-[13px] text-white/70 shadow-soft">
                <div className="font-semibold text-white/80">{t('historyCompareTitle')}</div>
                <div className="mt-3 space-y-2">
                  {compareRows.map((record) => {
                    const summary = historySummaryById[record.id];
                    return (
                      <div key={record.id} className="ui-card px-3 py-3">
                        <div className="text-[15px] font-semibold text-white">{record.title}</div>
                        <div className="mt-1 text-[13px] text-white/50">
                          {getDomainLabel(record.domain)}
                        </div>
                        <div className="mt-2 grid gap-1">
                          <div>
                            {t('historyLoss')}: {summary?.loss ?? 0}%
                          </div>
                          <div>
                            {t('historyIrreversibility')}: {summary?.irreversibility ?? 0}%
                          </div>
                          <div>
                            {t('historyHasPnr')}: {summary?.hasPnr ? t('yes') : t('no')}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {summary?.topTags.length ? (
                              summary.topTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="ui-chip"
                                >
                                  {humanizeTag(tag)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[13px] text-white/40">{t('historyNoTags')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
