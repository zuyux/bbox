import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This legacy upload endpoint is disabled. Use authenticated Vercel Blob upload.' },
    { status: 410 },
  );
}
