import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { decryptPortableEncryptedWallet, type PortableEncryptedWalletData } from '@/lib/encryptedStorage';
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
    const { email, password } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = trimmedEmail.toLowerCase();
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select(
        'email,address,passkey,encrypted_private_key,encrypted_mnemonic,encryption_salt,encryption_iv,encryption_version,wallet_label'
      )
      .ilike('email', normalizedEmail)
      .single<ConnectedAccountRecord>();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
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

    if (!data.passkey) {
      return NextResponse.json(
        { error: 'Account is missing passkey data' },
        { status: 422 }
      );
    }

    let decryptedWallet;
    try {
      const payload: PortableEncryptedWalletData = {
        encryptedMnemonic: data.encrypted_mnemonic,
        encryptedPrivateKey: data.encrypted_private_key,
        address: data.address,
        label: data.wallet_label ?? 'BBOX Wallet',
        salt: data.encryption_salt,
        iv: data.encryption_iv,
        version: data.encryption_version ?? '1.0.0',
      };

      decryptedWallet = decryptPortableEncryptedWallet(payload, password);
    } catch (decryptError) {
      console.warn('Failed to decrypt wallet during email login:', decryptError);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const passkeyHash = createHash('sha256')
      .update(decryptedWallet.privateKey + password)
      .digest('hex');

    if (passkeyHash !== data.passkey) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      wallet: {
        address: decryptedWallet.address,
        privateKey: decryptedWallet.privateKey,
        mnemonic: decryptedWallet.mnemonic,
        label: decryptedWallet.label,
      },
      account: {
        email: data.email,
        address: data.address,
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
