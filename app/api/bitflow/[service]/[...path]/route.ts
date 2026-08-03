import { NextRequest, NextResponse } from 'next/server';
import { enforceApiUsage, ApiUsageError } from '@/lib/server/apiUsage';

const SERVICES = {
  core: {
    host: () => process.env.BITFLOW_API_HOST || 'https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev',
    apiKey: () => process.env.BITFLOW_API_KEY,
  },
  readonly: {
    host: () => process.env.READONLY_CALL_API_HOST || 'https://node.bitflowapis.finance',
    apiKey: () => process.env.READONLY_CALL_API_KEY,
  },
  keeper: {
    host: () => process.env.KEEPER_API_HOST || 'https://bitflow-keeper-test-7owjsmt8.uc.gateway.dev',
    apiKey: () => process.env.KEEPER_API_KEY,
  },
} as const;

type Service = keyof typeof SERVICES;

const isService = (value: string): value is Service => value in SERVICES;

async function proxy(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const match = incomingUrl.pathname.match(/^\/api\/bitflow\/([^/]+)\/(.+)$/);
  if (!match || !isService(match[1])) {
    return NextResponse.json({ error: 'Unknown Bitflow service.' }, { status: 404 });
  }

  const service = SERVICES[match[1]];
  const upstreamHost = service.host().replace(/\/+$/, '');
  const upstreamPath = match[2].replace(/^\/+/, '');
  const upstreamUrl = `${upstreamHost}/${upstreamPath}${incomingUrl.search}`;

  const allowed =
    (match[1] === 'core' && request.method === 'GET' && /^(getAllTokensAndPools|getAllRoutes)$/.test(upstreamPath)) ||
    (match[1] === 'readonly' && request.method === 'GET' && /^v2\/contracts\/interface\/[A-Z0-9]{20,50}\/[a-zA-Z0-9_-]{1,128}$/.test(upstreamPath)) ||
    (match[1] === 'readonly' && request.method === 'POST' && /^v2\/contracts\/call-read\/[A-Z0-9]{20,50}\/[a-zA-Z0-9_-]{1,128}\/[a-zA-Z0-9_-]{1,128}$/.test(upstreamPath));
  if (!allowed) return NextResponse.json({ error: 'Bitflow operation is not allowed.' }, { status: 403 });

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 64 * 1024) return NextResponse.json({ error: 'Proxy request is too large.' }, { status: 413 });
    await enforceApiUsage({ request, scope: `bitflow-${match[1]}`, windowSeconds: 60, maxRequests: 60, maxBytes: 512 * 1024 });
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Accept: request.headers.get('accept') || 'application/json',
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ApiUsageError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Bitflow proxy request failed:', error);
    return NextResponse.json({ error: 'Bitflow API is unavailable.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
