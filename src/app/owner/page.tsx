import { notFound } from 'next/navigation';
import OwnerClient from './OwnerClient';
import { getLastEvent, getMetrics, listPromos } from '@/lib/owner/storage';

export const dynamic = 'force-dynamic';

type OwnerPageProps = {
  searchParams?: { key?: string };
};

export default async function OwnerPage({ searchParams }: OwnerPageProps) {
  const ownerKey = searchParams?.key ?? '';
  if (!process.env.OWNER_KEY || ownerKey !== process.env.OWNER_KEY) {
    return notFound();
  }
  const [metrics, promos, lastEvent] = await Promise.all([getMetrics(), listPromos(), getLastEvent()]);
  return (
    <OwnerClient
      ownerKey={ownerKey}
      initialMetrics={metrics}
      initialPromos={promos}
      initialLastEvent={lastEvent}
    />
  );
}

