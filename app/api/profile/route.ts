import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const PROFILE_FIELDS = [
  'address',
  'username',
  'email',
  'display_name',
  'tagline',
  'biography',
  'location',
  'website',
  'twitter',
  'discord',
  'github_url',
  'instagram',
  'linkedin',
  'artstation',
  'sketchfab',
  'fab',
  'turbosquid',
  'cgtrader',
  'behance',
  'skills',
  'occupation',
  'company',
  'years_experience',
  'bitcoin_experience_level',
  'bitcoin_tech_stack',
  'bitcoin_project_url',
  'avatar_url',
  'avatar_cid',
  'banner_url',
  'banner_cid',
  'portfolio_urls',
  'profile_public',
  'show_email',
  'show_location',
  'email_notifications',
  'push_notifications',
  'marketing_emails',
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

function cleanProfilePayload(body: Record<string, unknown>) {
  const payload: Partial<Record<ProfileField, unknown>> = {};

  PROFILE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  });

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });
    }

    const profileBody = body as Record<string, unknown>;
    const address = typeof profileBody.address === 'string' ? profileBody.address.trim() : '';

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      ...cleanProfilePayload(profileBody),
      address,
      updated_at: now,
      last_active: now,
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert([payload], { onConflict: 'address' })
      .select('*')
      .single();

    if (error) {
      console.error('Error saving profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error('Unexpected profile save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
