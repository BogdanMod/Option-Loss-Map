import { kv } from '@vercel/kv';

export type PromoCode = {
  code: string;
  type: 'full' | 'trial';
  max_uses: number;
  used_count: number;
  expires_at?: number | null;
};

export type AnalyticsEvent = {
  name: string;
  anon_user_id: string;
  timestamp: number;
  context?: {
    page?: string;
    plan?: string;
    source?: string;
  };
};

const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const memoryStore = {
  promos: new Map<string, PromoCode>(),
  events: [] as AnalyticsEvent[],
  counters: new Map<string, number>(),
  sessions: new Map<string, number>(),
  proAccess: new Map<string, { type: 'full' | 'trial'; expiresAt?: number }>()
};

const countKey = (name: string) => `events:count:${name}`;
const promoKey = (code: string) => `promo:${code.toLowerCase()}`;
const proKey = (anonId: string) => `pro:${anonId}`;

export const trackEvent = async (event: AnalyticsEvent) => {
  if (hasKV) {
    await kv.lpush('events:log', JSON.stringify(event));
    await kv.ltrim('events:log', 0, 999);
    await kv.incr(countKey(event.name));
    if (event.name === 'session_started') {
      await kv.zadd('events:sessions', { score: event.timestamp, member: event.anon_user_id });
    }
    return;
  }
  memoryStore.events.unshift(event);
  memoryStore.events = memoryStore.events.slice(0, 1000);
  memoryStore.counters.set(event.name, (memoryStore.counters.get(event.name) ?? 0) + 1);
  if (event.name === 'session_started') {
    memoryStore.sessions.set(event.anon_user_id, event.timestamp);
  }
};

export const getMetrics = async () => {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  if (hasKV) {
    await kv.zremrangebyscore('events:sessions', 0, dayAgo);
    const activeSessions = await kv.zcount('events:sessions', dayAgo, now);
    const mapBuilt = Number((await kv.get(countKey('map_built'))) ?? 0);
    const exportsCount = Number((await kv.get(countKey('export_pdf'))) ?? 0);
    return {
      activeSessions,
      mapBuilt,
      exportsCount
    };
  }
  let activeSessions = 0;
  memoryStore.sessions.forEach((timestamp) => {
    if (timestamp >= dayAgo) activeSessions += 1;
  });
  const mapBuilt = memoryStore.counters.get('map_built') ?? 0;
  const exportsCount = memoryStore.counters.get('export_pdf') ?? 0;
  return { activeSessions, mapBuilt, exportsCount };
};

export const getLastEvent = async (): Promise<AnalyticsEvent | null> => {
  if (hasKV) {
    const entries = (await kv.lrange('events:log', 0, 0)) as string[];
    const raw = entries?.[0];
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AnalyticsEvent;
    } catch {
      return null;
    }
  }
  return memoryStore.events[0] ?? null;
};

export const savePromo = async (promo: PromoCode) => {
  const normalized = { ...promo, code: promo.code.toLowerCase() };
  if (hasKV) {
    await kv.set(promoKey(normalized.code), normalized);
    await kv.sadd('promo:codes', normalized.code);
    return;
  }
  memoryStore.promos.set(normalized.code, normalized);
};

export const listPromos = async (): Promise<PromoCode[]> => {
  if (hasKV) {
    const codes = (await kv.smembers('promo:codes')) as string[];
    const promos = await Promise.all(codes.map((code) => kv.get(promoKey(code))));
    return promos.filter(Boolean) as PromoCode[];
  }
  return Array.from(memoryStore.promos.values());
};

export const getPromo = async (code: string): Promise<PromoCode | null> => {
  const normalized = code.toLowerCase();
  if (hasKV) {
    const promo = await kv.get(promoKey(normalized));
    return (promo as PromoCode) ?? null;
  }
  return memoryStore.promos.get(normalized) ?? null;
};

export const updatePromo = async (promo: PromoCode) => {
  await savePromo(promo);
};

export const grantProAccess = async (
  anonUserId: string,
  type: 'full' | 'trial',
  expiresAt?: number
) => {
  if (hasKV) {
    if (type === 'trial' && expiresAt) {
      const ttlSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      await kv.set(proKey(anonUserId), 'trial', ttlSeconds ? { ex: ttlSeconds } : undefined);
    } else {
      await kv.set(proKey(anonUserId), 'full');
    }
    return;
  }
  memoryStore.proAccess.set(anonUserId, { type, expiresAt });
};

export const isProAccess = async (anonUserId: string): Promise<boolean> => {
  if (hasKV) {
    const value = await kv.get(proKey(anonUserId));
    return Boolean(value);
  }
  const record = memoryStore.proAccess.get(anonUserId);
  if (!record) return false;
  if (record.type === 'trial' && record.expiresAt && record.expiresAt < Date.now()) {
    memoryStore.proAccess.delete(anonUserId);
    return false;
  }
  return true;
};

