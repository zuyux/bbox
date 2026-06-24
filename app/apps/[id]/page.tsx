import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeAppRow } from '@/lib/appsUtils';
import AppDetailClient from '@/components/AppDetailClient';

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
