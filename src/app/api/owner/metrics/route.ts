import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/owner/storage';

const isAuthorized = (request: Request) => {
  const key = request.headers.get('x-owner-key');
  return Boolean(key && process.env.OWNER_KEY && key === process.env.OWNER_KEY);
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const metrics = await getMetrics();
  return NextResponse.json({ ok: true, metrics });
}

