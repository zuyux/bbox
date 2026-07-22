import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { getHashedIp } from '@/lib/visitorIdentity';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const hashedIp = getHashedIp(request);
    const { data, error } = await supabaseAdmin
      .from('visitor_interests')
      .select('tags')
      .eq('hashed_ip', hashedIp)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ tags: data?.tags ?? [] });
  } catch (error) {
    console.error('Unable to load visitor interests:', error);
    return NextResponse.json({ error: 'Unable to load interests' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.tags)) {
      return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
    }

    const submittedTags: unknown[] = body.tags;
    const tags: string[] = [...new Set(submittedTags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean))];

    if (tags.length > 30 || tags.some((tag) => tag.length > 80)) {
      return NextResponse.json({ error: 'Invalid interests' }, { status: 400 });
    }

    const { data: categoryRows, error: categoryError } = await supabaseAdmin
      .from('bbox_apps')
      .select('category');
    if (categoryError) throw categoryError;

    const allowed = new Set((categoryRows ?? [])
      .map((row) => typeof row.category === 'string' ? row.category.trim() : '')
      .filter(Boolean));
    if (tags.some((tag) => !allowed.has(tag))) {
      return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    }

    const hashedIp = getHashedIp(request);
    const { error } = await supabaseAdmin
      .from('visitor_interests')
      .upsert({ hashed_ip: hashedIp, tags, updated_at: new Date().toISOString() }, { onConflict: 'hashed_ip' });
    if (error) throw error;

    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error('Unable to save visitor interests:', error);
    return NextResponse.json({ error: 'Unable to save interests' }, { status: 500 });
  }
}
