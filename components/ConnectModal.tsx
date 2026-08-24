
import { LocalizedText } from '@/components/LocalizedText';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { persistCachedWalletState, queueWelcomeModalAfterSignIn, useWallet, type WalletType } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, X, Wallet } from 'lucide-react';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { connectAlbyWallet } from '@/lib/albyWallet';
import { connectNostriaSigner } from '@/lib/nostriaSigner';
import { connectOkxWallet } from '@/lib/okxWallet';
import { connectWalletConnect } from '@/lib/walletConnectWallet';
import {
  requestLeatherMainnetAddresses,
  requestLeatherStacksSignIn,
  requestXverseMainnetAddresses,
  requestXverseStacksSignIn,
} from '@/lib/stacksSignInMessage';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { useRouter } from 'next/navigation';
import { getConnectedAccountPasskeyByAddress, getConnectedAccountByAddress } from '@/lib/connectedAccountsApi';
import { decryptPortableEncryptedWallet, getStoredEncryptedWallet, validatePassphraseStrength, type WalletData } from '@/lib/encryptedStorage';
import { createStacksAccount } from '@/lib/stacksWallet';
import ImportWalletModal from './ImportWalletModal';
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

type ConnectMode = 'wallets' | 'email' | 'import';
type EmailAuthStep = 'credentials' | 'create';

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
    bitcoinAddress?: string;
    rootstockAddress?: string;
    liquidAddress?: string;
  };
}

