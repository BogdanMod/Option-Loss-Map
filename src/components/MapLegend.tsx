'use client';

import { t } from '@/lib/i18n';

export type LegendFocus = 'current' | 'primary' | 'secondary' | 'distant';

type MapLegendProps = {
  active?: LegendFocus | null;
  onHover?: (value: LegendFocus | null) => void;
};

const legendItems: { key: LegendFocus; label: string; dotClass: string }[] = [
  { key: 'current', label: t('mapLegendCurrent'), dotClass: 'ui-legend-current' },
  { key: 'primary', label: t('mapLegendPrimary'), dotClass: 'ui-legend-primary' },
  { key: 'secondary', label: t('mapLegendSecondary'), dotClass: 'ui-legend-secondary' },
  { key: 'distant', label: t('mapLegendDistant'), dotClass: 'ui-legend-distant' }
];

export default function MapLegend({ active, onHover }: MapLegendProps) {
  return (
    <div className="ui-map-legend" onMouseLeave={() => onHover?.(null)}>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{t('mapLegendTitle')}</div>
      <div className="mt-2 grid gap-1 text-[11px] text-white/60">
        {legendItems.map((item) => (
          <div
            key={item.key}
            className={`ui-legend-item ${active === item.key ? 'ui-legend-active' : ''}`}
            onMouseEnter={() => onHover?.(item.key)}
          >
            <span className={`ui-legend-dot ${item.dotClass}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-white/40">{t('mapLegendHint')}</div>
    </div>
  );
}

