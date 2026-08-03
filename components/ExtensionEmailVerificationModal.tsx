'use client';



import { LocalizedText } from '@/components/LocalizedText';
import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { upsertProfile, type Profile } from '@/lib/profileApi';
import { useWallet } from '@/components/WalletProvider';

interface ExtensionEmailVerificationModalProps {
  address: string;
  onClose: () => void;
  onVerified: (profile: Profile) => void;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ExtensionEmailVerificationModal({
  address,
  onClose,
  onVerified,
}: ExtensionEmailVerificationModalProps) {
  const { walletType } = useWallet();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailValid = emailRegex.test(normalizeEmail(email));
  const codeValid = /^\d{6}$/.test(code.trim());

  const resetForEmailChange = (value: string) => {
    setEmail(value);
    setCode('');
    setCodeSent(false);
    setMessage('');
    setError('');
  };

  const requestCode = async () => {
    const trimmedEmail = normalizeEmail(email);
    setMessage('');
    setError('');

    if (!emailRegex.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/email-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          purpose: 'profile_email',
          address,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      setMessage("Verification code sent. Check your email.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSaveCode = async () => {
    const trimmedEmail = normalizeEmail(email);
    const trimmedCode = code.trim();
    setMessage('');
    setError('');

    if (!codeValid) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/email-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          code: trimmedCode,
          purpose: 'profile_email',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.verifiedEmailToken) {
        throw new Error(result.error || 'Failed to verify code');
      }

      const profile = await upsertProfile({
        address,
        email: trimmedEmail,
        verifiedEmailToken: result.verifiedEmailToken,
      }, walletType);
      onVerified(profile);
      onClose();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (codeSent) {
      verifyAndSaveCode();
      return;
    }

    requestCode();
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[360px] rounded-xl border border-border bg-background p-4 text-foreground shadow-2xl">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_1.25rem] items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6320EE]">
            <Image src="/email-snow.svg" alt="" width={20} height={20} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold leading-6"><LocalizedText>Verify your email</LocalizedText></h2>
            <p className="text-xs leading-5 text-muted-foreground mb-4"><LocalizedText>Secure this wallet profile.</LocalizedText></p>
          </div>
          <button
            type="button"
            aria-label={"Close"}
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => resetForEmailChange(event.target.value)}
            placeholder={"Enter your email address"}
            disabled={loading || codeSent}
            className="h-12 w-full"
            autoComplete="off"
            name="bbox-profile-email"
            autoFocus
          />

          {codeSent && (
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              disabled={loading}
              className="h-12 w-full"
            />
          )}

          {(message || error) && (
            <p className={`text-xs ${error ? 'text-red-500' : 'text-green-500'}`}>
              {error || message}
            </p>
          )}

          <div className="pt-0.5">
            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={loading || !emailValid || (codeSent && !codeValid)}
              className="h-10 w-full bg-[#6320EE] text-white hover:bg-[#6320EE]"
            >
              {loading ? (codeSent ? "Verifying..." : "Sending...") : codeSent ? "Verify Email" : "Send Code"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
