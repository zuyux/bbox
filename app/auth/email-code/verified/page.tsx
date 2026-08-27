'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'bbox_email_code_verification';

export default function EmailCodeVerifiedPage() {
  const searchParams = useSearchParams();
  const status = searchParams?.get('status');
  const message = searchParams?.get('message');
  const isSuccess = status === 'success';

  const title = useMemo(() => {
    if (isSuccess) return 'Email verified';
    return 'Verification failed';
  }, [isSuccess]);

  useEffect(() => {
    if (!isSuccess || typeof window === 'undefined') return;

    const email = searchParams?.get('email');
    const purpose = searchParams?.get('purpose');
    const verifiedEmailToken = searchParams?.get('verifiedEmailToken');
    if (!email || !purpose || !verifiedEmailToken) return;

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email,
        purpose,
        verifiedEmailToken,
        storedAt: Date.now(),
      })
    );
  }, [isSuccess, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle className="w-12 h-12 text-green-400" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-red-400" />
          )}
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground">
          {isSuccess
            ? 'Return to the wallet form on this device to finish creating your account.'
            : message || 'This verification link could not be used.'}
        </p>
        <Button asChild className="cursor-pointer bg-orange-600 text-white hover:bg-orange-700">
          <Link href="/wallet">Continue to wallet</Link>
        </Button>
      </div>
    </div>
  );
}
