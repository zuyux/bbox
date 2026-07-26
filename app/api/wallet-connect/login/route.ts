import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

import { decryptPortableEncryptedWallet, type PortableEncryptedWalletData } from '@/lib/encryptedStorage';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { linkVisitorToAddress } from '@/lib/visitorIdentity';

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
  bitcoin_address: string | null;
  rootstock_address: string | null;
  liquid_address: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, email, password } = await request.json();
    const suppliedIdentifier = identifier ?? email;

    if (!suppliedIdentifier || typeof suppliedIdentifier !== 'string') {
      return NextResponse.json(
        { error: 'Username or email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const normalizedIdentifier = suppliedIdentifier.trim().toLowerCase();
    if (!normalizedIdentifier) {
      return NextResponse.json(
        { error: 'Username or email is required' },
        { status: 400 }
      );
    }

    let accountAddress: string | null = null;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);

    if (!isEmail) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('address')
        .ilike('username', normalizedIdentifier)
        .limit(2);

      if (profileError || profiles?.length !== 1) {
        return NextResponse.json(
          { error: 'Invalid username, email, or password' },
          { status: 401 }
        );
      }
      accountAddress = profiles[0].address;
    }

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select(
        'email,address,passkey,encrypted_private_key,encrypted_mnemonic,encryption_salt,encryption_iv,encryption_version,wallet_label,bitcoin_address,rootstock_address,liquid_address'
      )
      .ilike(isEmail ? 'email' : 'address', isEmail ? normalizedIdentifier : accountAddress!)
      .single<ConnectedAccountRecord>();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Invalid username, email, or password' },
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
        bitcoinAddress: data.bitcoin_address ?? undefined,
        rootstockAddress: data.rootstock_address ?? undefined,
        liquidAddress: data.liquid_address ?? undefined,
      };

      decryptedWallet = decryptPortableEncryptedWallet(payload, password);
    } catch (decryptError) {
      console.warn('Failed to decrypt wallet during email login:', decryptError);
      return NextResponse.json(
        { error: 'Invalid username, email, or password' },
        { status: 401 }
      );
    }

    const passkeyHash = createHash('sha256')
      .update(decryptedWallet.privateKey + password)
      .digest('hex');

    if (passkeyHash !== data.passkey) {
      return NextResponse.json(
        { error: 'Invalid username, email, or password' },
        { status: 401 }
      );
    }

    try {
      await linkVisitorToAddress(request, data.address);
    } catch (linkError) {
      console.warn('Unable to link visitor interests during sign in:', linkError);
    }

    return NextResponse.json({
      wallet: {
        address: decryptedWallet.address,
        privateKey: decryptedWallet.privateKey,
        mnemonic: decryptedWallet.mnemonic,
        label: decryptedWallet.label,
        bitcoinAddress: decryptedWallet.bitcoinAddress,
        rootstockAddress: decryptedWallet.rootstockAddress,
        liquidAddress: decryptedWallet.liquidAddress,
      },
      account: {
        email: data.email,
        address: data.address,
        walletLabel: data.wallet_label ?? 'BBOX Wallet',
      },
    });
  } catch (error) {
    console.error('Account login lookup failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
