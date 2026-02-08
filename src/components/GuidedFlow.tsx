'use client';

import { t } from '@/lib/i18n';

type GuidedStep = 1 | 2 | 3;

type GuidedFlowProps = {
  step: GuidedStep;
  showIntro?: boolean;
  onNext: () => void;
  onBuild: () => void;
  onClose: () => void;
  onFinish: () => void;
};

const stepText: Record<GuidedStep, string> = {
  1: t('guidedStep1'),
  2: t('guidedStep2'),
  3: t('guidedStep3')
};

export default function GuidedFlow({ step, showIntro, onNext, onBuild, onClose, onFinish }: GuidedFlowProps) {
  return (
    <div className="flex items-center justify-between gap-4 ui-section px-4 py-3 text-[15px] text-white/70 backdrop-blur">
      <div className="text-[15px]">
        {showIntro ? (
          <div className="mb-2 text-[13px] text-white/40">
            <div>{t('positioningLine1')}</div>
            <div>{t('positioningLine2')}</div>
          </div>
        ) : null}
        <div>{stepText[step]}</div>
      </div>
      <div className="flex items-center gap-2">
        {step === 1 ? (
          <button
            type="button"
            className="ui-button-secondary"
            onClick={onNext}
          >
            {t('guidedNext')}
          </button>
        ) : null}
        {step === 2 ? (
          <button
            type="button"
            className="ui-button-primary"
            onClick={onBuild}
          >
            {t('guidedBuild')}
          </button>
        ) : null}
        {step === 3 ? (
          <>
            <button
              type="button"
              className="ui-button-secondary"
              onClick={onFinish}
            >
              {t('guidedGotIt')}
            </button>
            <button
              type="button"
              className="ui-button-primary"
              onClick={onFinish}
            >
              {t('guidedFinish')}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="ml-1 text-white/40 ui-transition hover:text-white/70"
          onClick={onClose}
          aria-label={t('guidedClose')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
