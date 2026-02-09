'use client';

import { getAnonUserId } from './anon';

export type AnalyticsEventName =
  | 'session_started'
  | 'demo_viewed'
  | 'map_built'
  | 'map_saved'
  | 'analysis_viewed'
  | 'export_pdf'
  | 'share_link_created'
  | 'pro_unlocked'
  | 'promo_used';

export type AnalyticsContext = {
  page?: string;
  plan?: string;
  source?: string;
};

export const trackEvent = (name: AnalyticsEventName, context: AnalyticsContext = {}) => {
  const anonUserId = getAnonUserId();
  if (!anonUserId) return;
  const payload = {
    name,
    anon_user_id: anonUserId,
    timestamp: Date.now(),
    context
  };
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => undefined);
};

