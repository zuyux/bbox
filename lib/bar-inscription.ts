import {
  AddressPurpose,
  BitcoinNetworkType,
  createInscription,
  request,
  type CreateInscriptionPayload,
} from 'sats-connect';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { getPersistedNetwork } from './network';
import { unlockWalletByPassword } from './walletUnlock';
import { getBitcoinTaprootAddressFromPrivateKey } from './bitcoinWallet';

export const BAR_PROTOCOL = 'brc-app';
export const BAR_CANONICAL_TAPROOT_ADDRESS =
  'bc1p0saw6z028y7h6eag3w6hx5an6mk5ta8qk7wx2d3gtqtrty243uvqvjzvew';

export type BarChainLayer = 'none' | 'BTC' | 'LN' | 'Stacks' | 'Rootstock' | 'Starknet' | 'other';

export type BarPayload = {
  p: typeof BAR_PROTOCOL;
  op: 'register' | 'update' | 'transfer';
  app_id: string;
  owner: string;
  name: string;
  repo: string;
  description: string;
  license: string;
  version: string;
  build_hash: string;
  platform: string[];
  chain_layer: BarChainLayer;
  previous: string | null;
  timestamp: number;
  metadata_cid?: string;
};

export type BarFeeEstimate = {
  payloadBytes: number;
  feeRate: number;
  estimatedVbytes: number;
  estimatedMinerFeeSats: number;
  estimatedServiceFeeSats: number;
  estimatedTotalSats: number;
};

export type BarInscriptionResult = {
  txId: string;
  inscriptionId?: string;
  ownerAddress: string;
  payload: BarPayload;
  feeEstimate: BarFeeEstimate;
};

export type BarPasskeyAuthorization = {
  address: string;
  message: string;
  signature: string;
  publicKey: string;
};

export type BarFormData = {
  name?: string;
  description?: string;
  github_url?: string;
  website_url?: string;
  license?: string;
  version?: string;
  platforms?: string[];
  supported_networks?: string[];
};

const textEncoder = new TextEncoder();

const getBitcoinNetworkType = () =>
  getPersistedNetwork() === 'mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;

const slugifyAppId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `bbox-${Date.now()}`;

const mapChainLayer = (networks: string[] = []): BarChainLayer => {
  const normalized = networks.map((network) => network.toLowerCase());
  if (normalized.some((network) => network.includes('bitcoin') || network.includes('ordinal') || network.includes('rune'))) return 'BTC';
  if (normalized.some((network) => network.includes('lightning'))) return 'LN';
  if (normalized.some((network) => network.includes('stacks'))) return 'Stacks';
  if (normalized.some((network) => network.includes('rootstock') || network.includes('rbtc'))) return 'Rootstock';
  if (normalized.some((network) => network.includes('starknet'))) return 'Starknet';
  if (normalized.some((network) => network.includes('none') || network.includes('off-chain'))) return 'none';
  return networks.length > 0 ? 'other' : 'none';
};

export function createBarPayload(
  formData: BarFormData,
  ownerAddress: string,
  metadataCid?: string,
  previousInscriptionId?: string | null
): BarPayload {
  return {
    p: BAR_PROTOCOL,
    op: previousInscriptionId ? 'update' : 'register',
    app_id: slugifyAppId(formData.name || 'bbox-app'),
    owner: ownerAddress,
    name: String(formData.name || '').trim(),
    repo: String(formData.github_url || formData.website_url || '').trim(),
    description: String(formData.description || '').trim(),
    license: String(formData.license || 'MIT').trim(),
    version: String(formData.version || '1.0.0').trim(),
    build_hash: metadataCid ? `ipfs:${metadataCid}` : '',
    platform: Array.isArray(formData.platforms) ? formData.platforms : [],
    chain_layer: mapChainLayer(Array.isArray(formData.supported_networks) ? formData.supported_networks : []),
    previous: previousInscriptionId || null,
    timestamp: Math.floor(Date.now() / 1000),
    ...(metadataCid ? { metadata_cid: metadataCid } : {}),
  };
}

export function serializeBarPayload(payload: BarPayload) {
  return JSON.stringify(payload);
}

export function estimateBarInscriptionFees(payload: BarPayload, feeRate = 8, serviceFeeSats = 0): BarFeeEstimate {
  const payloadBytes = textEncoder.encode(serializeBarPayload(payload)).length;
  const estimatedVbytes = Math.ceil(190 + payloadBytes * 1.12);
  const estimatedMinerFeeSats = Math.ceil(estimatedVbytes * feeRate);
  const estimatedServiceFeeSats = Math.max(0, serviceFeeSats);

  return {
    payloadBytes,
    feeRate,
    estimatedVbytes,
    estimatedMinerFeeSats,
    estimatedServiceFeeSats,
    estimatedTotalSats: estimatedMinerFeeSats + estimatedServiceFeeSats,
  };
}

