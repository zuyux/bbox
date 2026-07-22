'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EncryptedWalletProvider } from '../EncryptedWalletProvider';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <EncryptedWalletProvider>
        {children}
      </EncryptedWalletProvider>
    </QueryClientProvider>
  );
}
