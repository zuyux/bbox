import type { SignatureRequestOptions } from '@stacks/connect';
import type { StacksProvider } from '@stacks/connect/dist/types';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

import { getNostriaPublicKey, signNostriaEvent } from '@/lib/nostriaSigner';
import { getPersistedNetwork } from '@/lib/network';
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';

type SignatureData = {
  signature: string;
  publicKey?: string;
};

type RpcCapableStacksProvider = StacksProvider & {
  request: (method: string, params?: unknown) => Promise<unknown>;
};

type BrowserStacksWindow = typeof window & {
  LeatherProvider?: RpcCapableStacksProvider;
  StacksProvider?: RpcCapableStacksProvider;
  XverseProviders?: {
    StacksProvider?: RpcCapableStacksProvider;
  };
};

export type SupportedWalletType = 'leather' | 'xverse' | 'hiro' | 'alby' | 'nostria' | 'imported' | null;

type ResolvedStacksProvider = {
  provider: RpcCapableStacksProvider;
  walletType: Exclude<SupportedWalletType, 'imported' | null>;
};

type NostrUnsignedEvent = {
  pubkey?: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
};

type NostrSignedEvent = NostrUnsignedEvent & {
  id?: string;
  sig: string;
};

type NostrSigningProvider = {
  getPublicKey?: () => Promise<string>;
  signEvent?: (event: NostrUnsignedEvent) => Promise<NostrSignedEvent>;
};

export interface CommentSignatureResult {
  signature: string;
  signedPayload: string;
  walletType: string;
  publicKey?: string;
}

export type StacksSignatureResult = CommentSignatureResult;

interface SignCommentArgs {
  appId: number | string;
  message: string;
  address: string;
  walletType: SupportedWalletType;
}

const buildPayload = (appId: number | string, address: string, message: string) => {
  return JSON.stringify({
    action: 'bbox_comment',
    appId,
    address,
    message,
    timestamp: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : 'bbox',
  });
};

export type WalletProofResult = {
  walletType: SupportedWalletType;
  walletSignature: string;
  walletPublicKey?: string;
  proofMessage: string;
  proofTimestamp: string;
  walletAddress: string;
  nostrPublicKey: string;
};

export const buildWalletProofMessage = (
  address: string,
  nostrPublicKey: string,
  timestamp: string
): string => {
  return JSON.stringify({
    action: 'link_nostr',
    address,
    nostrPublicKey,
    timestamp,
    origin: typeof window !== 'undefined' ? window.location.origin : 'bbox',
  });
};

export const createWalletProof = async (
  address: string,
  nostrPublicKey: string,
  walletType: SupportedWalletType
): Promise<WalletProofResult> => {
  if (!address) throw new Error('Wallet address is required to create proof');
  if (!nostrPublicKey) throw new Error('Nostr public key is required to create proof');
  if (!walletType) throw new Error('Wallet type is required to create proof');

  const timestamp = new Date().toISOString();
  const proofMessage = buildWalletProofMessage(address, nostrPublicKey, timestamp);
  const signatureResult = await signStacksMessage(proofMessage, walletType);

  return {
    walletType,
    walletSignature: signatureResult.signature,
    walletPublicKey: signatureResult.publicKey,
    proofMessage,
    proofTimestamp: timestamp,
    walletAddress: address,
    nostrPublicKey,
  };
};

const providerSupportsRpc = (provider?: StacksProvider): provider is RpcCapableStacksProvider => {
  return !!provider && typeof (provider as RpcCapableStacksProvider).request === 'function';
};

const getStacksProvider = (walletType: SupportedWalletType): ResolvedStacksProvider | undefined => {
  if (typeof window === 'undefined') return undefined;

  const browserWindow = window as BrowserStacksWindow;
  const leather = browserWindow.LeatherProvider;
  const hiro = browserWindow.StacksProvider;
  const xverseStacks = browserWindow.XverseProviders?.StacksProvider;

  if (walletType === 'imported') return undefined;
  if (walletType === 'alby') return undefined;
  if (walletType === 'nostria') return undefined;
  if (walletType === 'leather') {
    if (leather) return { provider: leather, walletType: 'leather' };
    if (hiro) return { provider: hiro, walletType: 'hiro' };
    if (xverseStacks) return { provider: xverseStacks, walletType: 'xverse' };
  }
  if (walletType === 'hiro') {
    if (hiro) return { provider: hiro, walletType: 'hiro' };
    if (leather) return { provider: leather, walletType: 'leather' };
    if (xverseStacks) return { provider: xverseStacks, walletType: 'xverse' };
  }
  if (walletType === 'xverse') {
    if (xverseStacks) return { provider: xverseStacks, walletType: 'xverse' };
    if (hiro) return { provider: hiro, walletType: 'hiro' };
    if (leather) return { provider: leather, walletType: 'leather' };
  }

  if (leather) return { provider: leather, walletType: 'leather' };
  if (hiro) return { provider: hiro, walletType: 'hiro' };
  if (xverseStacks) return { provider: xverseStacks, walletType: 'xverse' };
};

const providerNotFoundMessage = (walletType: SupportedWalletType) => {
  switch (walletType) {
    case 'xverse':
      return 'Xverse wallet not detected. Reconnect and try again.';
    case 'leather':
      return 'Leather wallet not detected. Reconnect and try again.';
    case 'hiro':
      return 'Stacks wallet not detected. Reconnect your browser wallet and try again.';
    case 'alby':
      return 'Alby wallet not detected. Reconnect and try again.';
    case 'nostria':
      return 'Nostria Signer not detected. Reconnect and try again.';
    case 'imported':
      return 'Imported wallets cannot sign comments. Connect a browser wallet to continue.';
    default:
      return 'No Stacks-compatible wallet found. Reconnect Leather/Hiro/Xverse and try again.';
  }
};

