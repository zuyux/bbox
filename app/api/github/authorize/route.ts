import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';

const STATE_COOKIE = 'bbox_github_oauth_state';
const ADDRESS_COOKIE = 'bbox_github_oauth_address';

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'GitHub authentication is not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid authorization request' }, { status: 400 });
  }
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    await authorizeProfileMutation({ body, method: 'POST', path: '/api/github/authorize', address });
  } catch (error) {
    if (error instanceof ProfileMutationAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const state = randomBytes(24).toString('hex');
  const baseUrl = getBaseUrl(request);
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');

  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${baseUrl}/api/github/callback`);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  const response = NextResponse.json({ authorizeUrl: authorizeUrl.toString() });
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
