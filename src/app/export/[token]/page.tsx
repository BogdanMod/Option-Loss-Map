'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { decodeSharePayload } from '@/lib/share/encode';
import type { MapSharePayload } from '@/lib/share/mapPayload';
import { t } from '@/lib/i18n';
import { MapFlow, type MapFlowHandle } from '@/components/MapFlow';
import MapLegend from '@/components/MapLegend';

const formatShortDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

function ExportPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params?.token === 'string' ? params.token : '';
  const shouldPrint = searchParams?.get('print') === '1';
  const previewRef = useRef<MapFlowHandle | null>(null);
  const fullRef = useRef<MapFlowHandle | null>(null);

  const payload = useMemo(() => {
    try {
      return decodeSharePayload<MapSharePayload>(token);
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!payload) return;
    requestAnimationFrame(() => {
      previewRef.current?.fit();
      fullRef.current?.fit();
    });
  }, [payload]);

  useEffect(() => {
    if (!shouldPrint || !payload) return;
    const timer = window.setTimeout(() => window.print(), 800);
    return () => window.clearTimeout(timer);
  }, [payload, shouldPrint]);

  if (!payload) {
    return (
      <main className="min-h-screen bg-transparent px-6 py-10">
        <div className="mx-auto max-w-3xl ui-section px-6 py-8 text-center backdrop-blur">
          <div className="text-[15px] font-semibold text-white">{t('shareInvalid')}</div>
          <Link href="/map" className="mt-4 ui-button-secondary">
            {t('rulesBack')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-10 print:px-10">
      <div className="ui-print-watermark">ZerCon · Option Loss Map</div>
      <section className="ui-print-page mx-auto flex max-w-[1100px] flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="text-[12px] uppercase tracking-[0.3em] text-white/60">ZER · CON</div>
          <div className="text-[14px] text-white/50">Option Loss Map</div>
          <h1 className="mt-3 ui-heading-lg">{t('exportTitle')}</h1>
          <div className="mt-2 text-[13px] text-white/50">
            {t('exportGeneratedAt')}: {formatShortDate(payload.generatedAt)}
          </div>
        </header>

        <section className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('exportSummaryTitle')}</div>
          <div className="mt-3 text-[18px] font-semibold text-white">{payload.title}</div>
          <div className="mt-2 text-[13px] text-white/50">{payload.context}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="ui-card px-4 py-3">
              <div className="text-[12px] text-white/50">{t('optionLoss')}</div>
              <div className="mt-2 text-[20px] font-semibold text-white">
                {payload.summary.optionLossPct}%
              </div>
            </div>
            <div className="ui-card px-4 py-3">
              <div className="text-[12px] text-white/50">{t('pointOfNoReturn')}</div>
              <div className="mt-2 text-[15px] text-white/70">
                {payload.summary.pnrFlag ? t('yes') : t('no')}
              </div>
              <div className="mt-1 text-[12px] text-white/50">
                {payload.summary.pnrFlag && payload.summary.pnrText
                  ? `${t('pnrYesPrefix')} ${payload.summary.pnrText}`
                  : t('pnrNoText')}
              </div>
            </div>
            <div className="ui-card px-4 py-3">
              <div className="text-[12px] text-white/50">{t('mainEffectTitle')}</div>
              <div className="mt-2 text-[13px] text-white/70">{payload.summary.mainEffect || '—'}</div>
            </div>
          </div>
          <div className="mt-5 ui-section ui-map-shell h-[240px] overflow-hidden px-0 py-0">
            <div className="ui-map-grid pointer-events-none z-0" />
            <div className="absolute inset-0 z-10">
              <MapFlow
                key={`preview-${payload.generatedAt}`}
                model={payload.map}
                selectedOptionId={payload.selectedOptionId}
                onSelectOption={() => undefined}
                focusEnabled={false}
                highlightMode="reason"
                highlightIds={payload.highlightIds}
                ref={previewRef}
              />
            </div>
          </div>
        </section>
      </section>

      <section className="ui-print-page mx-auto mt-8 flex max-w-[1100px] flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">{t('exportMapTitle')}</div>
          <div className="mt-2 text-[14px] text-white/60">{payload.selectedOptionLabel}</div>
        </header>
        <div className="relative ui-section ui-map-shell h-[720px] px-0 py-0 backdrop-blur">
          <div className="ui-map-grid pointer-events-none z-0" />
          <MapLegend />
          <div className="absolute inset-0 z-10">
            <MapFlow
              key={`full-${payload.generatedAt}`}
              model={payload.map}
              selectedOptionId={payload.selectedOptionId}
              onSelectOption={() => undefined}
              focusEnabled={false}
              highlightMode="reason"
              highlightIds={payload.highlightIds}
              ref={fullRef}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ExportPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-transparent px-6 py-10" />}>
      <ExportPageInner />
    </Suspense>
  );
}

