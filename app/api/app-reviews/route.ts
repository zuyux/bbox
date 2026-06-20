import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyMessageSignature, verifyMessageSignatureRsv } from '@stacks/encryption';
import { publicKeyToAddressSingleSig } from '@stacks/transactions';
import { supabaseAdmin } from '@/lib/supabaseClient';

const TABLE_NAME = 'app_reviews';
const LEGACY_APPS_TABLE_NAME = 'apps';
const BBOX_APPS_TABLE_NAME = 'bbox_apps';

type SignedReviewPayload = {
  action?: string;
  appId?: unknown;
  rating?: unknown;
  reviewText?: unknown;
  address?: unknown;
};

const normalizeHex = (value: string) => value.trim().replace(/^0x/i, '');

const isLegacyBigintAppIdError = (error: { code?: string; message?: string } | null) => {
  return error?.code === '22P02' && /bigint/i.test(error.message || '');
};

const getLegacyReviewAppId = (appId: string) => {
  const hash = crypto.createHash('sha256').update(appId).digest();
  return 1_000_000_000 + (hash.readUInt32BE(0) % 1_000_000_000);
};

const ensureLegacyReviewApp = async (appId: string) => {
  const legacyAppId = getLegacyReviewAppId(appId);

  const { data: existingLegacyApp, error: existingLegacyError } = await supabaseAdmin
    .from(LEGACY_APPS_TABLE_NAME)
    .select('id')
    .eq('id', legacyAppId)
    .maybeSingle();

  if (existingLegacyError) {
    throw existingLegacyError;
  }
  if (existingLegacyApp) {
    return legacyAppId;
  }

  const { data: bboxApp, error: bboxAppError } = await supabaseAdmin
    .from(BBOX_APPS_TABLE_NAME)
    .select('name, description, category, tags, link, imgcid, downloads, rating, verified')
    .eq('id', appId)
    .maybeSingle();

  if (bboxAppError) {
    throw bboxAppError;
  }

  const { error: legacyInsertError } = await supabaseAdmin
    .from(LEGACY_APPS_TABLE_NAME)
    .insert([
      {
        id: legacyAppId,
        name: String(bboxApp?.name || `BBOX app ${appId}`),
        description: String(bboxApp?.description || 'BBOX app review compatibility record'),
        category: String(bboxApp?.category || 'Uncategorized'),
        tags: Array.isArray(bboxApp?.tags) ? bboxApp.tags.map(String) : [],
        version: '0.0.0',
        website_url: String(bboxApp?.link || ''),
        icon_cid: String(bboxApp?.imgcid || ''),
        downloads: 0,
        rating: typeof bboxApp?.rating === 'number' ? bboxApp.rating : Number(bboxApp?.rating) || 0,
        verified: Boolean(bboxApp?.verified),
        publisher_address: 'bbox-review-compatibility',
        publisher_name: 'BBOX',
        publisher_email: 'reviews@bbox.local',
        status: 'pending',
      },
    ]);

  if (legacyInsertError) {
    throw legacyInsertError;
  }

  return legacyAppId;
};

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

    let { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select('id, app_id, reviewer_address, rating, review_text, wallet_type, created_at')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    if (isLegacyBigintAppIdError(error)) {
      const legacyAppId = getLegacyReviewAppId(appId);
      const legacyResult = await supabaseAdmin
        .from(TABLE_NAME)
        .select('id, app_id, reviewer_address, rating, review_text, wallet_type, created_at')
        .eq('app_id', legacyAppId)
        .order('created_at', { ascending: true });
      data = legacyResult.data;
      error = legacyResult.error;
    }

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

    const reviewRow = {
      app_id: appId as string | number,
      reviewer_address: reviewerAddress,
      wallet_type: walletType,
      signature,
      signed_payload: signedPayload,
      public_key: publicKey,
      rating,
      review_text: reviewText,
    };

    let { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .upsert([reviewRow], { onConflict: 'app_id,reviewer_address', ignoreDuplicates: false })
      .select()
      .single();

    if (isLegacyBigintAppIdError(error)) {
      const legacyAppId = await ensureLegacyReviewApp(appId);
      const legacyResult = await supabaseAdmin
        .from(TABLE_NAME)
        .upsert(
          [
            {
              ...reviewRow,
              app_id: legacyAppId,
            },
          ],
          { onConflict: 'app_id,reviewer_address', ignoreDuplicates: false }
        )
        .select()
        .single();
      data = legacyResult.data ? { ...legacyResult.data, app_id: appId } : legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      console.error('Supabase error inserting review:', error);
      return NextResponse.json(
        {
          error: 'Database error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('POST /api/app-reviews failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
