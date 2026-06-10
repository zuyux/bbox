'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-2xl rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-3xl font-semibold text-foreground mb-3">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We were unable to load this page. If the problem persists, try refreshing or returning to the homepage.
        </p>
        <p className="text-xs text-muted-foreground mb-6">{error?.message || 'Unexpected error occurred.'}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