interface EmailWalletLoginResponse {
  wallet: {
    address: string;
    privateKey: string;
    mnemonic: string;
    label?: string;
    bitcoinAddress?: string;
    rootstockAddress?: string;
    liquidAddress?: string;
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
    setWallets([...detectWalletExtensions()].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);
  const [email, setEmail] = useState('');
  const [emailAuthStep, setEmailAuthStep] = useState<EmailAuthStep>('credentials');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [verifiedEmailToken, setVerifiedEmailToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [password, setPassword] = useState('');
  const { setAddress, setWalletType, setBitcoinAddress } = useWallet();
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
    queueWelcomeModalAfterSignIn(connectedAddress);

    if (providerType !== 'imported') {
      try {
        const notificationResponse = await fetch('/api/wallet-connect/signed-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: connectedAddress,
            provider: providerType,
          }),
        });

        if (!notificationResponse.ok) {
          console.warn('Wallet connected, but the sign-in notification failed.');
        }
      } catch (notificationError) {
        console.warn('Wallet connected, but the sign-in notification failed:', notificationError);
      }
    }

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





  const resetEmailCreationState = () => {
    setEmailCode('');
    setEmailCodeSent(false);
    setVerifiedEmailToken(null);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailMessage('');
    if (emailAuthStep === 'create') {
      resetEmailCreationState();
      setEmailAuthStep('credentials');
    }
  };

  const switchToCreateEmailAccount = (message = 'Email not registered yet. Verify it to create your account.') => {
    setEmailAuthStep('create');
    resetEmailCreationState();
    setEmailStatus('idle');
    setEmailMessage(message);
  };

  const handleRequestEmailCode = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');
      setVerifiedEmailToken(null);

      const response = await fetch('/api/auth/email-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setEmailCodeSent(true);
      setEmailStatus('success');
      setEmailMessage('CODE sent. Check your email.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification code';
      setEmailStatus('error');
      setEmailMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = emailCode.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setEmailStatus('error');
      setEmailMessage('Enter the 6-digit CODE.');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');

      const response = await fetch('/api/auth/email-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      });
      const result = await response.json();

      if (!response.ok || !result.verifiedEmailToken) {
        throw new Error(result.error || 'Failed to verify CODE');
      }

      setVerifiedEmailToken(result.verifiedEmailToken);
      setEmailStatus('success');
      setEmailMessage('Email verified. Create your account.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify CODE';
      setVerifiedEmailToken(null);
      setEmailStatus('error');
      setEmailMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEmailAccount = async () => {
    const trimmedEmail = email.trim();
    const strengthInfo = validatePassphraseStrength(password);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      return;
    }

    if (!verifiedEmailToken) {
      setEmailStatus('error');
      setEmailMessage('Verify your email before creating your account.');
      return;
    }

    if (!strengthInfo.isValid) {
      setEmailStatus('error');
      setEmailMessage(`Password needs: ${strengthInfo.feedback.join(', ')}`);
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');

      const { mnemonic, stxPrivateKey, address, bitcoinAddress, rootstockAddress, liquidAddress, nostrPublicKey } = await createStacksAccount('mainnet');
      const walletData: WalletData = {
        mnemonic,
        privateKey: stxPrivateKey,
        bitcoinAddress,
        rootstockAddress,
        liquidAddress,
        nostrPublicKey,
        address,
        label: `BBOXX Wallet - ${trimmedEmail}`,
      };

      await createEncryptedWallet(walletData, password);
      const encryptedSnapshot = getStoredEncryptedWallet();
      if (!encryptedSnapshot) {
        throw new Error('Failed to capture encrypted wallet snapshot. Please try again.');
      }

      const saveResponse = await fetch('/api/save-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          verifiedEmailToken,
          passkey: CryptoJS.SHA256(stxPrivateKey + password).toString(),
          passphrase: password,
          address,
          encryptedWallet: {
            encryptedMnemonic: encryptedSnapshot.encryptedMnemonic,
            encryptedPrivateKey: encryptedSnapshot.encryptedPrivateKey,
            salt: encryptedSnapshot.salt,
            iv: encryptedSnapshot.iv,
            version: encryptedSnapshot.version,
            label: encryptedSnapshot.label,
            bitcoinAddress: encryptedSnapshot.bitcoinAddress,
            rootstockAddress: encryptedSnapshot.rootstockAddress,
            liquidAddress: encryptedSnapshot.liquidAddress,
            nostrPublicKey: encryptedSnapshot.nostrPublicKey,
          },
        }),
      });
      const saveResult = await saveResponse.json().catch(() => null);

      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || 'Failed to create account.');
      }

      await fetch('/api/wallet-connect/account-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, bitcoinAddress: walletData.bitcoinAddress, preVerified: true }),
      }).catch((error) => {
        console.warn('Failed to send account created email:', error);
      });

      setAddress(walletData.address);
      setWalletType('imported');
      await persistSessionForWallet(walletData.address, 'imported');
      setPassword('');
      setEmailStatus('success');
      setEmailMessage('Account created. Redirecting...');
      onSuccess?.();
      onClose();
      router.push(`/welcome?email=${encodeURIComponent(trimmedEmail)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      setEmailStatus('error');
      setEmailMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConnect = async () => {
    const identifier = email.trim();
    if (!identifier) {
      setEmailStatus('error');
      setEmailMessage('Please enter your username or email address');
      onError?.('Please enter your username or email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (identifier.includes('@') && !emailRegex.test(identifier)) {
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
        body: JSON.stringify({ identifier, password }),
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
          label: payload.wallet.label || 'BBOXX Wallet',
          bitcoinAddress: payload.wallet.bitcoinAddress,
          rootstockAddress: payload.wallet.rootstockAddress,
          liquidAddress: payload.wallet.liquidAddress,
        };
      } else if (isEmailAccountPayload(payload)) {
        const account = payload.account;
        const walletPayload = {
          encryptedMnemonic: account.encryptedMnemonic,
          encryptedPrivateKey: account.encryptedPrivateKey,
          address: account.address,
          label: account.walletLabel || 'BBOXX Wallet',
          salt: account.encryptionSalt,
          iv: account.encryptionIv,
          version: account.encryptionVersion,
          bitcoinAddress: account.bitcoinAddress,
          rootstockAddress: account.rootstockAddress,
          liquidAddress: account.liquidAddress,
        };

        try {
          unlockedWallet = await decryptPortableEncryptedWallet(walletPayload, password);
        } catch {
          throw new Error('Invalid username, email, or password');
        }

        const passkeyHash = CryptoJS.SHA256(unlockedWallet.privateKey + password).toString();
        if (passkeyHash !== account.passkey) {
          throw new Error('Invalid username, email, or password');
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
      router.push('/wallet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate account';
      if (identifier.includes('@')) {
        try {
          const checkResponse = await fetch('/api/profile/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: identifier }),
          });
          const checkResult = await checkResponse.json();
          if (checkResponse.ok && checkResult.exists === false) {
            switchToCreateEmailAccount();
            return;
          }
        } catch (checkError) {
          console.warn('Email availability check failed:', checkError);
        }
      }
      setEmailStatus('error');
      setEmailMessage(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-background/20 backdrop-blur-md flex items-center justify-center z-[201] select-none">
      <div className="bg-background text-foreground rounded-2xl w-[calc(100%_-_2rem)] max-w-[400px] max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-foreground text-xl font-semibold flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            <LocalizedText>{connectMode === 'import' ? 'Recover Wallet' : connectMode === 'email' ? 'Continue with Email' : 'Connect Wallet'}
          </LocalizedText></h2>
          <button 
            onClick={onClose}
            className="text-foreground/50 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label={"Close"}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {connectMode === "wallets" && (
            <>
              {(wallets.length === 0 || wallets.every(w => !w.installed && w.id !== 'walletconnect')) && (
                <div className="mb-2 text-gray-700 text-sm">
                  <LocalizedText>You don&apos;t have unknown wallets in your browser that support this app. You need to install a wallet to proceed.
                </LocalizedText></div>
              )}
              <div className="space-y-3">
                {wallets.map(w => {
                  const canAttemptConnect = w.installed || w.id === 'walletconnect';
                  return (
                    <div key={w.id} className="flex items-center justify-between rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={w.id === "leather" ? '/leather.svg' : w.id === "xverse" ? '/xverse.svg' : w.id === "alby" ? '/alby.svg' : w.id === "nostria" ? '/nostria.svg' : w.id === "okx" ? '/okx.webp' : w.id === "walletconnect" ? '/wallet-connect.png' : ''}
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
                      {canAttemptConnect ? (
                      <Button
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1 rounded-lg text-sm font-semibold cursor-pointer"
                        onClick={async () => {
                            setWalletError(null);
                          try {
                            if (w.id === "leather" && window.LeatherProvider) {
                              const provider = window.LeatherProvider;
                              if (
                                provider &&
                                typeof provider === "object" &&
                                "request" in provider &&
                                typeof (provider as { request?: unknown }).request === "function"
                              ) {
                                const leatherProvider = provider as { request: (method: string, params?: unknown) => Promise<unknown> };
                                const { stacksAddress: stxAddress, bitcoinAddress } = await requestLeatherMainnetAddresses(leatherProvider);
                                await requestLeatherStacksSignIn(leatherProvider, stxAddress);
                                setAddress(stxAddress);
                                setWalletType('leather');
                                setBitcoinAddress(bitcoinAddress);
                                persistCachedWalletState(stxAddress, 'leather', bitcoinAddress);
                                await persistSessionForWallet(stxAddress, 'leather');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } else {
                                const errorMsg = "Leather provider does not support request. Unlock the wallet and refresh the page.";
                                setWalletError(errorMsg);
                                onError?.(errorMsg);
                                console.warn('Leather provider does not support request.');
                              }
                            } else if (w.id === "xverse") {
                              try {
                                const { stacksAddress: stxAddress, bitcoinAddress } = await requestXverseMainnetAddresses();
                                await requestXverseStacksSignIn(stxAddress);
                                setAddress(stxAddress);
                                setWalletType('xverse');
                                setBitcoinAddress(bitcoinAddress);
                                persistCachedWalletState(stxAddress, 'xverse', bitcoinAddress);
                                await persistSessionForWallet(stxAddress, 'xverse');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
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
                            } else if (w.id === "alby") {
                              try {
                                const albyConnection = await connectAlbyWallet();
                                setAddress(albyConnection.address);
                                setWalletType('alby');
                                await persistSessionForWallet(albyConnection.address, 'alby');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Alby.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Wallet connection was cancelled. Please try again.');
                                  onError?.('Wallet connection was cancelled. Please try again.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('Alby connect error:', err);
                              }
                            } else if (w.id === "nostria") {
                              try {
                                const nostriaConnection = await connectNostriaSigner();
                                setAddress(nostriaConnection.address);
                                setWalletType('nostria');
                                await persistSessionForWallet(nostriaConnection.address, 'nostria');
                                if (typeof window !== "undefined" && nostriaConnection.authEvent) {
                                  localStorage.setItem('bbox_nostria_auth', JSON.stringify({
                                    address: nostriaConnection.address,
                                    publicKeyHex: nostriaConnection.publicKeyHex,
                                    authEvent: nostriaConnection.authEvent,
                                    connectedAt: Date.now(),
                                  }));
                                }
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Nostria Signer.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Signer connection was cancelled. Please try again.');
                                  onError?.('Signer connection was cancelled. Please try again.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('Nostria Signer connect error:', err);
                              }
                            } else if (w.id === "okx") {
                              try {
                                const okxConnection = await connectOkxWallet();
                                setAddress(okxConnection.address);
                                setWalletType('okx');
                                await persistSessionForWallet(okxConnection.address, 'okx');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'Failed to connect to OKX Wallet.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Wallet connection was cancelled. Please try again.');
                                  onError?.('Wallet connection was cancelled. Please try again.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('OKX Wallet connect error:', err);
                              }
                            } else if (w.id === "walletconnect") {
                              try {
                                const walletConnectConnection = await connectWalletConnect();
                                setAddress(walletConnectConnection.address);
                                setWalletType('walletconnect');
                                await persistSessionForWallet(walletConnectConnection.address, 'walletconnect');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'Failed to connect with WalletConnect.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Wallet connection was cancelled. Please try again.');
                                  onError?.('Wallet connection was cancelled. Please try again.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('WalletConnect connect error:', err);
                              }
                            } else {
                              const errorMsg = "Wallet provider not found. Please enable your wallet extension and refresh.";
                              setWalletError(errorMsg);
                              onError?.(errorMsg);
                              console.warn('Wallet provider not found for:', w.id);
                            }
                          } catch (err: unknown) {
                            const msg = getWalletErrorMessage(err, 'Failed to connect wallet.');
                            if (isWalletRequestCancelled(err)) {
                              const cancelMsg = "Wallet connection was cancelled. Please try again.";
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
                        <LocalizedText>Connect
                      </LocalizedText></Button>
                    ) : (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 px-4 py-1 rounded-lg text-sm font-semibold hover:bg-gray-100 cursor-pointer"
                      >
                        <LocalizedText>Install →
                      </LocalizedText></a>
                    )}
                  </div>
                  );
                })}
              </div>
              {walletError && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-200">
                  {walletError}
                </div>
              )}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-2 text-xs text-gray-400"><LocalizedText>or</LocalizedText></span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
              <Button
                onClick={() => setConnectMode('email')}
                className="w-full h-12 rounded-lg mb-2 bg-white text-gray-900 border border-gray-300 font-semibold text-base flex items-center px-4 hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                <Image src="/email.svg" alt="" width={22} height={22} className="mr-2 h-5 w-5" />
                <LocalizedText>Continue with Email
              </LocalizedText></Button>
            </>
          )}
          {connectMode === "email" && (
            <div className="space-y-3 text-black">
              <div className="space-y-0">
                <Label htmlFor="email" className="hidden">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Email"
                  className="h-12 bg-background px-5 py-3 text-base text-foreground border-foreground/40 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]"
                  disabled={isLoading || Boolean(verifiedEmailToken)}
                />
              </div>
              <div className="space-y-0">
                <Label htmlFor="password" className="hidden"><LocalizedText>Password</LocalizedText></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-12 bg-background px-5 py-3 pr-12 text-base text-foreground border-foreground/40 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]"
                    autoComplete={emailAuthStep === 'create' ? 'new-password' : 'current-password'}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {emailAuthStep === 'credentials' ? (
                <Button 
                  onClick={handleEmailConnect} 
                  disabled={!email || !password || isLoading} 
                  className="w-full h-11"
                >
                  {isLoading ? "Checking..." : "Continue with Email"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleRequestEmailCode}
                      disabled={!email || isLoading || Boolean(verifiedEmailToken)}
                      className="flex-1 h-11"
                    >
                      {emailCodeSent ? 'Resend CODE' : 'Send CODE'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetEmailCreationState();
                        setEmailAuthStep('credentials');
                        setEmailMessage('');
                      }}
                      disabled={isLoading}
                      className="h-11"
                    >
                      Change
                    </Button>
                  </div>
                  {emailCodeSent && (
                    <div className="flex gap-2">
                      <Input
                        id="email-code"
                        type="text"
                        inputMode="numeric"
                        value={emailCode}
                        onChange={(e) => {
                          setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setVerifiedEmailToken(null);
                        }}
                        placeholder="CODE"
                        className="h-12 bg-background px-5 py-3 text-base text-foreground border-foreground/40 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 focus-visible:ring-[3px]"
                        autoComplete="one-time-code"
                        disabled={isLoading || Boolean(verifiedEmailToken)}
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyEmailCode}
                        disabled={emailCode.length !== 6 || isLoading || Boolean(verifiedEmailToken)}
                        className="h-12"
                      >
                        Verify
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={handleCreateEmailAccount}
                    disabled={!password || !verifiedEmailToken || isLoading}
                    className="w-full h-11"
                  >
                    {isLoading ? 'Continuing...' : 'Continue with Email'}
                  </Button>
                </div>
              )}
              {emailMessage && (
                <div className="text-sm" style={{ color: emailStatus === 'error' ? 'red' : 'green', marginTop: 8 }}>
                  {emailMessage}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setEmailMessage('');
                  setConnectMode('import');
                }}
                className="w-full pt-2 text-center text-sm font-medium text-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                <LocalizedText>Recover with mnemonic</LocalizedText>
              </button>
            </div>
          )}
          {connectMode === 'import' && (
            <ImportWalletModal
              onBack={() => setConnectMode('email')}
              onImported={async (wallet, newPassword) => {
                await createEncryptedWallet(wallet, newPassword);
                setAddress(wallet.address);
                setWalletType('imported');
                await persistSessionForWallet(wallet.address, 'imported');
                onSuccess?.();
                onClose();
                router.push('/wallet');
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
