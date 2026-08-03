import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { enforceApiUsage, ApiUsageError } from '@/lib/server/apiUsage';
import { verifyPassword } from '@/lib/server/passwordVerifier';
import { createHash } from 'crypto';

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
  password_hash: string | null;
  password_salt: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, email, password } = await request.json();
    const suppliedIdentifier = identifier ?? email;
    if (typeof password !== 'string' || !password || password.length > 1024) {
      return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 });
    }

    if (!suppliedIdentifier || typeof suppliedIdentifier !== 'string') {
      return NextResponse.json(
        { error: 'Username or email is required' },
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
    const identifierHash = createHash('sha256').update(normalizedIdentifier).digest('hex');
    await enforceApiUsage({ request, scope: 'wallet-login', address: identifierHash, windowSeconds: 15 * 60, maxRequests: 5 });

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
        'email,address,passkey,encrypted_private_key,encrypted_mnemonic,encryption_salt,encryption_iv,encryption_version,wallet_label,bitcoin_address,rootstock_address,liquid_address,password_hash,password_salt'
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
    if (!data.password_hash || !data.password_salt || !(await verifyPassword(password, data.password_salt, data.password_hash))) {
      return NextResponse.json({ error: 'Invalid username, email, or password' }, { status: 401 });
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
        bitcoinAddress: data.bitcoin_address,
        rootstockAddress: data.rootstock_address,
        liquidAddress: data.liquid_address,
      },
    });
  } catch (error) {
    if (error instanceof ApiUsageError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Account login lookup failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
