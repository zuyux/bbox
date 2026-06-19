import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const TABLE_NAME = 'app_reviews';

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
      .select('id, app_id, reviewer_address, rating, review_text, wallet_type, created_at')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching reviews:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reviews: data ?? [] });
  } catch (error) {
    console.error('GET /api/app-reviews failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const appId = Number(body.appId);
    const reviewerAddress = (body.reviewerAddress || '').trim();
    const rating = Number(body.rating);
    const reviewText = (body.reviewText || '').trim();
    const walletType = (body.walletType || 'unknown').trim();
    const signature = (body.signature || '').trim();
    const signedPayload = (body.signedPayload || '').trim();
    const publicKey = body.publicKey ? String(body.publicKey).trim() : null;

    if (Number.isNaN(appId) || appId <= 0) {
      return NextResponse.json({ error: 'Invalid appId' }, { status: 400 });
    }
    if (!reviewerAddress) {
      return NextResponse.json({ error: 'Missing reviewer address' }, { status: 400 });
    }
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }
    if (!reviewText) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }
    if (reviewText.length > 1000) {
      return NextResponse.json({ error: 'Review is too long (max 1000 characters)' }, { status: 400 });
    }
    if (!signature || !signedPayload) {
      return NextResponse.json({ error: 'Missing signature details' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .upsert(
        [
          {
            app_id: appId,
            reviewer_address: reviewerAddress,
            wallet_type: walletType,
            signature,
            signed_payload: signedPayload,
            public_key: publicKey,
            rating,
            review_text: reviewText,
          },
        ],
        { onConflict: 'app_id,reviewer_address', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting review:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('POST /api/app-reviews failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
