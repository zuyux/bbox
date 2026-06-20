import { NextRequest, NextResponse } from 'next/server';
import { verifyMessageSignature, verifyMessageSignatureRsv } from '@stacks/encryption';
import { publicKeyToAddressSingleSig } from '@stacks/transactions';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { isAdminAddress } from '@/lib/admin';

type AdminEditPayload = {
  action?: string;
  address?: unknown;
  appId?: unknown;
  app?: {
    name?: unknown;
    description?: unknown;
    category?: unknown;
    link?: unknown;
    imgCID?: unknown;
    tags?: unknown;
  };
};

const normalizeHex = (value: string) => value.trim().replace(/^0x/i, '');

const addressesMatchPublicKey = (address: string, publicKey: string) => {
  const normalizedAddress = address.trim().toUpperCase();
  const mainnetAddress = publicKeyToAddressSingleSig(publicKey, 'mainnet').toUpperCase();
  const testnetAddress = publicKeyToAddressSingleSig(publicKey, 'testnet').toUpperCase();

  return normalizedAddress === mainnetAddress || normalizedAddress === testnetAddress;
};

const normalizeTags = (tags: unknown) => {
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (Array.isArray(tags)) {
    return tags.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
};

const arraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const verifyAdminSignature = ({
  appId,
  publisherAddress,
  signature,
  signedPayload,
  publicKey,
  requestedUpdates,
}: {
  appId: string;
  publisherAddress: string;
  signature: string;
  signedPayload: string;
  publicKey: string;
  requestedUpdates: Record<string, unknown>;
}) => {
  let parsedPayload: AdminEditPayload;
  try {
    parsedPayload = JSON.parse(signedPayload);
  } catch {
    return { valid: false, error: 'Invalid signed admin payload', status: 401 };
  }

  const payloadApp = parsedPayload.app ?? {};
  const payloadTags = normalizeTags(payloadApp.tags);
  const updateTags = Array.isArray(requestedUpdates.tags) ? requestedUpdates.tags.map(String) : [];

  if (
    parsedPayload.action !== 'bbox_admin_app_edit' ||
    String(parsedPayload.appId ?? '').trim() !== appId ||
    String(parsedPayload.address ?? '').trim().toUpperCase() !== publisherAddress.toUpperCase() ||
    String(payloadApp.name ?? '').trim() !== requestedUpdates.name ||
    String(payloadApp.description ?? '').trim() !== requestedUpdates.description ||
    String(payloadApp.category ?? '').trim() !== requestedUpdates.category ||
    String(payloadApp.link ?? '').trim() !== requestedUpdates.link ||
    String(payloadApp.imgCID ?? '').trim() !== requestedUpdates.imgcid ||
    !arraysEqual(payloadTags, updateTags)
  ) {
    return { valid: false, error: 'Signed payload does not match app details', status: 401 };
  }

  const normalizedSignature = normalizeHex(signature);
  const normalizedPublicKey = normalizeHex(publicKey);

  try {
    if (!addressesMatchPublicKey(publisherAddress, normalizedPublicKey)) {
      return { valid: false, error: 'Public key does not match admin address', status: 401 };
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
      : { valid: false, error: 'Invalid admin signature', status: 401 };
  } catch (error) {
    console.error('Signature verification failed:', error);
    return { valid: false, error: 'Invalid admin signature', status: 401 };
  }
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await context.params;
  if (!appId) {
    return NextResponse.json({ error: 'Missing app ID' }, { status: 400 });
  }

  const body = await request.json();
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
  const signaturePayload = typeof body.signature_payload === 'string' ? body.signature_payload : '';
  const signaturePublicKey = typeof body.signature_public_key === 'string' ? body.signature_public_key.trim() : '';
  const publisherAddress = typeof body.publisher_address === 'string' ? body.publisher_address.trim() : '';

  if (!signature || !signaturePayload || !signaturePublicKey || !isAdminAddress(publisherAddress)) {
    return NextResponse.json(
      { error: 'Unauthorized admin update request' },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (typeof body.category === 'string') updates.category = body.category.trim();
  if (typeof body.link === 'string') updates.link = body.link.trim();
  if (typeof body.imgcid === 'string') updates.imgcid = body.imgcid.trim();

  if (typeof body.tags === 'string' || Array.isArray(body.tags)) {
    updates.tags = normalizeTags(body.tags);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid app fields provided for update' },
      { status: 400 }
    );
  }

  const signatureCheck = verifyAdminSignature({
    appId,
    publisherAddress,
    signature,
    signedPayload: signaturePayload,
    publicKey: signaturePublicKey,
    requestedUpdates: updates,
  });

  if (!signatureCheck.valid) {
    return NextResponse.json(
      { error: signatureCheck.error },
      { status: signatureCheck.status }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('bbox_apps')
    .update(updates)
    .eq('id', appId)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return NextResponse.json(
      { error: 'Database error: ' + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, app: data });
}