export async function getBarOrdinalsAddress(): Promise<string> {
  const response = await request('getAccounts', {
    purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
    message: 'BBOXX needs your Bitcoin Taproot address to inscribe app metadata through BAR.',
  });

  if (response.status === 'error') {
    throw new Error(response.error?.message || 'Unable to connect a Bitcoin wallet for BAR inscription');
  }

  const ordinalsAccount = response.result.find((account) => account.purpose === AddressPurpose.Ordinals);
  const fallbackAccount = response.result[0];
  const address = ordinalsAccount?.address || fallbackAccount?.address;

  if (!address) {
    throw new Error('No Bitcoin Ordinals address was returned by the wallet');
  }

  if (!address.toLowerCase().startsWith(getPersistedNetwork() === 'mainnet' ? 'bc1p' : 'tb1p')) {
    throw new Error('BAR requires a Taproot Ordinals address from the connected Bitcoin wallet');
  }

  return address;
}

export async function inscribeBarPayloadWithExtension(
  payload: BarPayload,
  feeRate: number,
  serviceFeeSats = 0,
  appFeeAddress = BAR_CANONICAL_TAPROOT_ADDRESS
): Promise<BarInscriptionResult> {
  const feeEstimate = estimateBarInscriptionFees(payload, feeRate, serviceFeeSats);
  const inscriptionPayload: CreateInscriptionPayload = {
    network: { type: getBitcoinNetworkType() },
    contentType: 'application/json',
    content: serializeBarPayload(payload),
    payloadType: 'PLAIN_TEXT',
    suggestedMinerFeeRate: feeRate,
    ...(serviceFeeSats > 0
      ? {
          appFee: serviceFeeSats,
          appFeeAddress,
        }
      : {}),
  };

  return new Promise((resolve, reject) => {
    createInscription({
      payload: inscriptionPayload,
      onFinish: (response) => {
        resolve({
          txId: response.txId,
          ownerAddress: payload.owner,
          payload,
          feeEstimate,
        });
      },
      onCancel: () => reject(new Error('BAR inscription cancelled by user')),
    }).catch((error) => reject(error));
  });
}

export async function signBarPayloadWithPasskey(
  address: string,
  password: string,
  payload: BarPayload,
  feeEstimate: BarFeeEstimate
): Promise<BarPasskeyAuthorization> {
  const unlocked = await unlockWalletByPassword(address, password);
  const privateKeyHex = unlocked.privateKey.replace(/^0x/, '').slice(0, 64);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const publicKey = bytesToHex(secp.getPublicKey(privateKeyBytes, true));
  const message = JSON.stringify({
    action: 'bar_inscription_authorization',
    address,
    payload,
    feeEstimate,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const digest = sha256(new TextEncoder().encode(message));
  const signature = bytesToHex(secp.sign(digest, privateKeyBytes, { prehash: false, format: 'compact' }));

  return {
    address,
    message,
    signature,
    publicKey,
  };
}

export async function createSignedBarPayloadWithPasskey(
  walletAddress: string,
  password: string,
  formData: BarFormData,
  metadataCid: string,
  feeRate: number,
  serviceFeeSats = 0
): Promise<{
  payload: BarPayload;
  feeEstimate: BarFeeEstimate;
  authorization: BarPasskeyAuthorization;
}> {
  const unlocked = await unlockWalletByPassword(walletAddress, password);
  const ownerAddress = getBitcoinTaprootAddressFromPrivateKey(
    unlocked.privateKey,
    getPersistedNetwork() === 'mainnet' ? 'mainnet' : 'testnet'
  );
  const payload = createBarPayload(formData, ownerAddress, metadataCid);
  const feeEstimate = estimateBarInscriptionFees(payload, feeRate, serviceFeeSats);
  const authorization = await signBarPayloadWithPasskey(walletAddress, password, payload, feeEstimate);

  return { payload, feeEstimate, authorization };
}

export async function submitBarPayloadWithPasskey(
  authorization: BarPasskeyAuthorization,
  payload: BarPayload,
  feeEstimate: BarFeeEstimate
): Promise<BarInscriptionResult> {
  const response = await fetch('/api/bar-inscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorization,
      payload,
      feeEstimate,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'BAR inscription relay failed');
  }

  return {
    txId: result.txId,
    inscriptionId: result.inscriptionId,
    ownerAddress: payload.owner,
    payload,
    feeEstimate,
  };
}
