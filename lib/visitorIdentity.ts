import { createHmac } from 'crypto';
import type { NextRequest } from 'next/server';

function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0];
  const ip = vercelIp?.split(',')[0] || realIp || forwardedIp;

  if (!ip?.trim()) {
    throw new Error('Unable to determine client IP');
  }

  return ip.trim().toLowerCase();
}

/** A stable, one-way visitor identifier. The raw IP never leaves this function. */
export function getHashedIp(request: NextRequest): string {
  const secret = process.env.IP_HASH_SECRET;

  if (!secret) {
    throw new Error('IP_HASH_SECRET is not configured');
  }

  return createHmac('sha256', secret).update(getClientIp(request)).digest('hex');
}

export async function linkVisitorToAddress(request: NextRequest, address: string) {
  const { supabaseAdmin } = await import('@/lib/supabaseClient');
  const hashedIp = getHashedIp(request);
  const now = new Date().toISOString();

  const [accountResult, profileResult, interestsResult] = await Promise.all([
    supabaseAdmin.from('connected_accounts').update({ hashed_ip: hashedIp }).ilike('address', address),
    supabaseAdmin.from('profiles').update({ hashed_ip: hashedIp }).ilike('address', address),
    supabaseAdmin
      .from('visitor_interests')
      .update({ user_address: address, updated_at: now })
      .eq('hashed_ip', hashedIp),
  ]);

  const error = accountResult.error || profileResult.error || interestsResult.error;
  if (error) throw error;

  return hashedIp;
}
