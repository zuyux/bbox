import { getStxAddress } from '@stacks/wallet-sdk';
import { validateMnemonic as isValidMnemonic, mnemonicToSeed, wordlists } from 'bip39';
import { HDKey } from '@scure/bip32';
import { getBitcoinAddressFromPrivateKey, getRootstockAddressFromPrivateKey, getLiquidAddressFromPrivateKey } from './bitcoinWallet';
import { getNostrPublicKeyFromPrivateKey } from './nostr';

/**
 * Validates a mnemonic and generates a wallet/account.
 * Returns { privateKey, address } or throws on error.
 */
export async function validateAndGenerateWallet(mnemonic: string) {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const words = normalizedMnemonic.split(' ');
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Mnemonic must contain either 12 or 24 words.');
  }

  const supportedWordlists = [wordlists.english, wordlists.spanish, wordlists.portuguese];
  const isValidSupportedMnemonic = supportedWordlists.some((wordlist) =>
    isValidMnemonic(normalizedMnemonic, wordlist)
  );
  if (!isValidSupportedMnemonic) throw new Error('Invalid mnemonic');

  const seed = await mnemonicToSeed(normalizedMnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const path = "m/44'/5757'/0'/0/0";
  const child = root.derive(path);
  if (!child.privateKey) {
    throw new Error('Unable to derive private key from mnemonic.');
  }

  const privateKeyBytes = child.privateKey;
  const privateKey = Array.from(privateKeyBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const account = {
    stxPrivateKey: privateKey,
    dataPrivateKey: privateKey,
    appsKey: privateKey,
    index: 0,
    salt: '',
  };

  const address = getStxAddress(account, 'mainnet');
  const bitcoinAddress = getBitcoinAddressFromPrivateKey(privateKey, 'mainnet');
  const rootstockAddress = getRootstockAddressFromPrivateKey(privateKey);
  const liquidAddress = getLiquidAddressFromPrivateKey(privateKey, 'mainnet');
  const nostrPublicKey = getNostrPublicKeyFromPrivateKey(privateKey);
  return { mnemonic: normalizedMnemonic, privateKey, address, bitcoinAddress, rootstockAddress, liquidAddress, nostrPublicKey };
}