const getNostrProvider = (walletType: SupportedWalletType): NostrSigningProvider | undefined => {
  if (typeof window === 'undefined') return undefined;

  const browserWindow = window as typeof window & {
    alby?: {
      nostr?: NostrSigningProvider;
    };
    nostr?: NostrSigningProvider;
  };

  if (walletType === 'alby') return browserWindow.alby?.nostr ?? browserWindow.nostr;

  return undefined;
};

const signNostrMessage = async (
  payload: string,
  walletType: Extract<SupportedWalletType, 'alby' | 'nostria'>
): Promise<StacksSignatureResult> => {
  const walletLabel = walletType === 'nostria' ? 'Nostria Signer' : 'Alby';

  if (walletType === 'nostria') {
    const publicKey = await getNostriaPublicKey();
    const event = await signNostriaEvent({
      created_at: Math.floor(Date.now() / 1000),
      kind: 27235,
      tags: [['client', 'BBOX']],
      content: payload,
    });

    return {
      signature: event.sig,
      signedPayload: JSON.stringify(event),
      walletType,
      publicKey: event.pubkey || publicKey,
    };
  }

  const provider = getNostrProvider(walletType);
  if (!provider?.getPublicKey || !provider.signEvent) {
    throw new Error(`${walletLabel} Nostr signing is not available. Enable signer permissions and try again.`);
  }

  const publicKey = (await provider.getPublicKey()).trim().toLowerCase();
  const event = await provider.signEvent({
    created_at: Math.floor(Date.now() / 1000),
    kind: 27235,
    tags: [['client', 'BBOX']],
    content: payload,
  });

  if (!event.sig) {
    throw new Error(`${walletLabel} returned an invalid signature payload`);
  }

  return {
    signature: event.sig,
    signedPayload: JSON.stringify(event),
    walletType,
    publicKey: event.pubkey || publicKey,
  };
};

const unwrapSignatureResult = (response: unknown): SignatureData => {
  const payload = (response as { result?: SignatureData })?.result ?? (response as SignatureData);
  if (!payload || typeof payload.signature !== 'string') {
    throw new Error('Wallet returned an invalid signature payload');
  }
  return payload;
};

const requestSignatureViaRpc = async (provider: RpcCapableStacksProvider, payload: string): Promise<SignatureData> => {
  try {
    const response = await provider.request('stx_signMessage', { message: payload });
    return unwrapSignatureResult(response);
  } catch (error) {
    const message = getWalletErrorMessage(error, 'Unable to sign message with wallet');
    if (isWalletRequestCancelled(error) || /cancel|reject/i.test(message.toLowerCase())) {
      throw new Error('Signature was cancelled');
    }
    throw new Error(message);
  }
};

const requestSignatureViaPopup = async (
  payload: string,
  provider: StacksProvider | undefined
): Promise<SignatureData> => {
  const { openSignatureRequestPopup } = await import('@stacks/connect');
  const networkName = getPersistedNetwork();
  const stacksNetwork = networkName === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

  return new Promise<SignatureData>((resolve, reject) => {
    const options: SignatureRequestOptions = {
      message: payload,
      network: stacksNetwork,
      appDetails: {
        name: 'BBOX',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/bbox.png` : '/bbox.png',
      },
      onFinish: (payload) => resolve(payload),
      onCancel: () => reject(new Error('Signature was cancelled')),
    };

    openSignatureRequestPopup(options, provider);
  });
};

export const signStacksMessage = async (
  payload: string,
  walletType: SupportedWalletType
): Promise<StacksSignatureResult> => {
  if (walletType === 'alby' || walletType === 'nostria') {
    return signNostrMessage(payload, walletType);
  }

  const resolvedProvider = getStacksProvider(walletType);
  if (!resolvedProvider) {
    throw new Error(providerNotFoundMessage(walletType));
  }

  const result = providerSupportsRpc(resolvedProvider.provider)
    ? await requestSignatureViaRpc(resolvedProvider.provider, payload)
    : await requestSignatureViaPopup(payload, resolvedProvider.provider);

  return {
    signature: result.signature,
    signedPayload: payload,
    walletType: resolvedProvider.walletType,
    publicKey: result.publicKey,
  };
};

interface SignReviewArgs {
  appId: number | string;
  rating: number;
  reviewText: string;
  address: string;
  walletType: SupportedWalletType;
}

export const signSubmissionComment = async ({
  appId,
  message,
  address,
  walletType,
}: SignCommentArgs): Promise<CommentSignatureResult> => {
  const payload = buildPayload(appId, address, message);

  // Default to Stacks-compatible signing (Leather, Hiro, Xverse, etc.)
  return signStacksMessage(payload, walletType);
};

const buildReviewPayload = (appId: number | string, rating: number, reviewText: string, address: string) => {
  return JSON.stringify({
    action: 'bbox_app_review',
    appId,
    rating,
    reviewText,
    address,
    timestamp: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : 'bbox',
  });
};

export const signAppReview = async ({
  appId,
  rating,
  reviewText,
  address,
  walletType,
}: SignReviewArgs): Promise<CommentSignatureResult> => {
  const payload = buildReviewPayload(appId, rating, reviewText, address);
  return signStacksMessage(payload, walletType);
};
