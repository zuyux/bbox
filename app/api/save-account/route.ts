import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, passkey, passphrase, address, encryptedWallet } = await request.json();

    if (!email || !passkey || !passphrase || !address || !encryptedWallet) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const {
      encryptedMnemonic,
      encryptedPrivateKey,
      salt,
      iv,
      version,
      label: walletLabel,
    } = encryptedWallet || {};

    if (!encryptedMnemonic || !encryptedPrivateKey || !salt || !iv) {
      return NextResponse.json(
        { error: 'Invalid encrypted wallet payload' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Hash the private key with the passphrase to create the passkey
    const hashedPasskey = crypto
      .createHash('sha256')
      .update(passkey + passphrase)
      .digest('hex');

    const [existingAccountResult, existingProfileResult] = await Promise.all([
      supabaseAdmin
        .from('connected_accounts')
        .select('email')
        .ilike('email', trimmedEmail)
        .limit(1),
      supabaseAdmin
        .from('profiles')
        .select('id, address')
        .ilike('email', trimmedEmail)
        .limit(1)
    ]);

    if (existingAccountResult.error) {
      const err = existingAccountResult.error;
      if (err.code !== 'PGRST116') {
        console.error('Database check error (connected_accounts):', err);
        return NextResponse.json(
          {
            error: 'Database connection error',
            details: err.message,
            code: err.code
          },
          { status: 500 }
        );
      }
    }

    if (existingProfileResult.error && existingProfileResult.error.code !== 'PGRST116') {
      const err = existingProfileResult.error;
      console.error('Database check error (profiles):', err);
      return NextResponse.json(
        {
          error: 'Database connection error',
          details: err.message,
          code: err.code
        },
        { status: 500 }
      );
    }

    const hasAccount = Array.isArray(existingAccountResult.data) && existingAccountResult.data.length > 0;
    const hasProfile = Array.isArray(existingProfileResult.data) && existingProfileResult.data.length > 0;

    if (hasAccount || hasProfile) {
      return NextResponse.json(
        {
          error: 'Email is already registered',
          inProfiles: hasProfile,
          inConnectedAccounts: hasAccount
        },
        { status: 409 }
      );
    }

    // Save to Supabase
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .insert([
        {
          email: normalizedEmail,
          passkey: hashedPasskey,
          address,
          encrypted_private_key: encryptedPrivateKey,
          encrypted_mnemonic: encryptedMnemonic,
          encryption_salt: salt,
          encryption_iv: iv,
          encryption_version: version || '1.0.0',
          wallet_label: walletLabel || 'BBOX Wallet',
          created_at: new Date().toISOString(),
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to save account',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    // Ensure a profile record exists with this email for future lookups
    try {
      const now = new Date().toISOString();
      const { data: existingProfileByAddress } = await supabaseAdmin
        .from('profiles')
        .select('id, address')
        .ilike('address', address)
        .limit(1);

      if (existingProfileByAddress && existingProfileByAddress.length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update({
            email: normalizedEmail,
            email_verified: false,
            updated_at: now,
            last_active: now
          })
          .eq('id', existingProfileByAddress[0].id);
      } else {
        await supabaseAdmin
          .from('profiles')
          .insert([
            {
              address,
              email: normalizedEmail,
              email_verified: false,
              created_at: now,
              updated_at: now,
              last_active: now,
            }
          ]);
      }
    } catch (profileError) {
      console.warn('Profile sync warning:', profileError);
      // Do not fail account creation if profile sync fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account saved successfully',
      accountId: data[0]?.id
    });

  } catch (error) {
    console.error('Save account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
