import { NextRequest, NextResponse } from 'next/server';
import { unpinFromPinata } from '@/lib/pinataUpload';

export async function POST(request: NextRequest) {
  try {
    const { cid, address } = await request.json();

    if (!cid || !address) {
      return NextResponse.json(
        { error: 'CID and address are required' },
        { status: 400 }
      );
    }

    console.log('Removing banner from Pinata:', cid);
    const result = await unpinFromPinata(cid);
    
    if (!result) {
      console.error('Failed to unpin from Pinata');
    }

    return NextResponse.json({
      success: true,
      message: 'Banner removed successfully'
    });

  } catch (error) {
    console.error('Banner remove error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
