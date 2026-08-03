import type { NextRequest } from 'next/server';
import { getHashedIp } from '@/lib/visitorIdentity';
import { supabaseAdmin } from '@/lib/supabaseClient';

export class ApiUsageError extends Error { constructor(message = 'Rate limit or quota exceeded', public status = 429) { super(message); } }

async function consume(key: string, windowSeconds: number, requests: number, bytes: number, maxBytes: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const { data, error } = await supabaseAdmin.rpc('consume_api_quota', {
    p_bucket_key: `${key}:${bucket}`,
    p_expires_at: new Date((bucket + 1) * windowSeconds * 1000).toISOString(),
    p_max_requests: requests,
    p_add_bytes: bytes,
    p_max_bytes: maxBytes,
  });
  if (error) { console.error('API quota check failed:', error); throw new ApiUsageError('Usage controls unavailable', 503); }
  if (data !== true) throw new ApiUsageError();
}

export async function enforceApiUsage(args: {
  request: NextRequest; scope: string; address?: string; bytes?: number;
  windowSeconds?: number; maxRequests?: number; maxBytes?: number;
}) {
  const windowSeconds = args.windowSeconds ?? 60;
  const maxRequests = args.maxRequests ?? 20;
  const maxBytes = args.maxBytes ?? 100 * 1024 * 1024;
  const bytes = args.bytes ?? 0;
  await consume(`ip:${getHashedIp(args.request)}:${args.scope}`, windowSeconds, maxRequests, bytes, maxBytes);
  if (args.address) await consume(`account:${args.address.toUpperCase()}:${args.scope}`, windowSeconds, maxRequests, bytes, maxBytes);
}
