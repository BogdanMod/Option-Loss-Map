import { NextResponse } from 'next/server';
import { grantProAccess, trackEvent } from '@/lib/owner/storage';

const isAuthorized = (request: Request) => {
  const key = request.headers.get('x-owner-key');
  return Boolean(key && process.env.OWNER_KEY && key === process.env.OWNER_KEY);
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json()) as { anon_user_id?: string };
  if (!body.anon_user_id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await grantProAccess(body.anon_user_id, 'full');
  await trackEvent({
    name: 'pro_unlocked',
    anon_user_id: body.anon_user_id,
    timestamp: Date.now(),
    context: { source: 'owner' }
  });
  return NextResponse.json({ ok: true });
}

