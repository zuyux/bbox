import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { pinata } from '@/utils/config';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { downloadVerifiedBlob, SecureBlobDownloadError } from '@/lib/server/secureBlobDownload';
import { authorizeProfileMutation, ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';
import { enforceApiUsage, ApiUsageError } from '@/lib/server/apiUsage';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AUDIO_LIMIT = 50 * 1024 * 1024;
const IMAGE_LIMIT = 20 * 1024 * 1024;

type BlobReference = { pathname?: unknown; downloadUrl?: unknown };
type BlobReceipt = {
  pathname: string;
  download_url: string;
  original_name: string;
  file_kind: 'audio' | 'image';
  declared_size: number;
  content_type: string;
  owner_address: string;
};

async function claimSignedBlobReference(reference: BlobReference, kind: 'audio' | 'image', address: string): Promise<BlobReceipt> {
  const pathname = typeof reference?.pathname === 'string' ? reference.pathname : '';
  const downloadUrl = typeof reference?.downloadUrl === 'string' ? reference.downloadUrl : '';
  if (!pathname || !downloadUrl) throw new SecureBlobDownloadError(`Signed ${kind} Blob reference is required`);

  // The row can only be created by Vercel's authenticated upload-completion
  // callback. Updating consumed_at with an IS NULL filter claims it atomically.
  const { data, error } = await supabaseAdmin
    .from('vercel_blob_receipts')
    .update({ consumed_at: new Date().toISOString() })
    .eq('pathname', pathname)
    .eq('download_url', downloadUrl)
    .eq('file_kind', kind)
    .ilike('owner_address', address)
    .is('consumed_at', null)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .select('pathname,download_url,original_name,file_kind,declared_size,content_type,owner_address')
    .maybeSingle<BlobReceipt>();
  if (error) throw error;
  if (!data) throw new SecureBlobDownloadError(`Invalid, expired, or already used ${kind} Blob reference`, 403);
  return data;
}

async function uploadWithRetry(file: File) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await pinata.upload.public.file(file); }
    catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2 ** (attempt + 1) * 1000));
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) return NextResponse.json({ error: 'IPFS service not configured' }, { status: 500 });
    const allowedHostname = process.env.VERCEL_BLOB_ALLOWED_HOSTNAME?.trim().toLowerCase();
    if (!allowedHostname) return NextResponse.json({ error: 'Blob hostname allowlist is not configured' }, { status: 500 });

    const body = await request.json() as Record<string, unknown>;
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    if (!address) throw new SecureBlobDownloadError('Wallet address is required');
    await authorizeProfileMutation({ body, method: 'POST', path: '/api/process-blob-to-ipfs', address });
    await enforceApiUsage({ request, scope: 'blob-process', address, windowSeconds: 3600, maxRequests: 12 });
    const audioReceipt = await claimSignedBlobReference(body.audioBlob as BlobReference, 'audio', address);
    const imageReceipt = body.imageBlob
      ? await claimSignedBlobReference(body.imageBlob as BlobReference, 'image', address)
      : null;

    const audio = await downloadVerifiedBlob({
      url: audioReceipt.download_url,
      allowedHostname,
      maximumBytes: Math.min(AUDIO_LIMIT, audioReceipt.declared_size),
      expectedKind: 'audio',
    });
    if (audio.bytes.byteLength !== Number(audioReceipt.declared_size)) {
      throw new SecureBlobDownloadError('Audio Blob size does not match its signed upload receipt', 400);
    }

    const audioHash = createHash('sha256').update(audio.bytes).digest('hex');
    console.log('Uploading verified audio Blob to IPFS:', { hash: audioHash.slice(0, 16), size: audio.bytes.byteLength });
    const audioResult = await uploadWithRetry(new File([audio.bytes], audioReceipt.original_name, { type: audio.contentType }));
    if (!audioResult?.IpfsHash) throw new Error('Audio IPFS upload did not return a CID');
    const audioCid = audioResult.IpfsHash;
    const audioUrl = `https://gateway.pinata.cloud/ipfs/${audioCid}`;

    let imageCid: string | null = null;
    if (imageReceipt) {
      const image = await downloadVerifiedBlob({
        url: imageReceipt.download_url,
        allowedHostname,
        maximumBytes: Math.min(IMAGE_LIMIT, imageReceipt.declared_size),
        expectedKind: 'image',
      });
      if (image.bytes.byteLength !== Number(imageReceipt.declared_size)) {
        throw new SecureBlobDownloadError('Image Blob size does not match its signed upload receipt', 400);
      }
      const imageResult = await uploadWithRetry(new File([image.bytes], imageReceipt.original_name, { type: image.contentType }));
      if (!imageResult?.IpfsHash) throw new Error('Image IPFS upload did not return a CID');
      imageCid = imageResult.IpfsHash;
    }

    const imageUrl = imageCid ? `https://gateway.pinata.cloud/ipfs/${imageCid}` : null;
    const suppliedMetadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {};
    const completeMetadata = { ...suppliedMetadata, animation_url: audioUrl, image: imageUrl };
    const metadataResult = await pinata.upload.public.json(completeMetadata);
    if (!metadataResult?.IpfsHash) throw new Error('Metadata IPFS upload did not return a CID');

    return NextResponse.json({
      success: true,
      metadataCid: metadataResult.IpfsHash,
      audioUrl,
      audioCid,
      imageUrl,
      imageCid,
      audioFormat: audio.contentType.split('/')[1],
      fileSizeBytes: audio.bytes.byteLength,
      attributes: suppliedMetadata.attributes,
      metadata: completeMetadata,
    });
  } catch (error) {
    console.error('Blob to IPFS processing error:', error);
    if (error instanceof SecureBlobDownloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ProfileMutationAuthError || error instanceof ApiUsageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to process verified Blob upload' }, { status: 500 });
  }
}
