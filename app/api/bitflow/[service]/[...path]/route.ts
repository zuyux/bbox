import { NextRequest, NextResponse } from 'next/server';

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
  const apiKey = service.apiKey();

  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Accept: request.headers.get('accept') || 'application/json',
        'Content-Type': request.headers.get('content-type') || 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
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
    console.error('Bitflow proxy request failed:', error);
    return NextResponse.json({ error: 'Bitflow API is unavailable.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
