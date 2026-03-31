import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from 'next/link';
import { useWallet } from './WalletProvider';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp, X, Shield } from 'lucide-react';
import { createStacksAccount } from '@/lib/stacksWallet';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/PasswordInput';
import ConnectModal from './ConnectModal';
import { formatStxAddress } from '@/lib/address-utils';
import { getStoredEncryptedWallet } from '@/lib/encryptedStorage';

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

  const [walletError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEncryptedWalletFlow, setShowEncryptedWalletFlow] = useState(false);
  const [encryptedWalletMode, setEncryptedWalletMode] = useState<'unlock' | 'create'>('unlock');
  const [createWalletError, setCreateWalletError] = useState<string | null>(null);
  const persistWalletContext = (newAddress: string) => {
    setAddress(newAddress);
    setWalletType('imported');
    console.log('[GetInModal] Persisted wallet session via WalletProvider', { newAddress });
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


  const handleEncryptedWalletSubmit = async (password: string, email?: string) => {
    try {
      if (encryptedWalletMode === 'create') {
        setCreateWalletError(null);
        const trimmedEmail = email?.trim();

        if (!trimmedEmail) {
          setCreateWalletError('Email is required to create a wallet.');
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
            setCreateWalletError('Email is already registered. Try a different email or recover the existing wallet.');
            return;
          }
        } catch (checkError) {
          console.warn('Email availability check failed:', checkError);
        }

        // Generate new wallet data for encryption
        const { mnemonic, stxPrivateKey, address } = await createStacksAccount('mainnet');
        const walletData = {
          mnemonic,
          privateKey: stxPrivateKey,
          address,
          label: 'sumak'
        };
        await createEncryptedWallet(walletData, password);
        persistWalletContext(walletData.address);

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
                passkey: stxPrivateKey, 
                passphrase: password,
                address,
                encryptedWallet: {
                  encryptedMnemonic: encryptedSnapshot.encryptedMnemonic,
                  encryptedPrivateKey: encryptedSnapshot.encryptedPrivateKey,
                  salt: encryptedSnapshot.salt,
                  iv: encryptedSnapshot.iv,
                  version: encryptedSnapshot.version,
                  label: encryptedSnapshot.label,
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
              body: JSON.stringify({ email: trimmedEmail, address }),
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

        const destinationAddress = walletInfo?.address || unlockedAddress;
        if (destinationAddress) {
          // For existing wallets, redirect to the address page
          router.push(`/${destinationAddress}`);
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
        className="bg-background text-foreground rounded-[21px] w-[360px] pt-8 pb-0 px-0 shadow-2xl flex flex-col items-center
          transition-all duration-300 ease-out
          opacity-0 translate-y-[-24px] animate-getinmodal border border-[#333]"
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
                <button className="justify-start bg-none border-none text-muted-foreground text-sm cursor-pointer" aria-label="Help" type="button">
                  <CircleHelp className="h-[18px]"/>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-background text-foreground max-w-xs text-sm z-100">
                                  <div>
                    Connect or create your account using your wallet or seed phrase.<br />
                    <span className="text-foreground underline">
                      <a href="/support" target="_blank" rel="noopener noreferrer">Need help? Visit Support</a>
                    </span>
                  </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="title text-center font-semibold text-lg text-foreground tracking-wider flex items-center justify-center select-none">
            
          </div>
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="bg-none border-none text-muted-foreground text-xl cursor-pointer" aria-label="Close" type="button">
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
                  {encryptedWalletMode === 'create' ? 'Secure Your Wallet' : 
                   isSessionLocked ? 'Unlock Your Wallet' : 'Access Your Wallet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {encryptedWalletMode === 'create' 
                    ? 'Create a password to encrypt your wallet locally'
                    : 'Enter your password to unlock your encrypted wallet'
                  }
                </p>
              </div>
              
              <PasswordInput
                mode={encryptedWalletMode}
                onSubmit={handleEncryptedWalletSubmit}
                isLoading={encryptedLoading}
                error={encryptedWalletMode === 'create' ? createWalletError : encryptedAuthError}
                showStrengthIndicator={encryptedWalletMode === 'create'}
                confirmRequired={encryptedWalletMode === 'create'}
                onCancel={() => setShowEncryptedWalletFlow(false)}
              />

              {encryptedWalletMode === 'unlock' && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
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
                    Clear All Sessions
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Main Auth Options */
            <>
              {/* Connect Wallet */}
              <div>
                <Button
                  onClick={() => setShowImportModal(true)}
                  className="w-full h-12 rounded-[9px] bg-accent-foreground text-foreground hover:text-foreground hover:bg-accent-foreground font-semibold text-base border border-foreground cursor-pointer flex items-center px-4"
                  type="button"
                >
                  <Image src="/wallet-ico.svg" alt="Wallet" width={18} height={18} className="dark:invert mr-2"/>
                  <span className="text-center flex-1">Connect Wallet</span>
                </Button>
                {walletError && (
                  <div className="text-red-500 text-xs mt-2 text-center">{walletError}</div>
                )}
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
                      : 'Create Account'}
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Import Wallet Modal */}
        {showImportModal && (
          <ConnectModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              if (onClose) onClose();
            }}
          />
        )}
        {/* Terms */}
        <div className="w-full rounded-b-2xl text-center text-xs text-foreground tracking-wider p-6 px-8">
          By Connecting, you agree to our <Link href="/terms" className="hover:text-accent-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="hover:text-accent-primary hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

