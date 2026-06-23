import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { request as satsRequest } from 'sats-connect';
import { persistCachedWalletState, useWallet, type WalletType } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Wallet, Mail } from 'lucide-react';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { useRouter } from 'next/navigation';
import { getConnectedAccountPasskeyByAddress, getConnectedAccountByAddress } from '@/lib/connectedAccountsApi';
import { decryptPortableEncryptedWallet, type WalletData } from '@/lib/encryptedStorage';
// Password verification utility for settings changes
// Usage: await verifyPassphraseForSettings(address, passphrase, privateKey)
export async function verifyPassphraseForSettings(address: string, passphrase: string, privateKey: string): Promise<boolean> {
  try {
    // Fetch stored passkey hash from Supabase
    const storedPasskey = await getConnectedAccountPasskeyByAddress(address);
    if (!storedPasskey) return false;
    // Compute hash of privateKey + passphrase
    const inputHash = CryptoJS.SHA256(privateKey + passphrase).toString();
    // Compare with stored hash
    return storedPasskey === inputHash;
  } catch {
    return false;
  }
}
import CryptoJS from 'crypto-js';

declare global {
  interface Window {
    LeatherProvider?: unknown;
  }
}

interface ConnectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (err: string) => void;
  initialConnectMode?: ConnectMode;
}

type ConnectMode = 'wallets' | 'email';

interface EmailAccountPayload {
  account: {
    email: string;
    address: string;
    passkey: string;
    encryptedPrivateKey: string;
    encryptedMnemonic: string;
    encryptionSalt: string;
    encryptionIv: string;
    encryptionVersion?: string;
    walletLabel?: string;
  };
}

interface EmailWalletLoginResponse {
  wallet: {
    address: string;
    privateKey: string;
    mnemonic: string;
    label?: string;
  };
  account?: {
    email: string;
    address: string;
    walletLabel?: string;
  };
}

const isWalletLoginResponse = (payload: unknown): payload is EmailWalletLoginResponse => {
  if (!payload || typeof payload !== 'object') return false;
  const walletCandidate = (payload as EmailWalletLoginResponse).wallet;
  return Boolean(
    walletCandidate &&
    typeof walletCandidate.address === 'string' &&
    typeof walletCandidate.privateKey === 'string' &&
    typeof walletCandidate.mnemonic === 'string'
  );
};

const isEmailAccountPayload = (payload: unknown): payload is EmailAccountPayload => {
  if (!payload || typeof payload !== 'object') return false;
  const accountCandidate = (payload as EmailAccountPayload).account;
  return Boolean(
    accountCandidate &&
    typeof accountCandidate.address === 'string' &&
    typeof accountCandidate.passkey === 'string'
  );
};

