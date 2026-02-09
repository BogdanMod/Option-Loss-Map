'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { usePlan } from '@/lib/billing/usePlan';
import { PLAN_LABELS } from '@/lib/billing/plan';
import { loadHistory } from '@/lib/history/storage';
import { getAnonUserId } from '@/lib/analytics/anon';

const navItems = [
  { href: '/map', label: 'navMap' },
  { href: '/history', label: 'navHistory' },
  { href: '/rules', label: 'navRules' },
  { href: '/report', label: 'navReport' }
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const { plan, features, setPlan, isFree } = usePlan();
  const [profileOpen, setProfileOpen] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoNotice, setPromoNotice] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHistoryCount(loadHistory().length);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    setHistoryCount(loadHistory().length);
  }, [profileOpen]);

  useEffect(() => {
    if (!planNotice) return;
    const timer = window.setTimeout(() => setPlanNotice(null), 2000);
    return () => window.clearTimeout(timer);
  }, [planNotice]);

  useEffect(() => {
    if (!promoNotice) return;
    const timer = window.setTimeout(() => setPromoNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [promoNotice]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [profileOpen]);

  const isActive = (href: string) => {
    if (href === '/map' && (pathname === '/' || pathname === '/map')) return true;
    return pathname === href;
  };

  const availableItems = [
    t('upgradeItemHistory'),
    ...(features.allowCompare ? [t('upgradeItemCompare')] : []),
    ...(features.allowHiddenRules ? [t('upgradeItemRules')] : []),
    ...(features.allowPdf ? [t('upgradeItemPdf')] : []),
    ...(features.allowShare ? [t('upgradeItemShare')] : [])
  ];

  const unavailableItems = [
    ...(features.allowCompare ? [] : [t('upgradeItemCompare')]),
    ...(features.allowHiddenRules ? [] : [t('upgradeItemRules')]),
    ...(features.allowPdf ? [] : [t('upgradeItemPdf')]),
    ...(features.allowShare ? [] : [t('upgradeItemShare')])
  ];

  const handlePromoApply = async () => {
    if (!promoCode.trim() || promoLoading) return;
    const anonUserId = getAnonUserId();
    if (!anonUserId) return;
    setPromoLoading(true);
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promoCode.trim(),
        anon_user_id: anonUserId,
        context: { page: pathname ?? '/map', plan, source: 'promo' }
      })
    });
    if (res.ok) {
      setPlan('pro');
      setPromoNotice('Промокод активирован.');
      setPromoCode('');
    } else {
      setPromoNotice('Промокод недействителен.');
    }
    setPromoLoading(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-6 px-8 ui-transition">
        <div className="flex items-center gap-10">
          <Link href="/map" className="flex flex-col leading-tight">
            <span className="text-[13px] uppercase tracking-[0.2em] text-white/70">ZER·CON — Option Loss Map</span>
          </Link>
          <div className="hidden items-center gap-6 text-[15px] font-medium text-white/60 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-1 py-1 ui-transition ${
                  isActive(item.href)
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {t(item.label)}
                  {!features.allowHiddenRules && item.href === '/rules' ? (
                    <span className="ui-chip text-[13px] text-white/60">
                      PRO
                    </span>
                  ) : null}
                </span>
                {isActive(item.href) ? (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-accent-500/80" />
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[13px] font-semibold text-white/70 ui-button ui-press"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            П
          </button>

          {profileOpen ? (
            <div className="absolute right-0 mt-3 w-72 ui-section p-4 text-[13px] text-white/70 shadow-soft backdrop-blur ui-modal-enter">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-white/50">
                {t('profileTitle')}
              </div>
              <div className="mt-2 space-y-1">
                <div>
                  {t('profilePlan')}: {PLAN_LABELS[plan]}
                </div>
                <div>
                  {t('profileSaved')}: {historyCount} / {features.historyLimit}
                </div>
              </div>

              <div className="mt-3 text-[13px] font-semibold text-white/50">{t('profileAvailable')}</div>
              <ul className="mt-2 space-y-1">
                {availableItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span>✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {unavailableItems.length ? (
                <>
                  <div className="mt-3 text-[13px] font-semibold text-white/50">
                    {t('profileUnavailable')}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {unavailableItems.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span>—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <div className="mt-4 flex justify-end">
                {isFree ? (
                  <Link
                    href="/upgrade"
                    className="ui-button-secondary"
                  >
                    {t('paywallUpgrade')}
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 ui-card px-3 py-3">
                <div className="text-[13px] font-semibold text-white/50">Промокод</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value)}
                    placeholder="Введите код"
                    className="h-9 flex-1 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[13px] text-white"
                  />
                  <button type="button" className="ui-button-secondary" onClick={handlePromoApply}>
                    {promoLoading ? '...' : 'Активировать'}
                  </button>
                </div>
                {promoNotice ? <div className="mt-2 text-[12px] text-white/50">{promoNotice}</div> : null}
              </div>

              {process.env.NODE_ENV !== 'production' ? (
                <div className="mt-4 ui-card px-3 py-3">
                  <div className="text-[13px] font-semibold text-white/50">{t('planMode')}</div>
                  <div className="mt-2 flex gap-3 text-[13px] text-white/70">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="plan"
                        checked={plan === 'free'}
                        onChange={() => {
                          setPlan('free');
                          setPlanNotice(t('planSwitchedFree'));
                        }}
                      />
                      {t('planFree')}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="plan"
                        checked={plan === 'pro'}
                        onChange={() => {
                          setPlan('pro');
                          setPlanNotice(t('planSwitchedPro'));
                        }}
                      />
                      {t('planPaid')}
                    </label>
                  </div>
                  {planNotice ? (
                    <div className="mt-2 text-[13px] text-white/50">{planNotice}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
