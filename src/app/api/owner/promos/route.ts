import { NextResponse } from 'next/server';
import { listPromos, savePromo, type PromoCode } from '@/lib/owner/storage';

const isAuthorized = (request: Request) => {
  const key = request.headers.get('x-owner-key');
  return Boolean(key && process.env.OWNER_KEY && key === process.env.OWNER_KEY);
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const promos = await listPromos();
  return NextResponse.json({ ok: true, promos });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json()) as Partial<PromoCode>;
  if (!body.code || !body.type || typeof body.max_uses !== 'number') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const promo: PromoCode = {
    code: body.code.toLowerCase(),
    type: body.type,
    max_uses: body.max_uses,
    used_count: body.used_count ?? 0,
    expires_at: body.expires_at ?? null
  };
  await savePromo(promo);
  return NextResponse.json({ ok: true });
}

