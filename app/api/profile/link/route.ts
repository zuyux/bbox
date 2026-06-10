import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

type WalletLinkPayload = {
  address?: string;
  nostrPublicKey?: string;
  walletType?: string;
  walletSignature?: string;
  walletPublicKey?: string;
  proofMessage?: string;
  proofTimestamp?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: WalletLinkPayload = await request.json();
    const {
      address,
      nostrPublicKey,
      walletType,
      walletSignature,
      walletPublicKey,
      proofMessage,
      proofTimestamp,
    } = body;

    if (!address || !nostrPublicKey || !walletType || !walletSignature || !proofMessage || !proofTimestamp) {
      return NextResponse.json({ error: 'Missing required wallet proof fields' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      address,
      linked_nostr_public_key: nostrPublicKey,
      wallet_type: walletType,
      wallet_signature: walletSignature,
      wallet_public_key: walletPublicKey,
      wallet_proof_message: proofMessage,
      wallet_proof_timestamp: proofTimestamp,
      updated_at: now,
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert([payload], { onConflict: 'address' });

    if (error) {
      console.error('Error saving wallet link proof:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error saving wallet link proof:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
