import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="ui-section px-8 py-10 backdrop-blur">
          <h1 className="text-[26px] font-semibold tracking-tight text-white">{t('appTitle')}</h1>
          <p className="mt-3 text-[15px] text-white/60">{t('demoHint')}</p>
          <Link
            href="/map"
            className="mt-6 ui-button-primary"
          >
            {t('demoLink')}
          </Link>
        </div>
      </div>
    </main>
  );
}
