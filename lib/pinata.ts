import axios from 'axios';
import { retryAsync } from './externalApi';

// Pinata configuration using environment variables
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

// Validate Pinata configuration
if (!PINATA_JWT) {
  console.error('Pinata configuration missing. Please check environment variables.');
}

function isRetryableAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true;
  if (!error.response) return true;
  return [429, 500, 502, 503, 504].includes(error.response.status);
}

// Upload file to IPFS via Pinata
export async function uploadToPinata(file: File): Promise<{ cid: string; url: string }> {
  if (!PINATA_JWT) {
    throw new Error('Pinata configuration missing. Please check environment variables.');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: `profile-picture-${Date.now()}`,
      keyvalues: {
        type: 'profile-picture',
        timestamp: new Date().toISOString(),
      },
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await retryAsync(
      async () => {
        return axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              'Content-Type': `multipart/form-data`,
              'Authorization': `Bearer ${PINATA_JWT}`,
            },
            timeout: 30000,
          }
        );
      },
      {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        shouldRetry: isRetryableAxiosError,
      }
    );

    const cid = response.data.IpfsHash;
    const url = getIPFSUrl(cid);

    return { cid, url };
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw new Error('Failed to upload file to IPFS');
  }
}

// Get IPFS URL from CID using Pinata gateway
export function getIPFSUrl(cid: string): string {
  if (!cid) return '';

  // Remove any ipfs:// prefix if present
  const cleanCid = cid.replace('ipfs://', '');

  // Use Pinata gateway for better reliability
  return `${PINATA_GATEWAY_URL}/ipfs/${cleanCid}`;
}

// Upload JSON metadata to IPFS via Pinata
export async function uploadJSONToPinata(data: Record<string, unknown>, name: string): Promise<{ cid: string; url: string }> {
  if (!PINATA_JWT) {
    throw new Error('Pinata configuration missing. Please check environment variables.');
  }

  try {
    const metadata = {
      name: `${name}-${Date.now()}`,
      keyvalues: {
        type: 'metadata',
        timestamp: new Date().toISOString(),
      },
    };

    const response = await retryAsync(
      async () => {
        return axios.post(
          'https://api.pinata.cloud/pinning/pinJSONToIPFS',
          {
            pinataContent: data,
            pinataMetadata: metadata,
            pinataOptions: {
              cidVersion: 1,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${PINATA_JWT}`,
            },
            timeout: 30000,
          }
        );
      },
      {
        attempts: 3,
        delayMs: 1000,
        backoffFactor: 2,
        shouldRetry: isRetryableAxiosError,
      }
    );

    const cid = response.data.IpfsHash;
    const url = getIPFSUrl(cid);

    return { cid, url };
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw new Error('Failed to upload JSON to IPFS');
  }
}
