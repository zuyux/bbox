import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToPinata, unpinFromPinata, getIPFSUrl } from '@/lib/pinataUpload';
import { createHash } from 'crypto';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const oldCid = formData.get('oldCid') as string;
    const rawProof = formData.get('profileMutationProof');

    if (!file || !address) {
      return NextResponse.json(
        { error: 'File and address are required' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const body = {
      address,
      oldCid: oldCid || '',
      file: { name: file.name, size: file.size, type: file.type, sha256: createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex') },
      profileMutationProof: typeof rawProof === 'string' ? JSON.parse(rawProof) : undefined,
    };
    await authorizeProfileMutation({ body, method: 'POST', path: '/api/profile/avatar', address });

    // Upload new file to Pinata
    const uploadResult = await uploadFileToPinata(file);
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      );
    }

    const { IpfsHash: cid } = uploadResult.data;
    const avatarUrl = getIPFSUrl(cid);

    if (oldCid && oldCid !== cid) {
      unpinFromPinata(oldCid).catch(error => {
        console.warn('Failed to unpin old avatar:', error);
      });
    }

    return NextResponse.json({
      success: true,
      cid,
      avatarUrl,
      message: 'Profile picture uploaded successfully'
    });

  } catch (error) {
    if (error instanceof ProfileMutationAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const address = typeof body.address === 'string' ? body.address : '';
    const cid = typeof body.cid === 'string' ? body.cid : '';

    if (!address || !cid) {
      return NextResponse.json(
        { error: 'Address and CID are required' },
        { status: 400 }
      );
    }

    await authorizeProfileMutation({ body, method: 'DELETE', path: '/api/profile/avatar', address });

    const unpinSuccess = await unpinFromPinata(cid);
    if (!unpinSuccess) {
      console.warn('Failed to unpin file from Pinata');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    if (error instanceof ProfileMutationAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Profile picture deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
