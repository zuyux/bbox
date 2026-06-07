import { schnorr } from '@noble/secp256k1';

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function getNostrPublicKeyFromPrivateKey(privateKeyHex: string): string {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKeyBytes = schnorr.getPublicKey(privateKey);
  return bytesToHex(publicKeyBytes);
}
