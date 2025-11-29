'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type WalletType = 'leather' | 'xverse' | 'imported';

interface WalletContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
  walletType: WalletType | null;
  setWalletType: (type: WalletType | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);

  // Persist wallet address for Xverse and Leather
  useEffect(() => {
    // On mount, restore address if present (only run once on mount)
    const saved = localStorage.getItem('walletAddress');
    const savedType = localStorage.getItem('walletType') as WalletType | null;

    if (saved) {
      setAddress(saved);
    }
    if (savedType) {
      setWalletType(savedType);
    }

    console.log('[WalletProvider] Restored session from storage', {
      savedAddress: saved,
      savedType,
    });
  }, []); // Intentionally empty - only run on mount to restore saved address

  useEffect(() => {
    if (address) {
      localStorage.setItem('walletAddress', address);
    } else {
      localStorage.removeItem('walletAddress');
    }
    console.log('[WalletProvider] Address state updated', {
      address,
      persistedAddress: localStorage.getItem('walletAddress'),
    });
  }, [address]);

  useEffect(() => {
    if (walletType) {
      localStorage.setItem('walletType', walletType);
    } else {
      localStorage.removeItem('walletType');
    }
    console.log('[WalletProvider] Wallet type updated', {
      walletType,
      persistedType: localStorage.getItem('walletType'),
    });
  }, [walletType]);

  return (
    <WalletContext.Provider value={{ address, setAddress, walletType, setWalletType }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
