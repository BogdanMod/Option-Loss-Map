'use client';

import { t } from '@/lib/i18n';

export default function UiKitPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <main className="min-h-screen bg-transparent px-8 py-12">
        <div className="mx-auto max-w-[960px] ui-section px-6 py-8 text-center">
          <div className="ui-heading">UI Kit недоступен</div>
          <div className="mt-2 text-[15px] text-white/60">
            Этот экран доступен только в режиме разработки.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-8 py-12">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <header className="ui-section px-6 py-5 backdrop-blur">
          <div className="ui-caption uppercase tracking-wide">UI Kit</div>
          <h1 className="mt-2 ui-heading-lg">Единый стиль интерфейса</h1>
          <p className="mt-2 text-[15px] text-white/60">
            Набор базовых компонентов и состояний для проверки консистентности.
          </p>
        </header>

        <section className="ui-section px-6 py-5">
          <div className="ui-heading">Кнопки</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="ui-button-primary">
              {t('formBuild')}
            </button>
            <button type="button" className="ui-button-secondary">
              {t('formClear')}
            </button>
            <button type="button" className="ui-button-ghost">
              {t('rulesBack')}
            </button>
            <button type="button" className="ui-button-secondary" disabled>
              {t('formBuild')}
            </button>
          </div>
        </section>

        <section className="ui-section px-6 py-5">
          <div className="ui-heading">Поля ввода</div>
          <div className="mt-4 grid gap-4">
            <input className="ui-input-field" placeholder={t('formPlaceholderTitle')} />
            <textarea className="ui-textarea" placeholder={t('formPlaceholderState')} />
            <select className="ui-input-field">
              <option>{t('domainData')}</option>
              <option>{t('domainProduct')}</option>
            </select>
          </div>
        </section>

        <section className="ui-section px-6 py-5">
          <div className="ui-heading">Карточки</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="ui-card px-4 py-4">
              <div className="text-[15px] font-semibold text-white">{t('blockSummary')}</div>
              <div className="mt-2 text-[13px] text-white/60">{t('mainEffectEmpty')}</div>
            </div>
            <div className="ui-card px-4 py-4">
              <div className="text-[15px] font-semibold text-white">{t('blockClosed')}</div>
              <div className="mt-2 text-[13px] text-white/60">{t('rulesEmptySubtitle')}</div>
            </div>
          </div>
        </section>

        <section className="ui-section px-6 py-5">
          <div className="ui-heading">Списки</div>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="ui-card flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[15px] font-semibold text-white">Пример записи {item}</div>
                  <div className="mt-1 text-[13px] text-white/50">
                    {t('domainData')} · сегодня 14:3{item}
                  </div>
                </div>
                <button type="button" className="ui-button-secondary">
                  {t('historyOpen')}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
