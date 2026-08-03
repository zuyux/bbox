import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToPinata } from '@/lib/pinataUpload';
import { createHash } from 'crypto';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';
import { enforceApiUsage, ApiUsageError } from '@/lib/server/apiUsage';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const rawProof = formData.get('profileMutationProof');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: 'No address provided' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    let profileMutationProof: unknown;
    try { profileMutationProof = typeof rawProof === 'string' ? JSON.parse(rawProof) : undefined; }
    catch { return NextResponse.json({ error: 'Invalid wallet authorization' }, { status: 400 }); }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await authorizeProfileMutation({
      body: { address, file: { name: file.name, size: file.size, type: file.type, sha256: createHash('sha256').update(bytes).digest('hex') }, profileMutationProof },
      method: 'POST', path: '/api/upload-banner', address,
    });
    await enforceApiUsage({ request, scope: 'banner-upload', address, bytes: file.size, windowSeconds: 3600, maxRequests: 10, maxBytes: 50 * 1024 * 1024 });

    // Check Pinata credentials
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_KEY;

    if (!pinataJWT && (!pinataApiKey || !pinataSecretApiKey)) {
      console.error('Pinata credentials missing');
      return NextResponse.json(
        { error: 'Pinata credentials not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Upload to Pinata
    console.log('Uploading banner to Pinata for address:', address);
    const result = await uploadFileToPinata(file);
    
    console.log('Banner upload result:', result);

    if (!result.success) {
      console.error('Pinata upload failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    const { error: ownershipError } = await supabaseAdmin.from('managed_pinata_assets').insert({
      cid: result.data.IpfsHash, owner_address: address, asset_kind: 'profile-banner', byte_size: file.size,
    });
    if (ownershipError) {
      console.error('Unable to record banner ownership:', ownershipError);
      return NextResponse.json({ error: 'Unable to record uploaded asset ownership' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cid: result.data.IpfsHash,
      message: 'Banner uploaded successfully'
    });

  } catch (error) {
    if (error instanceof ProfileMutationAuthError || error instanceof ApiUsageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Banner upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
