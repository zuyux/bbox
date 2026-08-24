import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { assertVerifiedEmailToken, VerifiedEmailTokenError } from '@/lib/emailCodeAuth';
import { getHashedIp } from '@/lib/visitorIdentity';
import { sendAccountActivityNotification } from '@/lib/accountActivityNotifications';
import { createPasswordVerifier } from '@/lib/server/passwordVerifier';

export async function POST(request: NextRequest) {
  try {
    const { email, passkey, passphrase, address, encryptedWallet, verifiedEmailToken } = await request.json();

    if (!email || !passkey || !passphrase || !address || !encryptedWallet || !verifiedEmailToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (typeof passphrase !== 'string' || passphrase.length < 8 || passphrase.length > 1024) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }
    if (typeof passkey !== 'string' || !/^[0-9a-f]{64}$/i.test(passkey)) {
      return NextResponse.json({ error: 'Invalid account verifier' }, { status: 400 });
    }

    const {
      encryptedMnemonic,
      encryptedPrivateKey,
      salt,
      iv,
      version,
      label: walletLabel,
      bitcoinAddress,
      rootstockAddress,
      liquidAddress,
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

    try {
      assertVerifiedEmailToken(verifiedEmailToken, normalizedEmail);
    } catch (tokenError) {
      if (tokenError instanceof VerifiedEmailTokenError) {
        return NextResponse.json(
          { error: tokenError.message },
          { status: tokenError.statusCode }
        );
      }

      throw tokenError;
    }

    const [existingAccountResult, existingProfileResult] = await Promise.all([
      supabaseAdmin
        .from('connected_accounts')
        .select('email, address')
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

    const accountMatch = Array.isArray(existingAccountResult.data) && existingAccountResult.data.length > 0
      ? existingAccountResult.data[0]
      : null;
    const profileMatch = Array.isArray(existingProfileResult.data) && existingProfileResult.data.length > 0
      ? existingProfileResult.data[0]
      : null;
    const accountMatchesCurrentAddress =
      typeof accountMatch?.address === 'string' &&
      accountMatch.address.toLowerCase() === address.toLowerCase();
    const profileMatchesCurrentAddress =
      typeof profileMatch?.address === 'string' &&
      profileMatch.address.toLowerCase() === address.toLowerCase();

    if ((accountMatch && !accountMatchesCurrentAddress) || (profileMatch && !profileMatchesCurrentAddress)) {
      return NextResponse.json(
        {
          error: 'Email is already registered',
          inProfiles: Boolean(profileMatch),
          inConnectedAccounts: Boolean(accountMatch)
        },
        { status: 409 }
      );
    }

    // Save to Supabase
    const hashedIp = getHashedIp(request);
    const passwordVerifier = await createPasswordVerifier(passphrase);
    const connectedAccountPayload = {
      email: normalizedEmail,
      passkey,
      address,
      encrypted_private_key: encryptedPrivateKey,
      encrypted_mnemonic: encryptedMnemonic,
      encryption_salt: salt,
      encryption_iv: iv,
      encryption_version: version || '1.0.0',
      wallet_label: walletLabel || 'BBOXX Wallet',
      bitcoin_address: bitcoinAddress || null,
      rootstock_address: rootstockAddress || null,
      liquid_address: liquidAddress || null,
      hashed_ip: hashedIp,
      password_hash: passwordVerifier.passwordHash,
      password_salt: passwordVerifier.passwordSalt,
      password_kdf: 'scrypt-N32768-r8-p1',
    };

    const { data, error } = accountMatchesCurrentAddress
      ? await supabaseAdmin
          .from('connected_accounts')
          .update(connectedAccountPayload)
          .ilike('email', normalizedEmail)
          .select()
      : await supabaseAdmin
          .from('connected_accounts')
          .insert([
            {
              ...connectedAccountPayload,
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
            email_verified: true,
            bitcoin_address: bitcoinAddress || null,
            rootstock_address: rootstockAddress || null,
            liquid_address: liquidAddress || null,
            updated_at: now,
            last_active: now,
            hashed_ip: hashedIp,
          })
          .eq('id', existingProfileByAddress[0].id);
      } else {
        await supabaseAdmin
          .from('profiles')
          .insert([
            {
              address,
              email: normalizedEmail,
              email_verified: true,
              bitcoin_address: bitcoinAddress || null,
              rootstock_address: rootstockAddress || null,
              liquid_address: liquidAddress || null,
              created_at: now,
              updated_at: now,
              last_active: now,
              hashed_ip: hashedIp,
            }
          ]);
      }
    } catch (profileError) {
      console.warn('Profile sync warning:', profileError);
      // Do not fail account creation if profile sync fails
    }

    const { error: interestLinkError } = await supabaseAdmin
      .from('visitor_interests')
      .update({ user_address: address, updated_at: new Date().toISOString() })
      .eq('hashed_ip', hashedIp);
    if (interestLinkError) console.warn('Interest link warning:', interestLinkError);

    if (!accountMatchesCurrentAddress) {
      try {
        await sendAccountActivityNotification({
          type: 'account-created',
          address,
          email: normalizedEmail,
        });
      } catch (notificationError) {
        console.warn('Account created, but the admin notification failed:', notificationError);
      }
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
