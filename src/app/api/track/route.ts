import { NextResponse } from 'next/server';
import { trackEvent } from '@/lib/owner/storage';
import type { AnalyticsEvent } from '@/lib/owner/storage';

const allowedEvents = new Set([
  'session_started',
  'demo_viewed',
  'map_built',
  'map_saved',
  'analysis_viewed',
  'export_pdf',
  'share_link_created',
  'pro_unlocked',
  'promo_used'
]);

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AnalyticsEvent>;
  if (!body || !body.anon_user_id || !body.name || !allowedEvents.has(body.name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event: AnalyticsEvent = {
    name: body.name,
    anon_user_id: body.anon_user_id,
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    context: body.context ?? {}
  };
  await trackEvent(event);
  return NextResponse.json({ ok: true });
}

