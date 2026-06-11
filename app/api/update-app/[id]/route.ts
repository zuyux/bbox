import { NextRequest, NextResponse } from 'next/server';
import { bytesToHex } from '@stacks/common';
import { publicKeyFromSignatureRsv, publicKeyToAddressSingleSig } from '@stacks/transactions';
import { sha256 } from '@noble/hashes/sha256';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { ADMIN_ADDRESS } from '@/lib/admin';

const getStacksNetwork = () =>
  process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet'
    ? STACKS_MAINNET
    : STACKS_TESTNET;

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

  if (!signature || !signaturePayload || !signaturePublicKey || publisherAddress !== ADMIN_ADDRESS) {
    return NextResponse.json(
      { error: 'Unauthorized admin update request' },
      { status: 403 }
    );
  }

  try {
    const messageHash = bytesToHex(
      sha256(new TextEncoder().encode(signaturePayload))
    );
    const recoveredPublicKey = publicKeyFromSignatureRsv(
      messageHash,
      signature
    );

    const recoveredAddress = publicKeyToAddressSingleSig(
      recoveredPublicKey,
      getStacksNetwork()
    );
    const signerAddress = publicKeyToAddressSingleSig(
      signaturePublicKey,
      getStacksNetwork()
    );

    if (recoveredAddress !== signerAddress) {
      return NextResponse.json(
        { error: 'Signature does not match the provided public key' },
        { status: 401 }
      );
    }

    if (String(signerAddress).trim() !== ADMIN_ADDRESS) {
      return NextResponse.json(
        { error: 'Signature did not come from the admin address' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid admin signature' },
      { status: 401 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (typeof body.category === 'string') updates.category = body.category.trim();
  if (typeof body.link === 'string') updates.link = body.link.trim();
  if (typeof body.imgcid === 'string') updates.imgcid = body.imgcid.trim();

  if (typeof body.tags === 'string') {
    updates.tags = body.tags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean);
  } else if (Array.isArray(body.tags)) {
    updates.tags = body.tags.map(String).map((tag: string) => tag.trim()).filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid app fields provided for update' },
      { status: 400 }
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
