import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const STATE_COOKIE = 'bbox_github_oauth_state';
const ADDRESS_COOKIE = 'bbox_github_oauth_address';

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  login?: string;
  html_url?: string;
  message?: string;
};

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
}

function redirectToSettings(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/settings?github=${status}`, getBaseUrl(request)));
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' });
  response.cookies.set(ADDRESS_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  const address = request.cookies.get(ADDRESS_COOKIE)?.value;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return clearOAuthCookies(redirectToSettings(request, 'missing_config'));
  }

  if (!code || !state || !storedState || state !== storedState || !address) {
    return clearOAuthCookies(redirectToSettings(request, 'invalid_state'));
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${getBaseUrl(request)}/api/github/callback`,
        state,
      }),
    });

    const tokenBody = (await tokenResponse.json()) as GitHubTokenResponse;

    if (!tokenResponse.ok || !tokenBody.access_token) {
      console.error('GitHub token exchange failed:', tokenBody);
      return clearOAuthCookies(redirectToSettings(request, 'token_error'));
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenBody.access_token}`,
        'User-Agent': 'bbox-github-auth',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });

    const githubUser = (await userResponse.json()) as GitHubUserResponse;

    if (!userResponse.ok || !githubUser.login) {
      console.error('GitHub user fetch failed:', githubUser);
      return clearOAuthCookies(redirectToSettings(request, 'user_error'));
    }

    const now = new Date().toISOString();
    const githubUrl = githubUser.html_url || `https://github.com/${githubUser.login}`;

    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        [{
          address,
          github_url: githubUrl,
          updated_at: now,
          last_active: now,
        }],
        { onConflict: 'address' },
      );

    if (error) {
      console.error('Failed to save GitHub profile connection:', error);
      return clearOAuthCookies(redirectToSettings(request, 'save_error'));
    }

    return clearOAuthCookies(redirectToSettings(request, 'connected'));
  } catch (error) {
    console.error('Unexpected GitHub OAuth callback error:', error);
    return clearOAuthCookies(redirectToSettings(request, 'error'));
  }
}
