import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  createVerifiedEmailToken,
  decodeEmailCodeLinkToken,
  hashEmailCode,
} from '@/lib/emailCodeAuth';

const redirectWithStatus = (request: NextRequest, status: 'success' | 'error', params: Record<string, string>) => {
  const url = new URL('/auth/email-code/verified', request.nextUrl.origin);
  url.searchParams.set('status', status);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';

  try {
    const payload = decodeEmailCodeLinkToken(token);

    const { data, error } = await supabaseAdmin
      .from('email_verification_codes')
      .select('id, code_hash, attempts, consumed_at, expires_at')
      .ilike('email', payload.email)
      .eq('purpose', payload.purpose)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to load email verification link:', error);
      return redirectWithStatus(request, 'error', { message: 'Unable to verify this email link.' });
    }

    const record = data?.[0];
    if (!record) {
      return redirectWithStatus(request, 'error', { message: 'Verification link not found. Request a new code.' });
    }

    if (record.consumed_at) {
      return redirectWithStatus(request, 'error', { message: 'Verification link was already used. Request a new code.' });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return redirectWithStatus(request, 'error', { message: 'Verification link expired. Request a new code.' });
    }

    if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      return redirectWithStatus(request, 'error', { message: 'Too many attempts. Request a new code.' });
    }

    if (record.code_hash !== hashEmailCode(payload.email, payload.code, payload.purpose)) {
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);

      return redirectWithStatus(request, 'error', { message: 'Invalid verification link.' });
    }

    await supabaseAdmin
      .from('email_verification_codes')
      .update({
        attempts: record.attempts + 1,
        consumed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return redirectWithStatus(request, 'success', {
      email: payload.email,
      purpose: payload.purpose,
      verifiedEmailToken: createVerifiedEmailToken(payload.email, payload.purpose),
    });
  } catch (error) {
    console.error('Email verification link failed:', error);
    return redirectWithStatus(request, 'error', { message: 'Verification link is invalid or expired.' });
  }
}
