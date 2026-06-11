import axios from 'axios';
import { retryAsync } from './externalApi';

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export interface PinataUploadError {
  error: string;
  details?: string;
}

function normalizePinataError(error: unknown): string {
  if (!error) {
    return 'Upload failed. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (typeof err.reason === 'string') return err.reason;
    if (typeof err.details === 'string') return err.details;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Upload failed. Please try again.';
  }
}

function isPinataRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true;
  if (!error.response) return true;
  const status = error.response.status;
  return [429, 500, 502, 503, 504].includes(status);
}

/**
 * Upload a file to Pinata IPFS
 */
export async function uploadFileToPinata(
  file: File
): Promise<{ success: true; data: PinataUploadResponse } | { success: false; error: string }> {
  try {
    // Validate environment variables - use JWT token (preferred) or fallback to API keys
    const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || process.env.PINATA_SECRET_KEY;

    if (!pinataJWT && (!pinataApiKey || !pinataSecretApiKey)) {
      console.error('Pinata credentials not found in environment variables');
      return {
        success: false,
        error: 'Pinata configuration missing. Please check environment variables.'
      };
    }

    // Validate file
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).'
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: `profile-avatar-${Date.now()}`,
      keyvalues: {
        type: 'profile-avatar',
        uploaded_by: 'stx-nft-marketplace',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
      customPinPolicy: {
        regions: [
          {
            id: 'FRA1',
            desiredReplicationCount: 1
          },
          {
            id: 'NYC1', 
            desiredReplicationCount: 1
          }
        ]
      }
    });
    formData.append('pinataOptions', options);

    // Upload to Pinata with retry logic
    const response = await retryAsync(
      async () => {
        return axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              'Content-Type': 'multipart/form-data',
              ...(pinataJWT 
                ? { 'Authorization': `Bearer ${pinataJWT}` }
                : { 
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey 
                  }
              ),
            },
            timeout: 30000, // 30 second timeout
          }
        );
      },
      {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        shouldRetry: isPinataRetryableError,
      }
    );

    if (response.status === 200 && response.data?.IpfsHash) {
      return {
        success: true,
        data: response.data as PinataUploadResponse
      };
    } else {
      return {
        success: false,
        error: normalizePinataError(response.data?.error ?? response.data)
      };
    }
  } catch (error) {
    console.error('Pinata upload error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Upload timeout. Please try again with a smaller file.'
        };
      }
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check API credentials.'
        };
      }
      
      if (error.response?.status === 413) {
        return {
          success: false,
          error: 'File too large for upload.'
        };
      }
      
      return {
        success: false,
        error: normalizePinataError(error.response?.data?.error ?? error.response?.data ?? error.message)
      };
    }
    
    return {
      success: false,
      error: normalizePinataError(error)
    };
  }
}

/**
 * Get IPFS URL from CID
 * Uses ipfs.io as the default gateway
 */
const PINATA_GATEWAY_KEY = process.env.NEXT_PUBLIC_PINATA_GATEWAY_KEY || process.env.PINATA_GATEWAY_KEY;

export function getIPFSUrl(cid: string): string {
  // Use the configured gateway URL or fallback to ipfs.io
  const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ||
                     process.env.PINATA_GATEWAY_URL ||
                     'https://ipfs.io';

  const cleanCid = cid.replace(/^ipfs:\/\//, '');
  const url = new URL(`${gatewayUrl.replace(/\/$/, '')}/ipfs/${cleanCid}`);

  if (PINATA_GATEWAY_KEY && gatewayUrl.includes('pinata.cloud')) {
    url.searchParams.set('pinata_gateway_key', PINATA_GATEWAY_KEY);
    url.searchParams.set('pinataGatewayKey', PINATA_GATEWAY_KEY);
  }

  return url.toString();
}

/**
 * Get fallback IPFS URLs for a given CID
 * Returns an array of URLs to try in order
 */
export function getIPFSFallbackUrls(cid: string): string[] {
  const fallbackGateways = [
    'https://ipfs.io', // Primary gateway
    'https://gateway.ipfs.io',
    'https://cloudflare-ipfs.com',
    'https://dweb.link',
    'https://gateway.pinata.cloud',
    'https://nftstorage.link',
  ];

  return fallbackGateways.map((gateway) => {
    const url = new URL(`${gateway.replace(/\/$/, '')}/ipfs/${cid}`);
    if (PINATA_GATEWAY_KEY && gateway.includes('pinata.cloud')) {
      url.searchParams.set('pinata_gateway_key', PINATA_GATEWAY_KEY);
      url.searchParams.set('pinataGatewayKey', PINATA_GATEWAY_KEY);
    }
    return url.toString();
  });
}

/**
 * Get optimized IPFS URL from CID with query parameters
 */
export function getOptimizedIPFSUrl(cid: string, width?: number, height?: number, quality?: number): string {
  const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 
                     process.env.PINATA_GATEWAY_URL || 
                     'https://ipfs.io';
  const cleanCid = cid.replace(/^ipfs:\/\//, '');
  const url = new URL(`${gatewayUrl.replace(/\/$/, '')}/ipfs/${cleanCid}`);

  if (PINATA_GATEWAY_KEY && gatewayUrl.includes('pinata.cloud')) {
    url.searchParams.set('pinata_gateway_key', PINATA_GATEWAY_KEY);
    url.searchParams.set('pinataGatewayKey', PINATA_GATEWAY_KEY);
  }

  if (width) url.searchParams.set('img-width', width.toString());
  if (height) url.searchParams.set('img-height', height.toString());
  if (quality) url.searchParams.set('img-quality', quality.toString());
  
  return url.toString();
}

/**
 * Delete/unpin file from Pinata (requires JWT token - should be called from API route)
 */
export async function unpinFromPinata(cid: string): Promise<boolean> {
  try {
    const pinataJWT = process.env.PINATA_JWT;
    
    if (!pinataJWT) {
      console.error('Pinata JWT not found in environment variables');
      return false;
    }

    const response = await retryAsync(
      async () => {
        return axios.delete(
          `https://api.pinata.cloud/pinning/unpin/${cid}`,
          {
            headers: {
              Authorization: `Bearer ${pinataJWT}`,
            },
            timeout: 15000,
          }
        );
      },
      {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        shouldRetry: isPinataRetryableError,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('Pinata unpin error:', error);
    return false;
  }
}
