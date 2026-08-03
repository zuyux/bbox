import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { authorizeProfileMutation } from '@/lib/server/profileMutationAuth';
import { enforceApiUsage } from '@/lib/server/apiUsage';
import { ApiUsageError } from '@/lib/server/apiUsage';
import { ProfileMutationAuthError } from '@/lib/server/profileMutationAuth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This endpoint creates presigned URLs for direct blob uploads (bypasses body size limits)
export async function POST(request: NextRequest) {
  try {
    console.log('Blob presigned URL API called');
    
    // Check if blob storage is properly configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable not set');
      return NextResponse.json({ 
        error: "Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN to environment variables." 
      }, { status: 500 });
    }

    const body = (await request.json()) as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          console.log('Generating presigned URL for:', {
            pathname,
            clientPayload
          });

          // The Vercel client transports clientPayload as a JSON string.
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(clientPayload || '') as Record<string, unknown>;
          } catch {
            throw new Error('Signed upload metadata is required');
          }
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('Invalid upload metadata');
          }
          const address = typeof payload.address === 'string' ? payload.address.trim() : '';
          if (!address) throw new Error('Wallet address is required');
          await authorizeProfileMutation({ body: payload, method: 'POST', path: '/api/upload-to-blob', address });
            const { fileType, fileSize, fileName } = payload as {
              fileType: string;
              fileSize: number;
              fileName: string;
            };

            if ((fileType !== 'audio' && fileType !== 'image') ||
                !Number.isSafeInteger(fileSize) || fileSize <= 0 ||
                typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255) {
              throw new Error('Invalid upload metadata');
            }

            // Validate file size limits
            const maxAudioSize = 50 * 1024 * 1024; // 50MB for audio
            const maxImageSize = 20 * 1024 * 1024; // 20MB for images
            const maxSize = fileType === 'audio' ? maxAudioSize : maxImageSize;

            if (fileSize > maxSize) {
              const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
              const limitMB = (maxSize / 1024 / 1024).toFixed(0);
              throw new Error(`${fileType} file too large. Size: ${sizeMB}MB, Limit: ${limitMB}MB`);
            }
            await enforceApiUsage({ request, scope: 'blob-upload', address, bytes: fileSize, windowSeconds: 3600, maxRequests: 12, maxBytes: 100 * 1024 * 1024 });

            console.log('File validation passed:', {
              fileName,
              fileType,
              sizeMB: (fileSize / 1024 / 1024).toFixed(2)
            });

          // Return any additional metadata you want to store with the blob
          return {
            allowedContentTypes: [
              'audio/mpeg',
              'audio/mp3', 
              'audio/wav',
              'audio/m4a',
              'audio/aac',
              'audio/ogg',
              'audio/flac',
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp'
            ],
            maximumSizeInBytes: 50 * 1024 * 1024, // 50MB max
            allowOverwrite: false,
            tokenPayload: JSON.stringify({
              uploadedAt: new Date().toISOString(),
              contentType: typeof payload.contentType === 'string' ? payload.contentType : '',
              ...payload,
            })
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Blob upload completed:', {
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            pathname: blob.pathname,
            tokenPayload
          });
          
          const allowedHostname = process.env.VERCEL_BLOB_ALLOWED_HOSTNAME?.trim().toLowerCase();
          const blobHostname = new URL(blob.downloadUrl).hostname.toLowerCase();
          if (!allowedHostname || blobHostname !== allowedHostname) {
            throw new Error('Completed upload did not originate from the configured Blob hostname');
          }
          const payload = JSON.parse(tokenPayload || '{}') as Record<string, unknown>;
          const fileKind = payload.fileType === 'audio' ? 'audio' : payload.fileType === 'image' ? 'image' : '';
          const ownerAddress = typeof payload.address === 'string' ? payload.address.trim() : '';
          const declaredSize = Number(payload.fileSize);
          const originalName = typeof payload.fileName === 'string' ? payload.fileName : blob.pathname;
          const contentType = typeof payload.contentType === 'string' ? payload.contentType : '';
          if (!fileKind || !ownerAddress || !Number.isSafeInteger(declaredSize) || declaredSize <= 0) throw new Error('Invalid signed Blob token payload');
          const { error } = await supabaseAdmin.from('vercel_blob_receipts').upsert({
            pathname: blob.pathname,
            url: blob.url,
            download_url: blob.downloadUrl,
            original_name: originalName,
            file_kind: fileKind,
            declared_size: declaredSize,
            content_type: contentType,
            owner_address: ownerAddress,
            consumed_at: null,
          }, { onConflict: 'pathname' });
          if (error) throw error;
        },
      });

      return NextResponse.json(jsonResponse);
      } catch (error) {
        if (error instanceof ApiUsageError || error instanceof ProfileMutationAuthError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
      console.error('Blob upload error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Blob presigned URL error:', error);
    
    let errorMessage = "Failed to create blob upload URL";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('size') || error.message.includes('large')) {
        errorMessage = error.message;
        statusCode = 413;
      } else if (error.message.includes('rate') || error.message.includes('limit')) {
        errorMessage = "Rate limit exceeded. Please wait and try again.";
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
