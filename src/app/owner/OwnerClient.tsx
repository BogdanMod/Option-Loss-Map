'use client';

import { useMemo, useState } from 'react';
import type { AnalyticsEvent, PromoCode } from '@/lib/owner/storage';

type Metrics = {
  activeSessions: number;
  mapBuilt: number;
  exportsCount: number;
};

type OwnerClientProps = {
  ownerKey: string;
  initialMetrics: Metrics;
  initialPromos: PromoCode[];
  initialLastEvent: AnalyticsEvent | null;
};

const formatDate = (value?: number | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const relativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return `${Math.floor(diff / 86_400_000)} дн назад`;
};

const eventLabels: Record<string, string> = {
  session_started: 'Новая сессия',
  demo_viewed: 'Просмотр демо',
  map_built: 'Построена карта',
  map_saved: 'Карта сохранена',
  analysis_viewed: 'Открыт анализ',
  export_pdf: 'Экспорт PDF',
  share_link_created: 'Создана ссылка',
  pro_unlocked: 'Доступ PRO',
  promo_used: 'Промокод использован'
};

const getPromoStatus = (promo: PromoCode) => {
  const now = Date.now();
  const isExpired = promo.expires_at && promo.expires_at < now;
  const isLimit = promo.used_count >= promo.max_uses;
  if (isExpired || isLimit) return { label: 'Истёк', tone: 'bg-rose-500/10 text-rose-200', row: 'bg-rose-500/5' };
  const usageRate = promo.max_uses ? promo.used_count / promo.max_uses : 0;
  if (usageRate >= 0.8) {
    return { label: 'Почти исчерпан', tone: 'bg-amber-500/10 text-amber-200', row: 'bg-amber-500/5' };
  }
  return { label: 'Активен', tone: 'bg-emerald-500/10 text-emerald-200', row: 'bg-emerald-500/5' };
};

