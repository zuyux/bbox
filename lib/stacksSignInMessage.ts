import { request as satsRequest } from 'sats-connect';

import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';

const BBOX_SIGN_IN_DOMAIN = 'bbox.lol';
const BBOX_SIGN_IN_URI = 'https://bbox.lol';
const BBOX_SIGN_IN_STATEMENT = 'BBOX';
const BBOX_SIGN_IN_VERSION = '1';
const BBOX_SIGN_IN_CHAIN_ID = '1';

type RpcSignatureResponse = {
  result?: {
    signature?: string;
    publicKey?: string;
  };
  signature?: string;
  publicKey?: string;
};

type StacksSignInSignature = {
  signature: string;
  publicKey?: string;
  message: string;
};

type RpcCapableProvider = {
  request: (method: string, params?: unknown) => Promise<unknown>;
};

const createNonce = () => {
  const bytes = new Uint8Array(32);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const buildBboxStacksSignInMessage = (address: string, issuedAt = new Date()) => {
  return [
    `${BBOX_SIGN_IN_DOMAIN} wants you to sign in with your Stacks account:`,
    address,
    BBOX_SIGN_IN_STATEMENT,
    `URI: ${BBOX_SIGN_IN_URI}`,
    `Version: ${BBOX_SIGN_IN_VERSION}`,
    `Chain ID: ${BBOX_SIGN_IN_CHAIN_ID}`,
    `Nonce: ${createNonce()}`,
    `Issued At: ${issuedAt.toISOString()}`,
  ].join('\n');
};

const parseSignatureResponse = (response: unknown, message: string): StacksSignInSignature => {
  const payload = (response as RpcSignatureResponse)?.result ?? (response as RpcSignatureResponse);

  if (!payload || typeof payload.signature !== 'string') {
    throw new Error('Wallet returned an invalid sign-in signature.');
  }

  return {
    signature: payload.signature,
    publicKey: typeof payload.publicKey === 'string' ? payload.publicKey : undefined,
    message,
  };
};

const normalizeSignInError = (error: unknown, walletLabel: string) => {
  const fallback = `Failed to sign in with ${walletLabel}.`;
  const message = getWalletErrorMessage(error, fallback);

  if (isWalletRequestCancelled(error) || /cancel|reject/i.test(message)) {
    return 'Wallet connection was cancelled. Please try again.';
  }

  return message;
};

export const requestLeatherStacksSignIn = async (
  provider: RpcCapableProvider,
  address: string
): Promise<StacksSignInSignature> => {
  const message = buildBboxStacksSignInMessage(address);

  try {
    const response = await provider.request('stx_signMessage', { message });
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Leather'));
  }
};

export const requestXverseStacksSignIn = async (address: string): Promise<StacksSignInSignature> => {
  const message = buildBboxStacksSignInMessage(address);

  try {
    const response = await satsRequest('stx_signMessage', { message });
    return parseSignatureResponse(response, message);
  } catch (error) {
    throw new Error(normalizeSignInError(error, 'Xverse'));
  }
};
