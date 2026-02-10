'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapEdge, MapModel, MapNode } from '@/lib/map/types';
import { t } from '@/lib/i18n';
import { MapFlow, type MapFlowHandle } from '@/components/MapFlow';
import BottomSheet from '@/components/BottomSheet';

type MobileFullscreenMapProps = {
  mapModel: MapModel | null;
  mapVersion: number;
  selectedOptionId: string;
  selectedOptionLabel: string;
  focusEnabled: boolean;
  highlightMode: 'none' | 'closedFuture' | 'reason' | 'metric';
  highlightIds: { nodeIds: string[]; edgeIds: string[] };
  reasons: { id: string; text: string; tags: string[] }[];
  closedTop: MapEdge['closedFutures'][number][];
  closedRest: MapEdge['closedFutures'][number][];
  metrics?: MapEdge['metrics'];
  totalFutureStates: number;
  mainEffect: string;
  focusedNode?: MapNode | null;
  onClose: () => void;
  onSelectOption: (id: string) => void;
  onFocusNode: (node: MapNode | null) => void;
  onReasonTap: (tags: string[], id: string) => void;
  onClosedTap: (item: MapEdge['closedFutures'][number], id: string) => void;
};

export default function MobileFullscreenMap({
  mapModel,
  mapVersion,
  selectedOptionId,
  selectedOptionLabel,
  focusEnabled,
  highlightMode,
  highlightIds,
  reasons,
  closedTop,
  closedRest,
  metrics,
  totalFutureStates,
  mainEffect,
  focusedNode,
  onClose,
  onSelectOption,
  onFocusNode,
  onReasonTap,
  onClosedTap
}: MobileFullscreenMapProps) {
  const mapRef = useRef<MapFlowHandle | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => mapRef.current?.fit());
  }, [mapVersion]);

  return (
    <div className="fixed inset-0 z-50 bg-ink-950">
      <div className="absolute inset-0">
        <div className="ui-map-grid pointer-events-none z-0" />
        {mapModel ? (
          <div className="absolute inset-0 z-10 ui-map-awake">
            <MapFlow
              key={`mobile-${mapVersion}`}
              model={mapModel}
              selectedOptionId={selectedOptionId}
              onSelectOption={onSelectOption}
              onFocusNode={onFocusNode}
              focusEnabled={focusEnabled}
              highlightMode={highlightMode}
              highlightIds={highlightIds}
              ref={mapRef}
            />
          </div>
        ) : null}
      </div>
      <div className="ui-mobile-topbar">
        <button type="button" className="ui-button-secondary" onClick={onClose}>
          {t('mobileBack')}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" className="ui-button-secondary" onClick={() => mapRef.current?.centerOnCurrent()}>
            {t('centerView')}
          </button>
          <button type="button" className="ui-button-secondary" onClick={() => mapRef.current?.fit()}>
            {t('fitView')}
          </button>
          <button type="button" className="ui-button-secondary" onClick={() => setInfoOpen(true)}>
            {t('mobileInfo')}
          </button>
          <button type="button" className="ui-button-secondary" onClick={() => setLegendOpen(true)}>
            {t('mobileLegend')}
          </button>
        </div>
      </div>
      <BottomSheet open={legendOpen} title={t('mapLegendTitle')} onClose={() => setLegendOpen(false)}>
        <div className="grid gap-2 text-[13px] text-white/70">
          <div className="flex items-center gap-2">
            <span className="ui-legend-dot ui-legend-current" />
            {t('mapLegendCurrent')}
          </div>
          <div className="flex items-center gap-2">
            <span className="ui-legend-dot ui-legend-primary" />
            {t('mapLegendPrimary')}
          </div>
          <div className="flex items-center gap-2">
            <span className="ui-legend-dot ui-legend-secondary" />
            {t('mapLegendSecondary')}
          </div>
          <div className="flex items-center gap-2">
            <span className="ui-legend-dot ui-legend-distant" />
            {t('mapLegendDistant')}
          </div>
        </div>
      </BottomSheet>
      <BottomSheet open={infoOpen} title={t('mobileInfo')} onClose={() => setInfoOpen(false)}>
        <div className="space-y-4 text-[13px] text-white/70">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/40">{t('selectedOption')}</div>
            <div className="mt-2 text-[14px] text-white/90">{selectedOptionLabel}</div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/40">{t('blockSummary')}</div>
            <div className="mt-2 text-[22px] font-semibold text-white">{metrics?.optionLossPct ?? 0}%</div>
            <div className="mt-1 text-[12px] text-white/70">
              {t('optionLossContext', { count: totalFutureStates })}
            </div>
            <div className="mt-3 text-[12px] uppercase tracking-wide text-white/40">{t('pointOfNoReturn')}</div>
            <div className="mt-1 text-[13px] text-white/80">{metrics?.pnrFlag ? t('yes') : t('no')}</div>
            <div className="mt-1 text-[12px] text-white/70">
              {metrics?.pnrFlag ? `${t('pnrYesPrefix')} ${metrics.pnrText}` : t('pnrNoText')}
            </div>
            <div className="mt-3 text-[12px] uppercase tracking-wide text-white/40">{t('mainEffectTitle')}</div>
            <div className="mt-1 text-[13px] text-white/80">{mainEffect || t('mainEffectEmpty')}</div>
          </div>
          {focusedNode?.consequence ? (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-white/40">{t('consequenceTitle')}</div>
              <div className="mt-1 text-[13px] text-white/90">{focusedNode.consequence}</div>
            </div>
          ) : null}
          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/40">{t('blockWhy')}</div>
            {reasons.length ? (
              <div className="mt-2 grid gap-2">
                {reasons.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    className="ui-card px-3 py-2 text-left"
                    onClick={() => onReasonTap(reason.tags, reason.id)}
                  >
                    <div className="text-[13px] text-white/85">{reason.text}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-[13px] text-white/60">{t('reasonsEmpty')}</div>
            )}
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/40">{t('blockClosed')}</div>
            {closedTop.length ? (
              <div className="mt-2 grid gap-2">
                {(showAllClosed ? [...closedTop, ...closedRest] : closedTop).map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    type="button"
                    className="ui-card px-3 py-2 text-left"
                    onClick={() => onClosedTap(item, `${item.title}-${index}`)}
                  >
                    <div className="text-[13px] text-white/85">{item.title}</div>
                    {item.category ? (
                      <div className="mt-1 text-[12px] text-white/60">{item.category}</div>
                    ) : null}
                  </button>
                ))}
                {closedRest.length ? (
                  <button
                    type="button"
                    className="text-left text-[12px] text-white/60"
                    onClick={() => setShowAllClosed((prev) => !prev)}
                  >
                    {showAllClosed ? t('showLess') : t('showMore')}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 text-[13px] text-white/60">{t('closedEmpty')}</div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

