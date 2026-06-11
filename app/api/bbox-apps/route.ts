import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const normalizeAppRow = (row: Record<string, unknown>) => ({
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

    return NextResponse.json({
      success: true,
      apps: (data ?? []).map(normalizeAppRow),
    });
  } catch (error) {
    console.error('API error loading bbox_apps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
