import { NextRequest, NextResponse } from 'next/server';
import { verifyMessageSignature, verifyMessageSignatureRsv } from '@stacks/encryption';
import { publicKeyToAddressSingleSig } from '@stacks/transactions';
import { supabaseAdmin } from '@/lib/supabaseClient';

const TABLE_NAME = 'app_reviews';

type SignedReviewPayload = {
  action?: string;
  appId?: unknown;
  rating?: unknown;
  reviewText?: unknown;
  address?: unknown;
};

const normalizeHex = (value: string) => value.trim().replace(/^0x/i, '');

const addressesMatchPublicKey = (address: string, publicKey: string) => {
  const normalizedAddress = address.trim().toUpperCase();
  const mainnetAddress = publicKeyToAddressSingleSig(publicKey, 'mainnet').toUpperCase();
  const testnetAddress = publicKeyToAddressSingleSig(publicKey, 'testnet').toUpperCase();

  return normalizedAddress === mainnetAddress || normalizedAddress === testnetAddress;
};

const verifyReviewSignature = ({
  appId,
  reviewerAddress,
  rating,
  reviewText,
  signature,
  signedPayload,
  publicKey,
}: {
  appId: string;
  reviewerAddress: string;
  rating: number;
  reviewText: string;
  signature: string;
  signedPayload: string;
  publicKey: string | null;
}) => {
  if (!publicKey) {
    return { valid: false, error: 'Missing wallet public key' };
  }

  let parsedPayload: SignedReviewPayload;
  try {
    parsedPayload = JSON.parse(signedPayload);
  } catch {
    return { valid: false, error: 'Invalid signed review payload' };
  }

  const payloadAppId = String(parsedPayload.appId ?? '').trim();
  const payloadRating = Number(parsedPayload.rating);
  const payloadReviewText = typeof parsedPayload.reviewText === 'string' ? parsedPayload.reviewText.trim() : '';
  const payloadAddress = typeof parsedPayload.address === 'string' ? parsedPayload.address.trim() : '';

  if (
    parsedPayload.action !== 'bbox_app_review' ||
    payloadAppId !== appId ||
    payloadRating !== rating ||
    payloadReviewText !== reviewText ||
    payloadAddress !== reviewerAddress
  ) {
    return { valid: false, error: 'Signed payload does not match review details' };
  }

  const normalizedSignature = normalizeHex(signature);
  const normalizedPublicKey = normalizeHex(publicKey);

  try {
    if (!addressesMatchPublicKey(reviewerAddress, normalizedPublicKey)) {
      return { valid: false, error: 'Public key does not match reviewer address' };
    }

    const validSignature =
      verifyMessageSignature({
        signature: normalizedSignature,
        message: signedPayload,
        publicKey: normalizedPublicKey,
      }) ||
      verifyMessageSignatureRsv({
        signature: normalizedSignature,
        message: signedPayload,
        publicKey: normalizedPublicKey,
      });

    return validSignature
      ? { valid: true }
      : { valid: false, error: 'Invalid review signature' };
  } catch {
    return { valid: false, error: 'Invalid review signature' };
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = (searchParams.get('appId') || '').trim();

    if (!appId) {
      return NextResponse.json({ error: 'Missing appId parameter' }, { status: 400 });
    }
    if (appId.length > 100) {
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
    const appId = String(body.appId ?? '').trim();
    const reviewerAddress = (body.reviewerAddress || '').trim();
    const rating = Number(body.rating);
    const reviewText = (body.reviewText || '').trim();
    const walletType = (body.walletType || 'unknown').trim();
    const signature = (body.signature || '').trim();
    const signedPayload = (body.signedPayload || '').trim();
    const publicKey = body.publicKey ? String(body.publicKey).trim() : null;

    if (!appId || appId.length > 100) {
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

    const signatureCheck = verifyReviewSignature({
      appId,
      reviewerAddress,
      rating,
      reviewText,
      signature,
      signedPayload,
      publicKey,
    });

    if (!signatureCheck.valid) {
      return NextResponse.json({ error: signatureCheck.error }, { status: 401 });
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
