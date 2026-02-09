'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/track';
import { usePlan } from '@/lib/billing/usePlan';

const SESSION_KEY = 'zercon_session_started';

export default function AnalyticsClient() {
  const pathname = usePathname();
  const { plan } = usePlan();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.sessionStorage.getItem(SESSION_KEY);
      if (stored) return;
      trackEvent('session_started', { page: pathname, plan, source: 'direct' });
      window.sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, [pathname, plan]);

  return null;
}

