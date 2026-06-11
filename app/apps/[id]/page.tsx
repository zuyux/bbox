import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseClient';
import type { BitcoinApp } from '@/lib/appsUtils';
import AppDetailClient from '@/components/AppDetailClient';

const normalizeAppRow = (row: Record<string, unknown>): BitcoinApp => ({
  id: String(row.id ?? ''),
  name: String(row.name ?? ''),
  description: String(row.description ?? ''),
  category: String(row.category ?? 'Uncategorized'),
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  downloads: String(row.downloads ?? '0'),
  rating: typeof row.rating === 'number' ? row.rating : Number(row.rating) || 0,
  verified: Boolean(row.verified),
  link: String(row.link ?? ''),
  imgCID: typeof row.imgcid === 'string' ? row.imgcid : String(row.imgCID ?? ''),
});

type AppDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const { id: appId } = await params;
  if (!appId) {
    return notFound();
  }

  const { data: appData, error: appError } = await supabaseAdmin
    .from('bbox_apps')
    .select('*')
    .eq('id', appId)
    .single();

  if (appError || !appData) {
    console.error('Unable to load app:', appError);
    return notFound();
  }

  const app = normalizeAppRow(appData);

  const { data: relatedData, error: relatedError } = await supabaseAdmin
    .from('bbox_apps')
    .select('*')
    .eq('category', app.category)
    .neq('id', app.id)
    .limit(4);

  if (relatedError) {
    console.error('Unable to load related apps:', relatedError);
  }

  const relatedApps = Array.isArray(relatedData)
    ? relatedData.map(normalizeAppRow)
    : [];

  return <AppDetailClient app={app} relatedApps={relatedApps} />;
}