export default function OwnerClient({ ownerKey, initialMetrics, initialPromos, initialLastEvent }: OwnerClientProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [promos, setPromos] = useState(initialPromos);
  const [lastEvent] = useState(initialLastEvent);
  const [grantId, setGrantId] = useState('');
  const [grantNotice, setGrantNotice] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    type: 'full' as 'full' | 'trial',
    maxUses: 5,
    expiresAt: ''
  });
  const [promoNotice, setPromoNotice] = useState<string | null>(null);

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', 'x-owner-key': ownerKey }), [ownerKey]);

  const refreshMetrics = async () => {
    const res = await fetch('/api/owner/metrics', { headers });
    if (!res.ok) return;
    const data = (await res.json()) as { metrics: Metrics };
    setMetrics(data.metrics);
  };

  const refreshPromos = async () => {
    const res = await fetch('/api/owner/promos', { headers });
    if (!res.ok) return;
    const data = (await res.json()) as { promos: PromoCode[] };
    setPromos(data.promos);
  };

  const handleGrant = async () => {
    if (!grantId.trim()) return;
    const res = await fetch('/api/owner/grant', {
      method: 'POST',
      headers,
      body: JSON.stringify({ anon_user_id: grantId.trim() })
    });
    setGrantNotice(res.ok ? 'Доступ выдан.' : 'Не удалось выдать доступ.');
    if (res.ok) setGrantId('');
    window.setTimeout(() => setGrantNotice(null), 2000);
  };

  const handleCreatePromo = async () => {
    if (!promoForm.code.trim()) return;
    const expiresAtValue = promoForm.expiresAt ? Date.parse(promoForm.expiresAt) : null;
    const res = await fetch('/api/owner/promos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: promoForm.code.trim(),
        type: promoForm.type,
        max_uses: Number(promoForm.maxUses),
        expires_at: expiresAtValue
      })
    });
    setPromoNotice(res.ok ? 'Промокод создан.' : 'Не удалось создать промокод.');
    if (res.ok) {
      setPromoForm({ code: '', type: promoForm.type, maxUses: promoForm.maxUses, expiresAt: '' });
      refreshPromos();
    }
    window.setTimeout(() => setPromoNotice(null), 2000);
  };

  return (
    <main className="min-h-screen bg-transparent px-8 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header>
          <h1 className="text-[22px] font-semibold text-white">Панель владельца</h1>
          <div className="mt-1 text-[13px] text-white/50">Внутренняя аналитика и доступ</div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="ui-section px-4 py-3">
            <div className="text-[12px] text-white/50">Активных сессий (24ч)</div>
            <div className="mt-2 text-[20px] text-white">{metrics.activeSessions}</div>
            {metrics.activeSessions === 0 ? (
              <div className="mt-1 text-[12px] text-white/40">Пока нет данных</div>
            ) : null}
          </div>
          <div className="ui-section px-4 py-3">
            <div className="text-[12px] text-white/50">Карт построено</div>
            <div className="mt-2 text-[20px] text-white">{metrics.mapBuilt}</div>
            {metrics.mapBuilt === 0 ? (
              <div className="mt-1 text-[12px] text-white/40">Пока нет данных</div>
            ) : null}
          </div>
          <div className="ui-section px-4 py-3">
            <div className="text-[12px] text-white/50">Экспортов</div>
            <div className="mt-2 text-[20px] text-white">{metrics.exportsCount}</div>
            {metrics.exportsCount === 0 ? (
              <div className="mt-1 text-[12px] text-white/40">Пока нет данных</div>
            ) : null}
          </div>
        </section>
        <div className="text-[13px] text-white/50">
          Последняя активность:{' '}
          {lastEvent
            ? `${eventLabels[lastEvent.name] ?? lastEvent.name} · ${relativeTime(lastEvent.timestamp)}`
            : 'Пока нет данных'}
        </div>

        <section className="ui-section px-4 py-4">
          <div className="text-[13px] font-semibold text-white/70">Выдать PRO вручную</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={grantId}
              onChange={(event) => setGrantId(event.target.value)}
              placeholder="anon_user_id"
              className="h-10 w-72 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white"
            />
            <button type="button" className="ui-button-secondary" onClick={handleGrant}>
              Выдать PRO
            </button>
            {grantNotice ? <div className="text-[12px] text-white/50">{grantNotice}</div> : null}
          </div>
        </section>

        <section className="ui-section px-4 py-4">
          <div className="text-[13px] font-semibold text-white/70">Создать промокод</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_120px_120px_1fr_auto]">
            <input
              value={promoForm.code}
              onChange={(event) => setPromoForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="CODE2026"
              className="h-10 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white"
            />
            <select
              value={promoForm.type}
              onChange={(event) => setPromoForm((prev) => ({ ...prev, type: event.target.value as 'full' | 'trial' }))}
              className="h-10 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white/70"
            >
              <option value="full">Полный</option>
              <option value="trial">Триал</option>
            </select>
            <input
              type="number"
              value={promoForm.maxUses}
              onChange={(event) => setPromoForm((prev) => ({ ...prev, maxUses: Number(event.target.value) }))}
              placeholder="Лимит"
              className="h-10 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white"
            />
            <input
              type="date"
              value={promoForm.expiresAt}
              onChange={(event) => setPromoForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              className="h-10 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white/70"
            />
            <button type="button" className="ui-button-secondary" onClick={handleCreatePromo}>
              Создать
            </button>
          </div>
          {promoNotice ? <div className="mt-2 text-[12px] text-white/50">{promoNotice}</div> : null}
        </section>

        <section className="ui-section px-4 py-4">
          <div className="text-[13px] font-semibold text-white/70">Промокоды</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13px] text-white/70">
              <thead className="text-[12px] uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-2 pr-4">Код</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2 pr-4">Использовано</th>
                  <th className="py-2 pr-4">Лимит</th>
                  <th className="py-2 pr-4">Истекает</th>
                </tr>
              </thead>
              <tbody>
                {promos.length ? (
                  promos.map((promo) => {
                    const status = getPromoStatus(promo);
                    return (
                    <tr key={promo.code} className={`border-t border-white/5 ${status.row}`}>
                      <td className="py-2 pr-4">{promo.code}</td>
                      <td className="py-2 pr-4">{promo.type === 'full' ? 'Полный' : 'Триал'}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-[12px] ${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="py-2 pr-4">{promo.used_count}</td>
                      <td className="py-2 pr-4">{promo.max_uses}</td>
                      <td className="py-2 pr-4">{formatDate(promo.expires_at)}</td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-3 text-white/40" colSpan={6}>
                      Промокоды не созданы.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

