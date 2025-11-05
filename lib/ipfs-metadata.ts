/**
 * IPFS Metadata Upload Utilities for BBOX App Submissions
 * Handles uploading app metadata JSON to IPFS via Pinata
 */

interface AppMetadata {
  // Basic Information
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;

  // Links and Resources
  website_url: string;
  github_url: string;
  documentation_url: string;

  // Platform and Network Support
  platforms: string[];
  supported_networks: string[];
  license: string;

  // Monetization
  pricing_model: string;
  price_usd: number;
  accepts_lightning: boolean;
  lightning_address: string;

  // Privacy and Legal
  privacy_policy_url: string;
  terms_of_service_url: string;
  data_collection_summary: string;
  open_source: boolean;

  // Publisher Information
  publisher_name: string;
  publisher_email: string;
  publisher_address: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Upload app metadata to IPFS via Pinata
 * Returns the IPFS hash (CID)
 */
export async function uploadAppMetadataToIPFS(
  metadata: Omit<AppMetadata, 'created_at' | 'updated_at'>
): Promise<string> {
  try {
    const timestamp = new Date().toISOString();
    
    const fullMetadata: AppMetadata = {
      ...metadata,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Upload to Pinata via our metadata upload API endpoint
    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: fullMetadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
    }

    const result = await response.json();
    
    // Extract just the CID/hash from the IPFS URL if needed
    if (result.ipfsHash) {
      return result.ipfsHash;
    } else if (result.IpfsHash) {
      return result.IpfsHash;
    } else if (result.url) {
      // Extract hash from URL like ipfs://QmXXX or https://ipfs.io/ipfs/QmXXX
      const match = result.url.match(/[Qm][1-9A-HJ-NP-Za-km-z]{44,}/);
      if (match) {
        return match[0];
      }
    }

    throw new Error('No IPFS hash found in response');
  } catch (error) {
    console.error('Error uploading app metadata to IPFS:', error);
    throw error;
  }
}

/**
 * Fetch app metadata from IPFS
 * @param ipfsHash The IPFS hash (CID) of the metadata
 */
export async function fetchAppMetadataFromIPFS(
  ipfsHash: string
): Promise<AppMetadata | null> {
  try {
    // Try multiple IPFS gateways
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const metadata = await response.json();
          return metadata as AppMetadata;
        }
      } catch {
        // Try next gateway
        continue;
      }
    }

    throw new Error('Failed to fetch metadata from all IPFS gateways');
  } catch (error) {
    console.error('Error fetching app metadata from IPFS:', error);
    return null;
  }
}

/**
 * Validate app metadata before upload
 */
export function validateAppMetadata(
  metadata: Partial<AppMetadata>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push('App name is required');
  }

  if (!metadata.description || metadata.description.trim().length < 50) {
    errors.push('Description must be at least 50 characters');
  }

  if (!metadata.category) {
    errors.push('Category is required');
  }

  if (!metadata.publisher_address) {
    errors.push('Publisher address is required');
  }

  // URL validation
  const urlFields = [
    'website_url',
    'github_url',
    'documentation_url',
    'privacy_policy_url',
    'terms_of_service_url',
  ];

  urlFields.forEach((field) => {
    const value = metadata[field as keyof AppMetadata] as string;
    if (value && value.trim().length > 0) {
      try {
        new URL(value);
      } catch {
        errors.push(`Invalid URL format for ${field.replace('_', ' ')}`);
      }
    }
  });

  // Email validation
  if (
    metadata.publisher_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.publisher_email)
  ) {
    errors.push('Invalid email format');
  }

  // Lightning address validation
  if (
    metadata.accepts_lightning &&
    (!metadata.lightning_address || metadata.lightning_address.trim().length === 0)
  ) {
    errors.push('Lightning address is required when accepting Lightning payments');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a metadata object from form data
 */
export function createMetadataFromFormData(
  formData: Record<string, unknown>,
  publisherAddress: string
): Omit<AppMetadata, 'created_at' | 'updated_at'> {
  return {
    name: String(formData.name || ''),
    description: String(formData.description || ''),
    category: String(formData.category || ''),
    tags: (formData.tags as string[]) || [],
    version: String(formData.version || '1.0.0'),
    website_url: String(formData.website_url || ''),
    github_url: String(formData.github_url || ''),
    documentation_url: String(formData.documentation_url || ''),
    platforms: (formData.platforms as string[]) || [],
    supported_networks: (formData.supported_networks as string[]) || [],
    license: String(formData.license || 'MIT'),
    pricing_model: String(formData.pricing_model || 'free'),
    price_usd: Number(formData.price_usd || 0),
    accepts_lightning: Boolean(formData.accepts_lightning),
    lightning_address: String(formData.lightning_address || ''),
    privacy_policy_url: String(formData.privacy_policy_url || ''),
    terms_of_service_url: String(formData.terms_of_service_url || ''),
    data_collection_summary: String(formData.data_collection_summary || ''),
    open_source: Boolean(formData.open_source),
    publisher_name: String(formData.publisher_name || ''),
    publisher_email: String(formData.publisher_email || ''),
    publisher_address: publisherAddress,
  };
}

export type { AppMetadata };
