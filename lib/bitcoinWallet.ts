import { bech32 } from 'bech32';
import { keccak256 } from 'js-sha3';
import CryptoJS from 'crypto-js';
import { privateKeyToPublic } from '@stacks/transactions';
import { privateKeyToBytes } from '@stacks/common';

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const hash160 = (data: Uint8Array): Uint8Array => {
  const hex = bytesToHex(data);
  const sha256 = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hex));
  const ripemd = CryptoJS.RIPEMD160(sha256).toString(CryptoJS.enc.Hex);
  return hexToBytes(ripemd);
};

export function getBitcoinAddressFromPrivateKey(
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string {
  const publicKey = privateKeyToPublic(privateKey);
  const publicKeyHex = typeof publicKey === 'string' ? publicKey : bytesToHex(publicKey);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  const witnessProgram = hash160(publicKeyBytes);

  const words = bech32.toWords(witnessProgram);
  words.unshift(0);

  const prefix = network === 'testnet' ? 'tb' : 'bc';
  return bech32.encode(prefix, words);
}

export function getRootstockAddressFromPrivateKey(privateKey: string): string {
  const publicKey = privateKeyToPublic(privateKey);
  const publicKeyHex = typeof publicKey === 'string' ? publicKey : bytesToHex(publicKey);
  const normalizedPublicKeyHex = publicKeyHex.startsWith('04') ? publicKeyHex.slice(2) : publicKeyHex;
  const publicKeyBytes = hexToBytes(normalizedPublicKeyHex);
  const hashed = keccak256(publicKeyBytes);
  const hashBytes = hexToBytes(hashed);
  const addressBytes = hashBytes.slice(-20);
  return `0x${bytesToHex(addressBytes)}`;
}

export function getLiquidAddressFromPrivateKey(
  privateKey: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): string {
  const publicKey = privateKeyToPublic(privateKey);
  const publicKeyHex = typeof publicKey === 'string' ? publicKey : bytesToHex(publicKey);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  const witnessProgram = hash160(publicKeyBytes);

  const words = bech32.toWords(witnessProgram);
  words.unshift(0);

  const prefix = network === 'testnet' ? 'ert' : 'ex';
  return bech32.encode(prefix, words);
}

export async function deriveStacksPrivateKeyFromMnemonic(
  mnemonic: string
): Promise<string> {
  const { mnemonicToSeed } = await import('@scure/bip39');
  const { HDKey } = await import('@scure/bip32');
  const seed = await mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive("m/44'/5757'/0'/0/0");
  if (!child.privateKey) {
    throw new Error('Failed to derive private key from mnemonic');
  }
  return bytesToHex(child.privateKey);
}