// Destructure props at the top of your component
export default function ConnectModal({ onClose, onSuccess, onError, initialConnectMode }: ConnectModalProps) {
  const [connectMode, setConnectMode] = useState<ConnectMode>(initialConnectMode ?? 'wallets');
  const [wallets, setWallets] = useState<Array<{id: string, name: string, url: string, installed: boolean}>>([]);
  React.useEffect(() => {
    setWallets(detectWalletExtensions());
  }, []);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [password, setPassword] = useState('');
  const { setAddress, setWalletType } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const { createEncryptedWallet } = useEncryptedWallet();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const persistSessionForWallet = useCallback(async (connectedAddress: string, providerType: WalletType) => {
    if (typeof window === 'undefined') return;

    persistCachedWalletState(connectedAddress, providerType);

    try {
      const existingAccount = await getConnectedAccountByAddress(connectedAddress);
      const sessionPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
        existingAccount: Boolean(existingAccount),
        email: existingAccount?.email ?? null,
        accountId: existingAccount?.id ?? null,
      };
      localStorage.setItem('bbox_session', JSON.stringify(sessionPayload));
      window.dispatchEvent(new Event('bbox-session-update'));
    } catch (error) {
      console.warn('Failed to fetch connected account info, storing minimal session.', error);
      const fallbackPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
      };
      localStorage.setItem('bbox_session', JSON.stringify(fallbackPayload));
      window.dispatchEvent(new Event('bbox-session-update'));
    }
  }, []);





  const handleEmailConnect = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailStatus('error');
      setEmailMessage('Please enter your email address');
      onError?.('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      onError?.('Please enter a valid email address');
      return;
    }

    if (!password) {
      setEmailStatus('error');
      setEmailMessage('Please enter your password');
      onError?.('Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');

      const response = await fetch('/api/wallet-connect/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Failed to authenticate account';
        throw new Error(message);
      }

      let unlockedWallet: WalletData;

      if (isWalletLoginResponse(payload)) {
        unlockedWallet = {
          mnemonic: payload.wallet.mnemonic,
          privateKey: payload.wallet.privateKey,
          address: payload.wallet.address,
          label: payload.wallet.label || 'BBOX Wallet',
        };
      } else if (isEmailAccountPayload(payload)) {
        const account = payload.account;
        const walletPayload = {
          encryptedMnemonic: account.encryptedMnemonic,
          encryptedPrivateKey: account.encryptedPrivateKey,
          address: account.address,
          label: account.walletLabel || 'BBOX Wallet',
          salt: account.encryptionSalt,
          iv: account.encryptionIv,
          version: account.encryptionVersion,
        };

        try {
          unlockedWallet = decryptPortableEncryptedWallet(walletPayload, password);
        } catch {
          throw new Error('Invalid email or password');
        }

        const passkeyHash = CryptoJS.SHA256(unlockedWallet.privateKey + password).toString();
        if (passkeyHash !== account.passkey) {
          throw new Error('Invalid email or password');
        }
      } else {
        throw new Error('Failed to authenticate account');
      }

      await createEncryptedWallet(unlockedWallet, password);
      setAddress(unlockedWallet.address);
      setWalletType('imported');
      await persistSessionForWallet(unlockedWallet.address, 'imported');

      setPassword('');
      setEmailStatus('success');
      setEmailMessage('Wallet unlocked. Redirecting...');
      onSuccess?.();
      onClose();
      router.push(`/${unlockedWallet.bitcoinAddress || unlockedWallet.address}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate account';
      setEmailStatus('error');
      setEmailMessage(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/30 flex items-center justify-center z-[101] select-none">
      <div className="bg-background text-foreground rounded-2xl w-[400px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-foreground text-xl font-semibold flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Sign in with email
          </h2>
          <button 
            onClick={onClose}
            className="text-foreground/50 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {connectMode === 'wallets' && (
            <>
              {(wallets.length === 0 || wallets.every(w => !w.installed)) && (
                <div className="mb-2 text-gray-700 text-sm">
                  You don&apos;t have unknown wallets in your browser that support this app. You need to install a wallet to proceed.
                </div>
              )}
              <div className="space-y-3">
                {wallets.map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={w.id === 'leather' ? '/leather.svg' : w.id === 'xverse' ? '/xverse.svg' : ''}
                        alt={w.name}
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded"
                        unoptimized
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{w.name}</div>
                        <div className="text-xs text-gray-500">{w.url.replace('https://', '')}</div>
                      </div>
                    </div>
                    {w.installed ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-sm font-semibold cursor-pointer"
                        onClick={async () => {
                            setWalletError(null);
                          try {
                            if (w.id === 'leather' && window.LeatherProvider) {
                              const provider = window.LeatherProvider;
                              if (
                                provider &&
                                typeof provider === 'object' &&
                                'request' in provider &&
                                typeof (provider as { request?: unknown }).request === 'function'
                              ) {
                                // Use the latest Leather API: getAddresses
                                const response = await (provider as { request: (method: string, params?: unknown) => Promise<unknown> }).request('getAddresses');
                                const stxAddress = Array.isArray((response as { result?: { addresses?: { symbol: string; address: string }[] } })?.result?.addresses)
                                  ? ((response as { result: { addresses: { symbol: string; address: string }[] } }).result.addresses.find(addr => addr.symbol === 'STX')?.address)
                                  : undefined;
                                if (stxAddress) {
                                  setAddress(stxAddress);
                                  setWalletType('leather');
                                  await persistSessionForWallet(stxAddress, 'leather');
                                  onSuccess?.();
                                  onClose();
                                  router.push(`/${stxAddress}`);
                                } else {
                                  const errorMsg = 'No Stacks address found in Leather. Please check your wallet and try again.';
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                  console.warn('No Stacks address found in Leather.');
                                }
                              } else {
                                const errorMsg = 'Leather provider does not support request. Unlock the wallet and refresh the page.';
                                setWalletError(errorMsg);
                                onError?.(errorMsg);
                                console.warn('Leather provider does not support request.');
                              }
                            } else if (w.id === 'xverse') {
                              // Use Sats Connect API for Xverse
                              try {
                                const response = await satsRequest('wallet_connect', null);
                                if (response.status === 'success') {
                                  const stacksAddressItem = Array.isArray(response.result.addresses)
                                    ? (response.result.addresses as { purpose: string; address: string }[]).find(address => address.purpose === 'stacks')
                                    : undefined;
                                  const stxAddress = stacksAddressItem?.address;
                                  if (stxAddress) {
                                    setAddress(stxAddress);
                                    setWalletType('xverse');
                                    await persistSessionForWallet(stxAddress, 'xverse');
                                    onSuccess?.();
                                    onClose();
                                    router.push(`/${stxAddress}`);
                                  } else {
                                    const errorMsg = 'No Stacks address found in Xverse. Please check your wallet and try again.';
                                    setWalletError(errorMsg);
                                    onError?.(errorMsg);
                                    console.warn('No Stacks address found in Xverse.');
                                  }
                                } else {
                                  const errorMsg = response.error
                                    ? getWalletErrorMessage(response.error, 'Failed to connect to Xverse.')
                                    : 'Failed to connect to Xverse.';
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                  console.warn('Xverse connect error:', response.error);
                                }
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Xverse.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Wallet connection was cancelled. Please try again.');
                                  onError?.('Wallet connection was cancelled. Please try again.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('Xverse connect error:', err);
                              }
                            } else {
                              const errorMsg = 'Wallet provider not found. Please enable your wallet extension and refresh.';
                              setWalletError(errorMsg);
                              onError?.(errorMsg);
                              console.warn('Wallet provider not found for:', w.id);
                            }
                          } catch (err: unknown) {
                            const msg = getWalletErrorMessage(err, 'Failed to connect wallet.');
                            if (isWalletRequestCancelled(err)) {
                              const cancelMsg = 'Wallet connection was cancelled. Please try again.';
                              setWalletError(cancelMsg);
                              onError?.(cancelMsg);
                            } else {
                              setWalletError(msg);
                              onError?.(msg);
                            }
                            console.error('Wallet connect error:', err);
                          }
                        }}
                      >
                        Connect
                      </Button>
                    ) : (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 px-4 py-1 rounded-lg text-sm font-semibold hover:bg-gray-100 cursor-pointer"
                      >
                        Install →
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {walletError && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-200">
                  {walletError}
                </div>
              )}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-2 text-xs text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
              <Button
                onClick={() => setConnectMode('email')}
                className="w-full h-12 rounded-lg mb-2 bg-white text-gray-900 border border-gray-300 font-semibold text-base flex items-center px-4 hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                <Mail className="w-5 h-5 mr-2" />
                Sign In with Email
              </Button>

            </>
          )}
          {connectMode === 'email' && (
            <div className="space-y-2 text-black">
              <div className="space-y-0">
                <Label htmlFor="email" className='hidden'>Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-background text-foreground px-4 py-3 border-black/50 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]"
                />
              </div>
              <div className="space-y-0">
                <Label htmlFor="password" className="hidden">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-background text-foreground px-4 py-3 border-black/50 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]"
                />
              </div>
              <Button 
                onClick={handleEmailConnect} 
                disabled={!email || !password || isLoading} 
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              {emailMessage && (
                <div className="text-sm" style={{ color: emailStatus === 'error' ? 'red' : 'green', marginTop: 8 }}>
                  {emailMessage}
                </div>
              )}
            </div>
          )}
          {/* Mnemonic import disabled for security */}
          {false && (
            <div className="text-center py-8">
              <p className="text-gray-600 font-medium">Mnemonic import has been disabled for security reasons.</p>
              <p className="text-gray-500 text-sm mt-2">Use email registration to create a new wallet or connect with Leather/Xverse.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
