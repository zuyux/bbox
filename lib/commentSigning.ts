import { openSignatureRequestPopup, type SignatureRequestOptions } from '@stacks/connect';
import type { StacksProvider } from '@stacks/connect/dist/types';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

import { getPersistedNetwork } from '@/lib/network';

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

export type SupportedWalletType = 'leather' | 'xverse' | 'hiro' | 'imported' | null;

export interface CommentSignatureResult {
  signature: string;
  signedPayload: string;
  walletType: string;
  publicKey?: string;
}

interface SignCommentArgs {
  appId: number;
  message: string;
  address: string;
  walletType: SupportedWalletType;
}

const buildPayload = (appId: number, address: string, message: string) => {
  return JSON.stringify({
    action: 'bbox_comment',
    appId,
    address,
    message,
    timestamp: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : 'bbox',
  });
};

const providerSupportsRpc = (provider?: StacksProvider): provider is RpcCapableStacksProvider => {
  return !!provider && typeof (provider as RpcCapableStacksProvider).request === 'function';
};

const getStacksProvider = (walletType: SupportedWalletType): RpcCapableStacksProvider | undefined => {
  if (typeof window === 'undefined') return undefined;

  const browserWindow = window as BrowserStacksWindow;
  const leather = browserWindow.LeatherProvider;
  const hiro = browserWindow.StacksProvider;
  const xverseStacks = browserWindow.XverseProviders?.StacksProvider;

  if (walletType === 'imported') return undefined;
  if (walletType === 'leather') return leather ?? hiro ?? xverseStacks;
  if (walletType === 'hiro') return hiro ?? leather ?? xverseStacks;
  if (walletType === 'xverse') return xverseStacks ?? hiro ?? leather;

  return leather ?? hiro ?? xverseStacks;
};

const providerNotFoundMessage = (walletType: SupportedWalletType) => {
  switch (walletType) {
    case 'xverse':
      return 'Xverse wallet not detected. Reconnect and try again.';
    case 'leather':
      return 'Leather wallet not detected. Reconnect and try again.';
    case 'hiro':
      return 'Stacks wallet not detected. Reconnect your browser wallet and try again.';
    case 'imported':
      return 'Imported wallets cannot sign comments. Connect a browser wallet to continue.';
    default:
      return 'No Stacks-compatible wallet found. Reconnect Leather/Hiro/Xverse and try again.';
  }
};

const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
    const nested = (error as { error?: { message?: unknown } }).error;
    if (nested && typeof nested.message === 'string') return nested.message;
  }
  return undefined;
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
    const message = extractErrorMessage(error);
    if (message && /cancel|reject/i.test(message)) {
      throw new Error('Signature was cancelled');
    }
    throw new Error(message || 'Unable to sign message with wallet');
  }
};

const requestSignatureViaPopup = async (
  payload: string,
  provider: StacksProvider | undefined
): Promise<SignatureData> => {
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

const signWithStacksConnect = async (
  payload: string,
  walletType: SupportedWalletType
): Promise<CommentSignatureResult> => {
  const provider = getStacksProvider(walletType);
  if (!provider) {
    throw new Error(providerNotFoundMessage(walletType));
  }

  const result = providerSupportsRpc(provider)
    ? await requestSignatureViaRpc(provider, payload)
    : await requestSignatureViaPopup(payload, provider);

  return {
    signature: result.signature,
    signedPayload: payload,
    walletType: walletType ?? 'leather',
    publicKey: result.publicKey,
  };
};

export const signSubmissionComment = async ({
  appId,
  message,
  address,
  walletType,
}: SignCommentArgs): Promise<CommentSignatureResult> => {
  const payload = buildPayload(appId, address, message);

  // Default to Stacks-compatible signing (Leather, Hiro, Xverse, etc.)
  return signWithStacksConnect(payload, walletType);
};
