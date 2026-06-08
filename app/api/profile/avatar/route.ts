import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToPinata, unpinFromPinata, getIPFSUrl } from '@/lib/pinataUpload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const oldCid = formData.get('oldCid') as string;

    if (!file || !address) {
      return NextResponse.json(
        { error: 'File and address are required' },
        { status: 400 }
      );
    }

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
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const cid = searchParams.get('cid');

    if (!address || !cid) {
      return NextResponse.json(
        { error: 'Address and CID are required' },
        { status: 400 }
      );
    }

    const unpinSuccess = await unpinFromPinata(cid);
    if (!unpinSuccess) {
      console.warn('Failed to unpin file from Pinata');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Profile picture deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
