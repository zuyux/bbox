import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ADDRESS } from '@/lib/admin';
import { getIPFSUrl, uploadFileToPinata } from '@/lib/pinataUpload';
import { createHash } from 'crypto';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const address = formData.get('address');
    const rawProof = formData.get('profileMutationProof');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    if (typeof address !== 'string' || address !== ADMIN_ADDRESS) {
      return NextResponse.json({ error: 'Unauthorized admin upload.' }, { status: 403 });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid image type.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 413 });
    }

    let profileMutationProof: unknown;
    try {
      profileMutationProof = typeof rawProof === 'string' ? JSON.parse(rawProof) : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid wallet authorization.' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    await authorizeProfileMutation({
      method: 'POST',
      path: '/api/admin/upload-image',
      address,
      body: {
        address,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          sha256: createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex'),
        },
        profileMutationProof,
      },
    });

    const result = await uploadFileToPinata(file);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const cid = result.data.IpfsHash;

    return NextResponse.json({
      success: true,
      cid,
      ipfsCid: cid,
      url: getIPFSUrl(cid),
      size: result.data.PinSize,
    });
  } catch (error) {
    if (error instanceof ProfileMutationAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Image upload failed.';
    console.error('Admin image upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
