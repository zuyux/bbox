import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

interface ConnectedAccountRecord {
  email: string;
  address: string;
  passkey: string;
  encrypted_private_key: string | null;
  encrypted_mnemonic: string | null;
  encryption_salt: string | null;
  encryption_iv: string | null;
  encryption_version: string | null;
  wallet_label: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select(
        'email,address,passkey,encrypted_private_key,encrypted_mnemonic,encryption_salt,encryption_iv,encryption_version,wallet_label'
      )
      .ilike('email', normalizedEmail)
      .single<ConnectedAccountRecord>();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (
      !data.encrypted_private_key ||
      !data.encrypted_mnemonic ||
      !data.encryption_salt ||
      !data.encryption_iv
    ) {
      return NextResponse.json(
        { error: 'Account is missing encrypted wallet data' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      account: {
        email: data.email,
        address: data.address,
        passkey: data.passkey,
        encryptedPrivateKey: data.encrypted_private_key,
        encryptedMnemonic: data.encrypted_mnemonic,
        encryptionSalt: data.encryption_salt,
        encryptionIv: data.encryption_iv,
        encryptionVersion: data.encryption_version ?? '1.0.0',
        walletLabel: data.wallet_label ?? 'BBOX Wallet',
      },
    });
  } catch (error) {
    console.error('Email login lookup failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
