import { NextResponse } from 'next/server';

// Retained temporarily so older clients fail closed instead of reaching the
// former unauthenticated profile mutation implementation.
export async function POST() {
  return NextResponse.json(
    { error: 'Deprecated endpoint. Use /api/profile/avatar with wallet authorization.' },
    { status: 410 },
  );
}
