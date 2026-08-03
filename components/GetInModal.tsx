
import { LocalizedText } from "@/components/LocalizedText";
import React, { useEffect, useState } from "react";
import CryptoJS from 'crypto-js';
import Image from "next/image";
import Link from 'next/link';
import { persistCachedWalletState, queueWelcomeModalAfterSignIn, useWallet } from './WalletProvider';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp, X, Shield } from 'lucide-react';
import { createStacksAccount } from '@/lib/stacksWallet';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/PasswordInput';
import ConnectModal from './ConnectModal';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { formatStxAddress } from '@/lib/address-utils';
import { getStoredEncryptedWallet } from '@/lib/encryptedStorage';
import { connectAlbyWallet } from '@/lib/albyWallet';
import { connectNostriaSigner } from '@/lib/nostriaSigner';
import { connectOkxWallet } from '@/lib/okxWallet';
import { connectWalletConnect } from '@/lib/walletConnectWallet';
import {
  requestLeatherMainnetStacksAddress,
  requestLeatherStacksSignIn,
  requestXverseMainnetStacksAddress,
  requestXverseStacksSignIn,
} from '@/lib/stacksSignInMessage';

export default function GetInModal({ onClose }: { onClose?: () => void }) {
  const { address, setAddress, setWalletType } = useWallet();
  const {
    isWalletEncrypted,
    isAuthenticated: isEncryptedAuthenticated,
    isSessionLocked,
    createEncryptedWallet,
    unlockWallet,
    authError: encryptedAuthError,
    isLoading: encryptedLoading,
    walletInfo
  } = useEncryptedWallet();
  const router = useRouter();

  const [walletError, setWalletError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importModalMode, setImportModalMode] = useState<'wallets' | 'email'>('wallets');
  const [showEncryptedWalletFlow, setShowEncryptedWalletFlow] = useState(false);
  const [encryptedWalletMode, setEncryptedWalletMode] = useState<'unlock' | 'create'>('unlock');
  const [createWalletError, setCreateWalletError] = useState<string | null>(null);

  const walletOptions = [
    { id: 'alby', label: 'Alby', icon: '/alby.svg', needsContrastPlate: true, mode: 'wallets' as const },
    { id: 'leather', label: 'Leather', icon: '/leather.svg', mode: 'wallets' as const },
    { id: 'nostria', label: 'Nostria Signer', icon: '/nostria.svg', mode: 'wallets' as const },
    { id: 'okx', label: 'OKX Wallet', icon: '/okx.webp', mode: 'wallets' as const },
    { id: 'walletconnect', label: 'WalletConnect', icon: '/wallet-connect.png', mode: 'wallets' as const },
    { id: 'xverse', label: 'Xverse', icon: '/xverse.svg', needsContrastPlate: true, mode: 'wallets' as const },
  ];

  const persistWalletContext = (
    newAddress: string,
    type: 'imported' | 'xverse' | 'leather' | 'alby' | 'nostria' | 'okx' | 'walletconnect' = 'imported',
    options: { showWelcomeModalAfterSignIn?: boolean } = {}
  ) => {
    persistCachedWalletState(newAddress, type);
    setAddress(newAddress);
    setWalletType(type);
    if (options.showWelcomeModalAfterSignIn !== false) {
      queueWelcomeModalAfterSignIn(newAddress);
    }
    console.log('[GetInModal] Persisted wallet session via WalletProvider', { newAddress, type });
  };

  const [xverseInstalled, setXverseInstalled] = useState(false);
  const [leatherInstalled, setLeatherInstalled] = useState(false);
  const [albyInstalled, setAlbyInstalled] = useState(false);
  const [okxInstalled, setOkxInstalled] = useState(false);
  const [walletInstallUrl, setWalletInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wallets = detectWalletExtensions();
    setXverseInstalled(wallets.some((wallet) => wallet.id === 'xverse' && wallet.installed));
    setLeatherInstalled(wallets.some((wallet) => wallet.id === 'leather' && wallet.installed));
    setAlbyInstalled(wallets.some((wallet) => wallet.id === 'alby' && wallet.installed));
    setOkxInstalled(wallets.some((wallet) => wallet.id === 'okx' && wallet.installed));
  }, []);

  const handleXverseConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    if (!xverseInstalled) {
      setWalletError(
        'Xverse wallet was not detected. Install Xverse or enable it for this page, then refresh and try again.'
      );
      setWalletInstallUrl('https://xverse.app');
      return;
    }

    try {
      const stxAddress = await requestXverseMainnetStacksAddress();
      await requestXverseStacksSignIn(stxAddress);
      persistWalletContext(stxAddress, 'xverse');
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Xverse.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Wallet connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      console.error('Xverse connect error:', err);
    }
  };

  const handleLeatherConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    if (!leatherInstalled) {
      setWalletError(
        'Leather wallet was not detected. Install Leather or enable it for this page, then refresh and try again.'
      );
      setWalletInstallUrl('https://leather.io');
      return;
    }

    try {
      const provider = window.LeatherProvider;
      if (
        !provider ||
        typeof provider !== 'object' ||
        !('request' in provider) ||
        typeof (provider as { request?: unknown }).request !== 'function'
      ) {
        setWalletError('Leather wallet provider is not available. Please enable Leather for this page.');
        setWalletInstallUrl('https://leather.io');
        return;
      }

      const leatherProvider = provider as { request: (method: string, params?: unknown) => Promise<unknown> };
      const stxAddress = await requestLeatherMainnetStacksAddress(leatherProvider);
      await requestLeatherStacksSignIn(leatherProvider, stxAddress);
      persistWalletContext(stxAddress, 'leather');
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Leather.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Wallet connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      setWalletInstallUrl('https://leather.io');
      console.error('Leather connect error:', err);
    }
  };

  const handleAlbyConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    if (!albyInstalled) {
      setWalletError(
        'Alby was not detected. Install Alby or enable it for this page, then refresh and try again.'
      );
      setWalletInstallUrl('https://getalby.com');
      return;
    }

    try {
      const albyConnection = await connectAlbyWallet();
      persistWalletContext(albyConnection.address, 'alby');
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Alby.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Wallet connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      setWalletInstallUrl('https://getalby.com');
      console.error('Alby connect error:', err);
    }
  };

  const handleNostriaConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    try {
      const nostriaConnection = await connectNostriaSigner();
      persistWalletContext(nostriaConnection.address, 'nostria');
      if (typeof window !== 'undefined' && nostriaConnection.authEvent) {
        localStorage.setItem('bbox_nostria_auth', JSON.stringify({
          address: nostriaConnection.address,
          publicKeyHex: nostriaConnection.publicKeyHex,
          authEvent: nostriaConnection.authEvent,
          connectedAt: Date.now(),
        }));
      }
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect to Nostria Signer.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Signer connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      setWalletInstallUrl('https://www.nostria.app/');
      console.error('Nostria Signer connect error:', err);
    }
  };

  const handleOkxConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    if (!okxInstalled) {
      setWalletError(
        'OKX Wallet was not detected. Install OKX Wallet or enable it for this page, then refresh and try again.'
      );
      setWalletInstallUrl('https://web3.okx.com/wallet');
      return;
    }

    try {
      const okxConnection = await connectOkxWallet();
      persistWalletContext(okxConnection.address, 'okx');
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect to OKX Wallet.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Wallet connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      setWalletInstallUrl('https://web3.okx.com/wallet');
      console.error('OKX Wallet connect error:', err);
    }
  };

  const handleWalletConnect = async () => {
    setWalletError(null);
    setWalletInstallUrl(null);

    try {
      const walletConnectConnection = await connectWalletConnect();
      persistWalletContext(walletConnectConnection.address, 'walletconnect');
      if (onClose) onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const errorMsg = getWalletErrorMessage(err, 'Failed to connect with WalletConnect.');
      if (isWalletRequestCancelled(err)) {
        setWalletError('Wallet connection was cancelled. Please try again.');
      } else {
        setWalletError(errorMsg);
      }
      setWalletInstallUrl('https://walletconnect.network');
      console.error('WalletConnect connect error:', err);
    }
  };

  useEffect(() => {
    if (address && onClose) {
      onClose();
    }
  }, [address, onClose]);

  useEffect(() => {
    if (isEncryptedAuthenticated && onClose) {
      onClose();
    }
  }, [isEncryptedAuthenticated, onClose]);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);


  const handleEncryptedWalletSubmit = async (password: string, email?: string, verifiedEmailToken?: string) => {
    try {
      if (encryptedWalletMode === 'create') {
        setCreateWalletError(null);
        const trimmedEmail = email?.trim();

        if (!trimmedEmail) {
          setCreateWalletError('Email is required to create a wallet.');
          return;
        }

        if (!verifiedEmailToken) {
          setCreateWalletError('Verify your email before creating a wallet.');
          return;
        }

        // Check for duplicate emails before creating the wallet
        try {
          const duplicateResponse = await fetch('/api/profile/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmedEmail })
          });
          const duplicateData = await duplicateResponse.json();
          if (duplicateResponse.ok && duplicateData.exists) {
            setCreateWalletError('Email is already registered.');
            return;
          }
        } catch (checkError) {
          console.warn('Email availability check failed:', checkError);
        }

        // Generate new wallet data for encryption
        const { mnemonic, stxPrivateKey, address, bitcoinAddress, rootstockAddress, liquidAddress } = await createStacksAccount('mainnet');
        const walletData = {
          mnemonic,
          privateKey: stxPrivateKey,
          bitcoinAddress,
          rootstockAddress,
          liquidAddress,
          address,
          label: 'sumak'
        };
        await createEncryptedWallet(walletData, password);
        persistWalletContext(walletData.address, 'imported', { showWelcomeModalAfterSignIn: false });

        const encryptedSnapshot = getStoredEncryptedWallet();
        if (!encryptedSnapshot) {
          setCreateWalletError('Failed to capture encrypted wallet snapshot. Please try again.');
          return;
        }

        // Save to Supabase if email provided
        if (trimmedEmail) {
          try {
            console.log('Attempting to save account to database...');
            const response = await fetch('/api/save-account', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
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
	                }
	              }),
            });

            const result = await response.json();

            if (!response.ok) {
              if (response.status === 409) {
                setCreateWalletError(result.error || 'Email is already registered.');
                return;
              }
              console.warn('Failed to save account to database:', result);
              console.warn('Account creation will continue without database save');
              // Don't throw error - continue with wallet creation even if DB save fails
            } else {
              console.log('Account saved to database successfully:', result);
            }
          } catch (dbError) {
            console.warn('Database save error:', dbError);
            console.warn('Account creation will continue without database save');
            // Don't throw error - continue with wallet creation even if DB save fails
          }

          // Send confirmation email with address
          try {
            const mailRes = await fetch('/api/wallet-connect/account-created', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: trimmedEmail, bitcoinAddress: walletData.bitcoinAddress, preVerified: true }),
            });
            const mailResult = await mailRes.json();
            if (!mailRes.ok) {
              console.warn('Failed to send confirmation email:', mailResult);
            } else {
              console.log('Confirmation email sent:', mailResult);
            }
          } catch (mailError) {
            console.warn('Error sending confirmation email:', mailError);
          }
        }

        // Redirect to welcome page with email
        const emailParam = trimmedEmail ? `?email=${encodeURIComponent(trimmedEmail)}` : '';
        router.push(`/welcome${emailParam}`);
        if (onClose) onClose();
      } else {
        setCreateWalletError(null);
        await unlockWallet(password);
        let unlockedAddress = walletInfo?.address;

        if (!unlockedAddress && typeof window !== 'undefined') {
          const sessionRaw = localStorage.getItem('bbox_session');
          try {
            unlockedAddress = sessionRaw ? JSON.parse(sessionRaw)?.address : null;
          } catch (error) {
            console.warn('Failed to parse bbox_session while unlocking wallet:', error);
          }
        }

        if (unlockedAddress) {
          persistWalletContext(unlockedAddress);
        }

        if (unlockedAddress) {
          router.push('/wallet');
          if (onClose) onClose();
        }
      }
    } catch (error) {
      // Error will be handled by the PassphraseInput component
      console.error('Encrypted wallet operation failed:', error);
    }
  };

  const handleShowEncryptedWallet = () => {
    setEncryptedWalletMode(isWalletEncrypted ? 'unlock' : 'create');
    setCreateWalletError(null);
    setShowEncryptedWalletFlow(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 border-[1px] flex items-center justify-center z-[100] select-none"
      onClick={(e) => {
        // Close modal when clicking on the overlay (background)
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card text-card-foreground rounded-[21px] w-[360px] pt-8 pb-0 px-0 shadow-2xl flex flex-col items-center
          transition-all duration-300 ease-out
          opacity-0 translate-y-[-24px] animate-getinmodal border border-border"
        onClick={(e) => {
          // Prevent modal from closing when clicking inside the modal content
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="w-full grid grid-cols-3 gap-0 relative mb-6 px-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="justify-start bg-none border-none text-muted-foreground text-sm cursor-pointer" aria-label={"Help"} type="button">
                  <CircleHelp className="h-[18px]"/>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-background text-foreground max-w-xs text-sm z-100">
                                  <div>
                    <LocalizedText>Connect or create your account using your wallet or email.</LocalizedText><br />
                    <span className="text-foreground underline">
                      <a href="mailto:fabohax@gmail.com"><LocalizedText>Need help? Contact us</LocalizedText></a>
                    </span>
                  </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="title text-center font-semibold text-lg text-foreground tracking-wider flex items-center justify-center select-none">

          </div>
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="bg-none border-none text-muted-foreground text-xl cursor-pointer" aria-label={"Close"} type="button">
              <X className="h-[18px]"/>
            </button>
          </div>
        </div>
        {/* Auth Options - Conditional rendering based on flow */}
        <div className="w-full flex flex-col gap-3 px-6 mb-3">
          {/* Auth options: Connect Wallet, Encrypted Wallet, Email, Mnemonic */}
          {showEncryptedWalletFlow ? (
            /* Encrypted Wallet Flow */
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {encryptedWalletMode === 'create' ? "Secure Your Wallet" :
                   isSessionLocked ? "Unlock Your Wallet" : "Access Your Wallet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {encryptedWalletMode === 'create'
                    ? "Create an account with password"
                    : "Enter your password to unlock your encrypted wallet"
                  }
                </p>
              </div>

              <PasswordInput
                mode={encryptedWalletMode}
                onSubmit={handleEncryptedWalletSubmit}
                isLoading={encryptedLoading}
                error={encryptedWalletMode === 'create' ? createWalletError : encryptedAuthError}
                showStrengthIndicator={encryptedWalletMode === 'create'}
                onCancel={() => setShowEncryptedWalletFlow(false)}
              />

              {encryptedWalletMode === 'unlock' && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.removeItem('bbox_session');
                        localStorage.removeItem('bbox_session_config');
                        localStorage.removeItem('bbox_session_locked');
                        localStorage.removeItem('bbox_encrypted_session');
                        localStorage.removeItem('bbox_encrypted_wallet');
                        localStorage.removeItem('blockstack-session');
                        localStorage.removeItem('connect-session');
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full h-10 rounded-[7px] bg-transparent text-muted-foreground text-sm border border-border cursor-pointer flex items-center px-4 hover:bg-secondary hover:text-destructive mt-2"
                    type="button"
                  >
                    <LocalizedText>Clear All Sessions
                  </LocalizedText></Button>
                </div>
              )}
            </div>
          ) : (
            /* Main Auth Options */
            <>
              <div className="grid grid-cols-2 gap-2">
                {walletOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (option.id === "xverse") {
                        handleXverseConnect();
                        return;
                      }
                      if (option.id === "leather") {
                        handleLeatherConnect();
                        return;
                      }
                      if (option.id === "alby") {
                        handleAlbyConnect();
                        return;
                      }
                      if (option.id === "nostria") {
                        handleNostriaConnect();
                        return;
                      }
                      if (option.id === "okx") {
                        handleOkxConnect();
                        return;
                      }
                      if (option.id === "walletconnect") {
                        handleWalletConnect();
                        return;
                      }
                      setImportModalMode(option.mode);
                      setShowImportModal(true);
                    }}
                    className="group flex flex-col items-center justify-center gap-2 rounded-[13px] border border-border bg-background px-3 py-4 text-center transition hover:border-ring hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={`mb-1 flex h-11 w-11 items-center justify-center rounded-[10px] ${
                        option.needsContrastPlate ? 'bg-slate-950 p-1.5' : ''
                      }`}
                    >
                      <Image
                        src={option.icon}
                        alt={option.label}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md bg-transparent object-contain"
                        unoptimized
                      />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{option.label}</span>
                  </button>
                ))}
              </div>

              {walletError && (
                <div className="text-red-500 text-xs mt-2 text-center">
                  {walletError}
                  {walletInstallUrl && (
                    <div className="mt-1">
                      <a
                        href={walletInstallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-current hover:text-accent-primary"
                      >
                        <LocalizedText>Install Wallet
                      </LocalizedText></a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2">
                <Button
                  onClick={() => {
                    setImportModalMode('email');
                    setShowImportModal(true);
                  }}
                  className="w-full h-12 rounded-[9px] bg-background text-foreground font-semibold text-base cursor-pointer flex items-center px-4 border border-border hover:bg-muted"
                  type="button"
                >
                  <Image
                    src="/wallet.svg"
                    alt="Sign in With Email"
                    width={18}
                    height={18}
                    className="mr-3 invert dark:invert-0"
                    unoptimized
                  />
                  <span className="text-center flex-1"><LocalizedText>Email Signing</LocalizedText></span>
                </Button>
              </div>

              {/* Encrypted Wallet Option */}
              <div>
                <Button
                  onClick={handleShowEncryptedWallet}
                  className="w-full h-12 rounded-[9px] bg-[#0000ff] text-foreground font-semibold text-base cursor-pointer flex items-center px-4 hover:bg-[#0000ff]"
                  type="button"
                >
                  <Shield className="dark:invert text-background w-[18px] h-[18px] mx-[5px]"/>
                  <span className="text-center flex-1 text-white">
                    {isWalletEncrypted && walletInfo
                      ? `Unlock ${formatStxAddress(walletInfo.address)}`
                      : "Create Account"}
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Import Wallet Modal */}
        {showImportModal && (
          <ConnectModal
            initialConnectMode={importModalMode}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              if (onClose) onClose();
            }}
          />
        )}
        {/* Terms */}
        <div className="w-full rounded-b-2xl text-center text-xs text-foreground tracking-wider p-6 px-8">
          <LocalizedText>By connecting, you agree to our </LocalizedText><Link href="/terms-of-service" className="hover:text-accent-primary hover:underline"><LocalizedText>Terms of Service</LocalizedText></Link> <LocalizedText>and </LocalizedText><Link href="/privacy-policy" className="hover:text-accent-primary hover:underline"><LocalizedText>Privacy Policy</LocalizedText></Link>
        </div>
      </div>
    </div>
  );
}
