import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const APP_REVIEWS_TABLE = 'app_reviews';

export type ReviewRatingSummary = {
  rating: number;
  reviewCount: number;
};

type ReviewRatingRow = {
  app_id: string | number | null;
  rating: number | string | null;
};

export const getLegacyReviewAppId = (appId: string) => {
  const hash = crypto.createHash('sha256').update(appId).digest();
  return 1_000_000_000 + (hash.readUInt32BE(0) % 1_000_000_000);
};

const getReviewLookupIds = (appId: string) => [
  appId,
  String(getLegacyReviewAppId(appId)),
];

const isLegacyBigintAppIdError = (error: { code?: string; message?: string } | null) => {
  return error?.code === '22P02' && /bigint/i.test(error.message || '');
};

export const buildReviewRatingSummaryMap = (
  appIds: string[],
  reviews: ReviewRatingRow[]
) => {
  const summariesByReviewAppId = new Map<string, { sum: number; count: number }>();

  reviews.forEach((review) => {
    const appId = review.app_id == null ? '' : String(review.app_id);
    const rating = Number(review.rating);

    if (!appId || Number.isNaN(rating)) {
      return;
    }

    const current = summariesByReviewAppId.get(appId) ?? { sum: 0, count: 0 };
    current.sum += rating;
    current.count += 1;
    summariesByReviewAppId.set(appId, current);
  });

  return appIds.reduce<Map<string, ReviewRatingSummary>>((summaryMap, appId) => {
    const combined = getReviewLookupIds(appId).reduce(
      (acc, lookupId) => {
        const summary = summariesByReviewAppId.get(lookupId);
        if (!summary) {
          return acc;
        }

        return {
          sum: acc.sum + summary.sum,
          count: acc.count + summary.count,
        };
      },
      { sum: 0, count: 0 }
    );

    if (combined.count > 0) {
      summaryMap.set(appId, {
        rating: Number((combined.sum / combined.count).toFixed(1)),
        reviewCount: combined.count,
      });
    }

    return summaryMap;
  }, new Map());
};

export const fetchReviewRatingSummaries = async (
  supabaseClient: SupabaseClient,
  appIds: string[]
) => {
  const uniqueAppIds = Array.from(new Set(appIds.filter(Boolean)));
  if (uniqueAppIds.length === 0) {
    return new Map<string, ReviewRatingSummary>();
  }

  const lookupIds = uniqueAppIds.flatMap(getReviewLookupIds);
  let { data, error } = await supabaseClient
    .from(APP_REVIEWS_TABLE)
    .select('app_id, rating')
    .in('app_id', lookupIds);

  if (isLegacyBigintAppIdError(error)) {
    const legacyLookupIds = uniqueAppIds.map(getLegacyReviewAppId);
    const legacyResult = await supabaseClient
      .from(APP_REVIEWS_TABLE)
      .select('app_id, rating')
      .in('app_id', legacyLookupIds);

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw error;
  }

  return buildReviewRatingSummaryMap(uniqueAppIds, data ?? []);
};
