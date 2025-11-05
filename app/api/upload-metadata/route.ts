import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📦 Metadata upload to IPFS initiated');
    
    const body = await request.json();
    const { metadata } = body;

    if (!metadata) {
      return NextResponse.json({ 
        error: "Metadata is required" 
      }, { status: 400 });
    }

    // Check Pinata configuration
    if (!process.env.PINATA_JWT) {
      console.error('❌ PINATA_JWT environment variable not set');
      return NextResponse.json({ 
        error: "IPFS service not configured" 
      }, { status: 500 });
    }

    // Create a blob from the JSON data
    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    console.log('📤 Uploading metadata to Pinata IPFS...');
    console.log('   File size:', blob.size, 'bytes');

    // Upload JSON directly to Pinata
    const upload = await pinata.upload.public.json(metadata);
    
    console.log('✅ Metadata uploaded successfully');
    console.log('   IPFS Hash:', upload.IpfsHash);
    console.log('   IPFS URL:', `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}`);

    return NextResponse.json({
      success: true,
      ipfsHash: upload.IpfsHash,
      ipfsCid: upload.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}`,
      size: blob.size,
    });

  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: `Failed to upload metadata: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: "Failed to upload metadata to IPFS" 
    }, { status: 500 });
  }
}
