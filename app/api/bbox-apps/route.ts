import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeAppRow } from '@/lib/appsUtils';

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
