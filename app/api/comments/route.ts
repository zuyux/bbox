import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabaseClient';

const TABLE_NAME = 'submission_comments';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appIdParam = searchParams.get('appId');

    if (!appIdParam) {
      return NextResponse.json({ error: 'Missing appId parameter' }, { status: 400 });
    }

    const appId = Number(appIdParam);
    if (Number.isNaN(appId)) {
      return NextResponse.json({ error: 'Invalid appId parameter' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching comments:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, comments: data ?? [] });
  } catch (error) {
    console.error('GET /api/comments failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const appId = Number(body.appId);
    const address = (body.address || '').trim();
    const message = (body.message || '').trim();
    const signature = (body.signature || '').trim();
    const signedPayload = (body.signedPayload || '').trim();
    const walletType = (body.walletType || 'unknown').trim();
    const publicKey = body.publicKey ? String(body.publicKey).trim() : null;

    if (Number.isNaN(appId) || appId <= 0) {
      return NextResponse.json({ error: 'Invalid appId' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Comment message is required' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Comment is too long (max 1000 characters)' }, { status: 400 });
    }
    if (!signature || !signedPayload) {
      return NextResponse.json({ error: 'Missing signature details' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert([
        {
          app_id: appId,
          address,
          message,
          signature,
          signed_payload: signedPayload,
          wallet_type: walletType,
          public_key: publicKey,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting comment:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (error) {
    console.error('POST /api/comments failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
