'use client';

import { LoaderCircle } from 'lucide-react';

interface AppLoaderProps {
  isLoading: boolean;
}

export default function AppLoader({ isLoading }: AppLoaderProps) {
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
