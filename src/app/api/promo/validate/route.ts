import { NextResponse } from 'next/server';
import { getPromo, updatePromo, grantProAccess, trackEvent } from '@/lib/owner/storage';

type ValidateBody = {
  code?: string;
  anon_user_id?: string;
  context?: { page?: string; plan?: string; source?: string };
};

const getTrialExpiresAt = () => {
  const days = Number(process.env.PROMO_TRIAL_DAYS ?? 7);
  return Date.now() + days * 24 * 60 * 60 * 1000;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ValidateBody;
  const code = body.code?.trim().toLowerCase();
  const anonUserId = body.anon_user_id;
  if (!code || !anonUserId) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }
  const promo = await getPromo(code);
  if (!promo) {
    return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 });
  }
  const expiresAt = promo.expires_at ?? null;
  if (expiresAt && expiresAt < Date.now()) {
    return NextResponse.json({ ok: false, reason: 'expired' }, { status: 400 });
  }
  if (promo.used_count >= promo.max_uses) {
    return NextResponse.json({ ok: false, reason: 'limit' }, { status: 400 });
  }

  const nextPromo = { ...promo, used_count: promo.used_count + 1 };
  await updatePromo(nextPromo);

  if (promo.type === 'trial') {
    await grantProAccess(anonUserId, 'trial', getTrialExpiresAt());
  } else {
    await grantProAccess(anonUserId, 'full');
  }

  await trackEvent({
    name: 'promo_used',
    anon_user_id: anonUserId,
    timestamp: Date.now(),
    context: body.context ?? {}
  });
  await trackEvent({
    name: 'pro_unlocked',
    anon_user_id: anonUserId,
    timestamp: Date.now(),
    context: { ...body.context, source: body.context?.source ?? 'promo' }
  });

  return NextResponse.json({ ok: true, plan: 'pro' });
}

