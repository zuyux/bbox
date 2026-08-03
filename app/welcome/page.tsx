'use client';



import { LocalizedText } from '@/components/LocalizedText';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Eye, EyeOff, CheckCircle, ArrowRight, Shield, Wallet, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import Image from 'next/image';

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams?.get('email');
  const normalizedEmail = email?.trim();
  const showEmail = Boolean(normalizedEmail);
  const { currentWallet, isAuthenticated } = useEncryptedWallet();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);
  const [step, setStep] = useState<'welcome' | 'backup' | 'security'>('welcome');

  const copyToClipboard = async (value: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
    return false;
  };

  // Redirect if not authenticated or no wallet
  useEffect(() => {
    if (!isAuthenticated || !currentWallet) {
      router.push('/');
    }
  }, [isAuthenticated, currentWallet, router]);

  const copyMnemonic = async () => {
    if (currentWallet?.mnemonic) {
      try {
        const copied = await copyToClipboard(currentWallet.mnemonic);
        if (!copied) {
          throw new Error('Clipboard unavailable');
        }
        setCopiedMnemonic(true);
        toast.success("Mnemonic phrase copied to clipboard");
        setTimeout(() => setCopiedMnemonic(false), 3000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('backup');
    } else if (step === 'backup') {
      setStep('security');
    } else {
      router.push('/apps');
    }
  };

  if (!currentWallet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl my-24">
        {step === "welcome" && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image src="/star.svg" height={100} width={100} alt="" className="w-10 h-10 text-green-400" />
              </div>
              <CardTitle className="text-3xl text-foreground mb-2"><LocalizedText>Well done!</LocalizedText></CardTitle>
              <p className="text-muted-foreground">
                <LocalizedText>Your wallet has been created and secured successfully
              </LocalizedText></p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Account Info */}
              <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  <LocalizedText>Your Account Details
                </LocalizedText></h3>
                <div className="space-y-3 text-center">
                  {showEmail && (
                    <div>
                      <label className="text-sm text-muted-foreground"><LocalizedText>Email</LocalizedText></label>
                      <p className="text-foreground text-lg font-bold select-auto">{normalizedEmail}</p>
                    </div>
                  )}
                  {currentWallet.bitcoinAddress && (
                    <div>
                      <label className="text-sm text-muted-foreground"><LocalizedText>Bitcoin Address</LocalizedText></label>
                      <div className="flex items-center gap-1">
                        <p className="select-text text-foreground font-mono font-bold text-lg break-all flex-1">{currentWallet.bitcoinAddress}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await copyToClipboard(currentWallet.bitcoinAddress || '');
                            toast.success("Bitcoin address copied");
                          }}
                          className="shrink-0 border-border text-muted-foreground hover:bg-muted hover:text-white cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-foreground hover:bg-foreground/80 text-primary-foreground font-semibold py-6 cursor-pointer"
              >
                <LocalizedText>Continue to Backup
                </LocalizedText><ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {step === "backup" && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto my-16">
                <Key className="w-10 h-10 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-foreground mb-2"><LocalizedText>Back Up Your Recovery Phrase</LocalizedText></CardTitle>
              <p className="text-muted-foreground">
                <LocalizedText>This 12-word phrase is the only way to restore your encrypted wallet if browser storage is lost. Write it down offline and keep it private.
              </LocalizedText></p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Mnemonic Display */}
              <div className="bg-surface-secondary border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground"><LocalizedText>Recovery Phrase</LocalizedText></h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="text-muted-foreground border-border hover:bg-muted cursor-pointer"
                    >
                      {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyMnemonic}
                      className="text-muted-foreground border-border hover:bg-muted cursor-pointer"
                      disabled={!showMnemonic}
                    >
                      {copiedMnemonic ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {currentWallet.mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-surface-secondary border border-border rounded p-3 text-center"
                    >
                      <span className="text-xs text-muted-foreground block mb-1">{index + 1}</span>
                      <span className="text-foreground font-mono">
                        {showMnemonic ? word : '••••••'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Warning */}
              <div className="border border-red-700/50 rounded-lg p-4">
                <h4 className="text-red-500 font-medium text-sm mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  <LocalizedText>Critical Security Information
                </LocalizedText></h4>
                <ul className="text-red-500/80 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    <LocalizedText>Never share your recovery phrase with anyone
                  </LocalizedText></li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    <LocalizedText>Store it in a safe, offline location like paper or a hardware safe
                  </LocalizedText></li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    <LocalizedText>Anyone with this phrase can access your wallet
                  </LocalizedText></li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    <LocalizedText>We cannot recover your wallet if you lose this phrase
                  </LocalizedText></li>
                </ul>
              </div>

              {/* Acknowledgment */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="backup-acknowledge"
                  checked={acknowledgedBackup}
                  onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                  className="mt-1 h-4 w-4 text-gray-600 bg-gray-700 border-gray-600 rounded focus:ring-gray-500 cursor-pointer"
                />
                <label htmlFor="backup-acknowledge" className="text-sm text-muted-foreground cursor-pointer">
                  <LocalizedText>I understand that I am responsible for backing up my recovery phrase and that losing it means permanently losing access to my wallet.
                </LocalizedText></label>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!acknowledgedBackup}
                className="w-full bg-foreground hover:bg-foreground/80 text-primary-foreground font-semibold py-6 disabled:opacity-50 cursor-pointer"
              >
                <LocalizedText>I&apos;ve Backed Up My Phrase
                </LocalizedText><ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {step === "security" && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto my-4">
                <Image src="/shield-sec.svg" height={50} width={50} alt="" className='text-orange-500'/>
              </div>
              <CardTitle className="text-2xl text-foreground mb-2"><LocalizedText>Security Best Practices</LocalizedText></CardTitle>
              <p className="text-muted-foreground">
                <LocalizedText>Follow these guidelines to keep your wallet secure
              </LocalizedText></p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6 text-center">
              {/* Security Tips */}
              <div className="space-y-4">
                <div className=" border border-green-700/30 rounded-lg p-4">
                  <Image src="/check-square.svg" height={30} width={30} alt="" className='mb-4 text-center mx-auto'/>
                  <h4 className="text-green-500  font-medium mb-3"><LocalizedText>Do This</LocalizedText></h4>
                  <ul className="text-green-500/80 text-sm space-y-2">
                    <li><LocalizedText>• Use a strong, unique password for your wallet</LocalizedText></li>
                    <li><LocalizedText>• Enable two-factor authentication whenever possible</LocalizedText></li>
                    <li><LocalizedText>• Keep your software up to date</LocalizedText></li>
                    <li><LocalizedText>• Use hardware wallets for large amounts</LocalizedText></li>
                    <li><LocalizedText>• Double-check every transaction detail before confirming</LocalizedText></li>
                  </ul>
                </div>

                <div className=" border border-red-700/30 rounded-lg p-4">
                  <Image src="/close-square.svg" height={30} width={30} alt="" className='mb-4 text-center mx-auto'/>
                  <h4 className="text-red-500 font-medium mb-3"><LocalizedText>Avoid This</LocalizedText></h4>
                  <ul className="text-red-500/80 text-sm space-y-2">
                    <li><LocalizedText>• Never enter your seed phrase on suspicious websites</LocalizedText></li>
                    <li><LocalizedText>• Don&apos;t store your keys in screenshots or the cloud</LocalizedText></li>
                    <li><LocalizedText>• Avoid using public WiFi for wallet transactions</LocalizedText></li>
                    <li><LocalizedText>• Never share your private keys or seed phrase</LocalizedText></li>
                    <li><LocalizedText>• Don&apos;t click suspicious links in emails or messages</LocalizedText></li>
                  </ul>
                </div>
              </div>

              {/* Getting Started */}
              <div className="border border-orange-700/50 rounded-lg p-4">
                <h4 className="text-orange-500 font-medium mb-3"><LocalizedText>Ready to Get Started?</LocalizedText></h4>
                <p className="text-orange-500/80 text-sm mb-3">
                  <LocalizedText>Your wallet is configured and ready to use. You can start receiving Satoshis and interact with the Bitcoin Layers.
                </LocalizedText></p>
                <p className="text-orange-500/80 text-sm">
                  <LocalizedText>Visit your profile to view wallet details and transaction history.
                </LocalizedText></p>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-500 text-foreground font-semibold py-6 cursor-pointer"
              >
                <LocalizedText>Finish Setup
                </LocalizedText><CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
