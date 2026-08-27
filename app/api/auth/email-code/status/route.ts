import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  createVerifiedEmailToken,
  decodeEmailCodeLinkToken,
  hashEmailCode,
} from '@/lib/emailCodeAuth';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const payload = decodeEmailCodeLinkToken(typeof token === 'string' ? token : '');

    const { data, error } = await supabaseAdmin
      .from('email_verification_codes')
      .select('code_hash, consumed_at, expires_at')
      .ilike('email', payload.email)
      .eq('purpose', payload.purpose)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to load email verification status:', error);
      return NextResponse.json({ error: 'Failed to check verification status' }, { status: 500 });
    }

    const record = data?.[0];
    if (!record) {
      return NextResponse.json({ verified: false });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ verified: false, expired: true });
    }

    if (record.code_hash !== hashEmailCode(payload.email, payload.code, payload.purpose)) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
    }

    if (!record.consumed_at) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: true,
      email: payload.email,
      verifiedEmailToken: createVerifiedEmailToken(payload.email, payload.purpose),
    });
  } catch (error) {
    console.error('Email verification status check failed:', error);
    return NextResponse.json({ error: 'Failed to check verification status' }, { status: 400 });
  }
}
