import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeAppRow } from '@/lib/appsUtils';
import { fetchReviewRatingSummaries } from '@/lib/appReviewRatings';
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

  const { data: relatedData, error: relatedError } = await supabaseAdmin
    .from('bbox_apps')
    .select('*')
    .eq('category', String(appData.category ?? ''))
    .neq('id', String(appData.id ?? ''))
    .limit(4);

  if (relatedError) {
    console.error('Unable to load related apps:', relatedError);
  }

  const allRows = [appData, ...(Array.isArray(relatedData) ? relatedData : [])];
  const ratingSummaries = await fetchReviewRatingSummaries(
    supabaseAdmin,
    allRows.map((row) => String(row.id ?? ''))
  );

  const normalizeWithReviewRating = (row: Record<string, unknown>) => {
    const rowId = String(row.id ?? '');
    const ratingSummary = ratingSummaries.get(rowId);

    return normalizeAppRow({
      ...row,
      rating: ratingSummary?.rating ?? 0,
      reviewCount: ratingSummary?.reviewCount ?? 0,
    });
  };

  const app = normalizeWithReviewRating(appData);

  const relatedApps = Array.isArray(relatedData)
    ? relatedData.map(normalizeWithReviewRating)
    : [];

  return <AppDetailClient app={app} relatedApps={relatedApps} />;
}
