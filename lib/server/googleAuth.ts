import { createVerifiedEmailToken } from '@/lib/emailCodeAuth';

export interface VerifiedGoogleIdentity {
  email: string;
  name?: string;
  picture?: string;
  subject: string;
  verifiedEmailToken: string;
}

interface GoogleTokenInfoResponse {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
}

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export async function verifyGoogleIdToken(idToken: unknown): Promise<VerifiedGoogleIdentity> {
  if (typeof idToken !== 'string' || idToken.length < 32) {
    throw new Error('Google credential is required.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in is not configured.');
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, {
    cache: 'no-store',
  });
  const tokenInfo = (await response.json()) as GoogleTokenInfoResponse;

  if (!response.ok || tokenInfo.error) {
    throw new Error(tokenInfo.error_description || 'Google credential could not be verified.');
  }

  if (tokenInfo.aud !== clientId) {
    throw new Error('Google credential audience mismatch.');
  }

  if (!tokenInfo.sub) {
    throw new Error('Google credential is missing an account subject.');
  }

  if (!tokenInfo.email || tokenInfo.email_verified !== true && tokenInfo.email_verified !== 'true') {
    throw new Error('Google account email is not verified.');
  }

  const email = tokenInfo.email.trim().toLowerCase();

  return {
    email,
    name: tokenInfo.name,
    picture: tokenInfo.picture,
    subject: tokenInfo.sub,
    verifiedEmailToken: createVerifiedEmailToken(email),
  };
}
