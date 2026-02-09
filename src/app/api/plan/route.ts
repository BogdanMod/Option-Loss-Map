import { NextResponse } from 'next/server';
import { isProAccess } from '@/lib/owner/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anonUserId = searchParams.get('anon_user_id');
  if (!anonUserId) {
    return NextResponse.json({ plan: 'free' });
  }
  const isPro = await isProAccess(anonUserId);
  return NextResponse.json({ plan: isPro ? 'pro' : 'free' });
}

