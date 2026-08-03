import { verifyMessageSignature, verifyMessageSignatureRsv } from '@stacks/encryption';
import { publicKeyFromSignatureRsv, publicKeyToAddressSingleSig } from '@stacks/transactions';
import { createHash } from 'crypto';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { bech32 } from 'bech32';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  PROFILE_PROOF_VERSION,
  PROFILE_PROOF_TTL_MS,
  canonicalJson,
  profileProofMessage,
  stripProfileProof,
  type ProfileMutationProof,
} from '@/lib/profileMutationProof';

export class ProfileMutationAuthError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}

const normalizeHex = (value: string) => value.trim().replace(/^0x/i, '').toLowerCase();

function verifyNostrProof(proof: ProfileMutationProof, message: string, address: string) {
  const event = JSON.parse(proof.signedPayload || '{}') as {
    id?: string; pubkey?: string; created_at?: number; kind?: number; tags?: string[][]; content?: string; sig?: string;
  };
  if (!event.id || !event.pubkey || !event.sig || event.content !== message || event.pubkey !== proof.publicKey || event.sig !== proof.signature) return false;
  const words = bech32.decode(address, 1000);
  if (words.prefix !== 'npub' || Buffer.from(bech32.fromWords(words.words)).toString('hex') !== event.pubkey) return false;
  const serialized = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
  const id = Buffer.from(sha256(new TextEncoder().encode(serialized))).toString('hex');
  return id === event.id && schnorr.verify(event.sig, event.id, event.pubkey);
}

export async function authorizeProfileMutation(args: {
  body: Record<string, unknown>;
  method: string;
  path: string;
  address: string;
}) {
  const proof = args.body.profileMutationProof as ProfileMutationProof | undefined;
  if (!proof || typeof proof !== 'object') throw new ProfileMutationAuthError('Wallet authorization is required');

  const expires = Date.parse(proof.expiresAt);
  if (
    proof.version !== PROFILE_PROOF_VERSION ||
    proof.method !== args.method.toUpperCase() ||
    proof.path !== args.path ||
    proof.address.toUpperCase() !== args.address.toUpperCase() ||
    !/^[0-9a-f]{48}$/i.test(proof.nonce) ||
    !Number.isFinite(expires) || expires < Date.now() || expires > Date.now() + PROFILE_PROOF_TTL_MS + 30_000
  ) throw new ProfileMutationAuthError('Invalid or expired wallet authorization');

  if (proof.payload !== canonicalJson(stripProfileProof(args.body))) {
    throw new ProfileMutationAuthError('Signed payload does not match the request');
  }

  const publicKey = normalizeHex(proof.publicKey || '');
  const signature = normalizeHex(proof.signature || '');
  const message = profileProofMessage(proof);
  try {
    if (proof.walletType === 'alby' || proof.walletType === 'nostria') {
      if (!verifyNostrProof(proof, message, args.address)) throw new ProfileMutationAuthError('Invalid wallet signature', 403);
    } else if (proof.walletType === 'imported') {
      const recovered = publicKeyFromSignatureRsv(createHash('sha256').update(message).digest('hex'), signature);
      if (normalizeHex(recovered) !== publicKey) throw new ProfileMutationAuthError('Invalid wallet signature', 403);
      const mainnet = publicKeyToAddressSingleSig(publicKey, 'mainnet');
      const testnet = publicKeyToAddressSingleSig(publicKey, 'testnet');
      if (![mainnet, testnet].some(value => value.toUpperCase() === args.address.toUpperCase())) {
        throw new ProfileMutationAuthError('Wallet public key does not control this address', 403);
      }
    } else {
      const mainnet = publicKeyToAddressSingleSig(publicKey, 'mainnet');
      const testnet = publicKeyToAddressSingleSig(publicKey, 'testnet');
      if (![mainnet, testnet].some(value => value.toUpperCase() === args.address.toUpperCase())) {
        throw new ProfileMutationAuthError('Wallet public key does not control this address', 403);
      }
      if (!verifyMessageSignature({ signature, message, publicKey }) &&
          !verifyMessageSignatureRsv({ signature, message, publicKey })) {
        throw new ProfileMutationAuthError('Invalid wallet signature', 403);
      }
    }
  } catch (error) {
    if (error instanceof ProfileMutationAuthError) throw error;
    throw new ProfileMutationAuthError('Invalid wallet signature', 403);
  }

  const { error } = await supabaseAdmin.from('profile_mutation_nonces').insert({
    nonce: proof.nonce.toLowerCase(), address: args.address, expires_at: proof.expiresAt,
  });
  if (error) {
    if (error.code === '23505') throw new ProfileMutationAuthError('Wallet authorization has already been used', 409);
    console.error('Unable to consume profile mutation nonce:', error);
    throw new ProfileMutationAuthError('Unable to validate wallet authorization', 503);
  }
}
