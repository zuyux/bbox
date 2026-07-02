import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ADDRESS } from '@/lib/admin';
import { getIPFSUrl, uploadFileToPinata } from '@/lib/pinataUpload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const address = formData.get('address');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    if (typeof address !== 'string' || address !== ADMIN_ADDRESS) {
      return NextResponse.json({ error: 'Unauthorized admin upload.' }, { status: 403 });
    }

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
    const message = error instanceof Error ? error.message : 'Image upload failed.';
    console.error('Admin image upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
