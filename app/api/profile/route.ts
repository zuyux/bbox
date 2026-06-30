import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  PROFILE_EMAIL_CODE_PURPOSE,
  VerifiedEmailTokenError,
  assertVerifiedEmailToken,
} from '@/lib/emailCodeAuth';

const PROFILE_FIELDS = [
  'address',
  'username',
  'email',
  'lightning_address',
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

function normalizeLightningAddress(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!trimmed) return null;

  const lightningAddressRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return lightningAddressRegex.test(trimmed) ? trimmed : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });
    }

    const profileBody = body as Record<string, unknown>;
    const address = typeof profileBody.address === 'string' ? profileBody.address.trim() : '';
    const email = typeof profileBody.email === 'string' ? profileBody.email.trim().toLowerCase() : null;
    const verifiedEmailToken =
      typeof profileBody.verifiedEmailToken === 'string' ? profileBody.verifiedEmailToken : '';

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, address, email, email_verified')
      .ilike('address', address)
      .limit(1)
      .maybeSingle();

    if (existingProfileError) {
      console.error('Error loading profile before save:', existingProfileError);
      return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
    }

    if (email) {
      const [profileEmailResult, accountEmailResult] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('id, address')
          .ilike('email', email)
          .limit(1),
        supabaseAdmin
          .from('connected_accounts')
          .select('address')
          .ilike('email', email)
          .limit(1),
      ]);

      if (profileEmailResult.error || accountEmailResult.error) {
        console.error('Profile email duplicate check failed:', profileEmailResult.error || accountEmailResult.error);
        return NextResponse.json({ error: 'Failed to check email availability' }, { status: 500 });
      }

      const profileMatch = profileEmailResult.data?.[0] ?? null;
      const accountMatch = accountEmailResult.data?.[0] ?? null;
      const profileBelongsToCurrentAddress =
        typeof profileMatch?.address === 'string' &&
        profileMatch.address.toLowerCase() === address.toLowerCase();
      const accountBelongsToCurrentAddress =
        typeof accountMatch?.address === 'string' &&
        accountMatch.address.toLowerCase() === address.toLowerCase();

      if ((profileMatch && !profileBelongsToCurrentAddress) || (accountMatch && !accountBelongsToCurrentAddress)) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
      }
    }

    const lightningAddress = normalizeLightningAddress(profileBody.lightning_address);
    if (lightningAddress === '') {
      return NextResponse.json({ error: 'Invalid Lightning address format' }, { status: 400 });
    }

    const existingEmail = typeof existingProfile?.email === 'string' ? existingProfile.email.toLowerCase() : null;
    const emailRequiresVerification = Boolean(
      email &&
      (!existingProfile || existingEmail !== email || existingProfile.email_verified !== true)
    );

    if (emailRequiresVerification) {
      try {
        assertVerifiedEmailToken(verifiedEmailToken, email as string, PROFILE_EMAIL_CODE_PURPOSE);
      } catch (tokenError) {
        if (tokenError instanceof VerifiedEmailTokenError) {
          return NextResponse.json(
            { error: tokenError.message },
            { status: tokenError.statusCode }
          );
        }

        throw tokenError;
      }
    }

    const now = new Date().toISOString();
    const payload = {
      ...cleanProfilePayload(profileBody),
      address,
      updated_at: now,
      last_active: now,
    };

    if (lightningAddress !== undefined) {
      Object.assign(payload, { lightning_address: lightningAddress });
    }

    if (emailRequiresVerification) {
      Object.assign(payload, { email, email_verified: true });
    } else if (profileBody.email === null || profileBody.email === '') {
      Object.assign(payload, { email_verified: false });
    }

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
