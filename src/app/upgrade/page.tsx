'use client';

import { useState } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { usePlan } from '@/lib/billing/usePlan';

export default function UpgradePage() {
  const { setPlan } = usePlan();
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    const subject = encodeURIComponent('Заявка на полную версию');
    const body = encodeURIComponent(`Email: ${email}\n\nЦель:\n${purpose}`);
    const mailto = `mailto:hello@example.com?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    console.log('Заявка на полную версию', { email, purpose });
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-transparent px-8 py-12">
      <div className="mx-auto max-w-[960px] ui-section px-8 py-10 backdrop-blur">
        <div className="ui-caption uppercase tracking-wide">{t('upgradeTitle')}</div>
        <h1 className="mt-2 ui-heading-lg">{t('upgradeTitle')}</h1>
        <p className="mt-2 text-[15px] text-white/60">{t('upgradeSubtitle')}</p>
        <div className="mt-3 ui-caption">
          <div>{t('positioningLine1')}</div>
          <div>{t('positioningLine2')}</div>
        </div>

        <div className="mt-6 space-y-2 text-[15px] text-white/80">
          <div>✔ {t('upgradeItemHistory')}</div>
          <div>✔ {t('upgradeItemRules')}</div>
          <div>✔ {t('upgradeItemPdf')}</div>
          <div>✔ {t('upgradeItemShare')}</div>
          <div>✔ {t('upgradeItemCompare')}</div>
        </div>

        <p className="mt-6 text-[13px] text-white/40">{t('upgradeFooter')}</p>

        <div className="mt-6 ui-card px-4 py-4 text-[13px] text-white/70">
          {submitted ? (
            <div className="text-[15px] text-white/80">{t('upgradeThanks')}</div>
          ) : (
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-[13px] text-white/50">{t('upgradeEmail')}</span>
                <input
                  className="ui-input-field"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[13px] text-white/50">{t('upgradePurpose')}</span>
                <textarea
                  className="ui-textarea min-h-[90px]"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="ui-button-primary"
              >
                {t('upgradeCta')}
              </button>
            </form>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/map"
            className="ui-button-secondary"
          >
            {t('rulesBack')}
          </Link>
          {process.env.NODE_ENV !== 'production' ? (
            <button
              type="button"
              className="ui-button-secondary"
              onClick={() => setPlan('pro')}
            >
              {t('upgradeUnlockDev')}
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
