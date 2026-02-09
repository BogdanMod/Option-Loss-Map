'use client';

import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';

type MobileOnboardingProps = {
  onShowMap: () => void;
};

type OptionCard = { id: string; title: string; hint: string };

const options: OptionCard[] = [
  { id: 'A', title: 'Нанять сейчас', hint: 'Быстрый рост команды' },
  { id: 'B', title: 'Подождать', hint: 'Сохраняем гибкость' },
  { id: 'C', title: 'Использовать фриланс', hint: 'Точечно закрыть задачи' }
];

export default function MobileOnboarding({ onShowMap }: MobileOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);

  const canShowMap = selected.length >= 2;

  const selectedLabel = useMemo(() => selected.join(', '), [selected]);

  if (step === 3) {
    return null;
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-10">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 text-center">
        {step === 1 ? (
          <>
            <h1 className="text-[22px] font-semibold text-white">{t('mobileOnboardTitle')}</h1>
            <p className="text-[15px] text-white/70">{t('mobileOnboardSubtitle')}</p>
            <div className="text-[13px] text-white/70">{t('mobileOnboardExample')}</div>
            <div className="text-[12px] text-white/60">{t('mobileOnboardNote')}</div>
            <button type="button" className="ui-button-primary" onClick={() => setStep(2)}>
              {t('mobileOnboardContinue')}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[20px] font-semibold text-white">{t('mobileOnboardOptionsTitle')}</h2>
            <div className="grid gap-3 text-left">
              {options.map((option) => {
                const isActive = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`ui-card px-4 py-3 ${isActive ? 'ui-option-active' : ''}`}
                    style={{ minHeight: 56 }}
                    onClick={() =>
                      setSelected((prev) =>
                        prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id]
                      )
                    }
                  >
                    <div className="text-[12px] uppercase tracking-wide text-white/40">{option.id}</div>
                    <div className="mt-1 text-[15px] text-white">{option.title}</div>
                    <div className="mt-1 text-[13px] text-white/70">{option.hint}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-[12px] text-white/50">
              {selected.length ? `${t('mobileOnboardSelected')}: ${selectedLabel}` : t('mobileOnboardSelectHint')}
            </div>
            <button
              type="button"
              className="ui-button-primary"
              disabled={!canShowMap}
              onClick={() => {
                setStep(3);
                onShowMap();
              }}
            >
              {t('mobileOnboardShowMap')}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

