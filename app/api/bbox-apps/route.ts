import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeAppRow } from '@/lib/appsUtils';
import { fetchReviewRatingSummaries } from '@/lib/appReviewRatings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const appId = searchParams.get('id');

    let query = supabaseAdmin.from('bbox_apps').select('*');

    if (appId) {
      query = query.eq('id', appId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      const searchValue = `%${search}%`;
      query = query.or(`name.ilike.${searchValue},description.ilike.${searchValue}`);
    }

    query = query.order('rating', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error loading bbox_apps:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    const ratingSummaries = await fetchReviewRatingSummaries(
      supabaseAdmin,
      (data ?? []).map((row) => String(row.id ?? ''))
    );

    const apps = (data ?? [])
      .map((row) => {
        const appId = String(row.id ?? '');
        const ratingSummary = ratingSummaries.get(appId);

        return normalizeAppRow({
          ...row,
          rating: ratingSummary?.rating ?? 0,
          reviewCount: ratingSummary?.reviewCount ?? 0,
        });
      })
      .sort((a, b) => b.rating - a.rating);

    return NextResponse.json({
      success: true,
      apps,
    });
  } catch (error) {
    console.error('API error loading bbox_apps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
