import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const STATE_COOKIE = 'bbox_github_oauth_state';
const ADDRESS_COOKIE = 'bbox_github_oauth_address';

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const address = request.nextUrl.searchParams.get('address')?.trim();

  if (!clientId) {
    return NextResponse.redirect(new URL('/settings?github=missing_config', request.url));
  }

  if (!address) {
    return NextResponse.redirect(new URL('/settings?github=missing_address', request.url));
  }

  const state = randomBytes(24).toString('hex');
  const baseUrl = getBaseUrl(request);
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');

  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${baseUrl}/api/github/callback`);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/',
  };

  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  response.cookies.set(ADDRESS_COOKIE, address, cookieOptions);

  return response;
}
