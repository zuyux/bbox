"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getStoredEncryptedWallet, retrieveEncryptedWallet } from "@/lib/encryptedStorage";
import { useCurrentAddress } from '@/hooks/useCurrentAddress';

const STACKS_ADDRESS_REGEX = /^(SP|SM|SN|ST|SU|TP|TM|TN|TS)[A-Za-z0-9]{30,40}$/i;
const MIN_SEND_AMOUNT = 0.000001; // 0.000001 sBTC (~1 satoshi)
const MAX_MEMO_BYTES = 34;

const FEATURED_TOKEN_CONTRACTS = new Set([
  'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD::cholo',
]);

const FEATURED_TOKEN_SYMBOLS = new Set([
  'cholo',
]);

const formatQuickFillAmount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  const normalized = value >= 1 ? Number(value.toFixed(6)) : Number(value.toPrecision(6));
  return normalized.toString();
};

const formatCompactBalance = (value: number) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return value >= 1
    ? value.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : value.toPrecision(4);
};

const abbreviateAddress = (value: string, chars = 5) => {
  if (!value) {
    return '';
  }
  if (value.length <= chars * 2 + 3) {
    return value;
  }
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
};

// Extend the Window interface to include StacksProvider and Xverse provider helpers
declare global {
  interface Window {
    StacksProvider?: unknown;
    XverseProviders?: {
      StacksProvider?: unknown;
      [key: string]: unknown;
    };
    LeatherProvider?: unknown;
  }
}

import { getSigningNetwork } from "@/lib/encryptedWalletSigning";
import { makeSTXTokenTransfer, broadcastTransaction } from "@stacks/transactions";
import { getApiUrl } from "@/lib/stacks-api";
import { getPersistedNetwork, inferNetworkFromAddress, persistNetwork, type Network } from "@/lib/network";
import { getSBTCContract } from "@/lib/contracts";
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';

import { Copy, X, LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { fetchRecentTransactions } from "@/lib/fetchRecentTransactions";
import Image from "next/image";

export default function WalletPage() {
  const address = useCurrentAddress() || "";
  const [sbtcBalance, setSbtcBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState<Network>(() => getPersistedNetwork());
  const sbtcContractId = useMemo(() => getSBTCContract(currentNetwork), [currentNetwork]);

  type WalletAsset = {
    id: string;
    name: string;
    symbol: string;
    formattedBalance: string;
    rawBalance: string;
    type: 'stx' | 'fungible';
  };

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcAddressLoading, setBtcAddressLoading] = useState(false);
  const [btcAddressError, setBtcAddressError] = useState<string | null>(null);
  const [rskAddress, setRskAddress] = useState<string | null>(null);
  const [liquidAddress, setLiquidAddress] = useState<string | null>(null);

  const formatTokenBalance = useCallback((balance: string, decimals = 0) => {
    if (!balance) return '0';
    try {
      if (decimals > 0) {
        const divisor = Math.pow(10, decimals);
        const value = Number(balance) / divisor;
        if (!Number.isFinite(value)) return balance;
        return value >= 1
          ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
          : value.toPrecision(4);
      }
      return Number(balance).toLocaleString();
    } catch (error) {
      console.warn('Failed to format token balance', { balance, decimals, error });
      return balance;
    }
  }, []);

  // Modal states
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMemo, setSendMemo] = useState("");
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  const trimmedRecipient = sendTo.trim();
  const parsedAmount = Number(sendAmount);
  const recipientError = trimmedRecipient && !STACKS_ADDRESS_REGEX.test(trimmedRecipient)
    ? 'Enter a valid Stacks address (starts with SP, SM, ST, or SN).'
    : undefined;
  const amountError = sendAmount
    ? (!Number.isFinite(parsedAmount) || parsedAmount < MIN_SEND_AMOUNT
      ? `Enter at least ${MIN_SEND_AMOUNT} sBTC (≈1 sat)`
      : undefined)
    : undefined;
  const memoByteLength = useMemo(() => new TextEncoder().encode(sendMemo || '').length, [sendMemo]);
  const memoError = memoByteLength > MAX_MEMO_BYTES ? `Memo must be ${MAX_MEMO_BYTES} bytes or fewer` : undefined;
  const passwordError = !extensionAvailable && sendPassword && sendPassword.length < 8
    ? 'Password must be at least 8 characters'
    : undefined;
  const sendFormValid = Boolean(
    trimmedRecipient &&
    sendAmount &&
    !recipientError &&
    !amountError &&
    !memoError &&
    (extensionAvailable || (!!sendPassword && !passwordError))
  );

  const availableBalanceValue = useMemo(() => {
    if (!sbtcBalance) {
      return 0;
    }
    const sanitized = Number(String(sbtcBalance).replace(/,/g, ''));
    return Number.isFinite(sanitized) ? sanitized : 0;
  }, [sbtcBalance]);

  const remainingBalanceValue = useMemo(() => {
    if (!availableBalanceValue || !parsedAmount) {
      return null;
    }
    const remaining = availableBalanceValue - parsedAmount;
    return Number.isFinite(remaining) ? remaining : null;
  }, [availableBalanceValue, parsedAmount]);

  const quickFillOptions = useMemo(() => {
    if (!availableBalanceValue || availableBalanceValue <= 0) {
      return [];
    }
    const options = [
      { label: '25%', value: formatQuickFillAmount(availableBalanceValue * 0.25) },
      { label: '50%', value: formatQuickFillAmount(availableBalanceValue * 0.5) },
      { label: '75%', value: formatQuickFillAmount(availableBalanceValue * 0.75) },
      { label: 'All', value: formatQuickFillAmount(availableBalanceValue) }
    ];
    return options.filter((option): option is { label: string; value: string } => Boolean(option.value));
  }, [availableBalanceValue]);

  const maxFillValue = useMemo(() => formatQuickFillAmount(availableBalanceValue), [availableBalanceValue]);

  const sendActionLabel = extensionAvailable ? 'Send via Extension' : 'Send Securely';
  const summaryRecipientDisplay = trimmedRecipient ? abbreviateAddress(trimmedRecipient, 6) : 'Add recipient';
  const remainingBalanceDisplay = remainingBalanceValue !== null ? formatCompactBalance(Math.max(remainingBalanceValue, 0)) : null;

  const stxAsset = assets.find((asset) => asset.id === 'stx' || asset.symbol === 'STX');
  const stxBalanceDisplay = stxAsset?.formattedBalance || '--';
  const btcBalanceDisplay = '--';
  const rskBalanceDisplay = '--';
  const liquidBalanceDisplay = '--';
  const visibleAssets = assets.filter((asset) => asset.symbol !== 'STX');
  const visibleAssetCount = visibleAssets.length;

  const resetSendForm = () => {
    setSendTo("");
    setSendAmount("");
    setSendPassword("");
    setSendMemo("");
  };

  const closeSendModal = () => {
    resetSendForm();
    setShowSend(false);
  };

  const closeReceiveModal = () => setShowReceive(false);

  const handlePasteRecipient = useCallback(async () => {
    if (sendLoading) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.error('Clipboard unavailable in this context.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error('Clipboard is empty.');
        return;
      }
      setSendTo(text.trim());
      toast.success('Recipient pasted.');
    } catch (error) {
      console.warn('Clipboard read failed', error);
      toast.error('Clipboard permission denied.');
    }
  }, [sendLoading]);

  const handleQuickFillValue = useCallback((value: string) => {
    if (!value || sendLoading) {
      return;
    }
    setSendAmount(value);
  }, [sendLoading]);

  const sendMethodTitle = extensionAvailable ? 'Sending sBTC with Extension' : 'Sending sBTC with Local Wallet';
  const sendMethodDescription = extensionAvailable
    ? 'Your connected browser wallet will handle signing, fees, and confirmation prompts for this sBTC transfer.'
    : 'Your encrypted wallet password unlocks the private key locally to sign this sBTC transfer.';
  // Detect if Hiro Wallet extension is available and connected (optional, can remove if not needed)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.StacksProvider || window.XverseProviders?.StacksProvider)) {
      setExtensionAvailable(true);
    } else {
      setExtensionAvailable(false);
    }
  }, [showSend]);

  // Stay aligned with the wallet's network (address prefixes reveal it)
  useEffect(() => {
    const inferredNetwork = inferNetworkFromAddress(address);
    if (inferredNetwork && inferredNetwork !== currentNetwork) {
      persistNetwork(inferredNetwork);
      setCurrentNetwork(inferredNetwork);
      return;
    }

    if (!inferredNetwork) {
      const persistedNetwork = getPersistedNetwork();
      if (persistedNetwork !== currentNetwork) {
        setCurrentNetwork(persistedNetwork);
      }
    }
  }, [address, currentNetwork]);

  // Fetch SBTC token balance and asset inventory
  useEffect(() => {
    if (!address) {
      setSbtcBalance(null);
      setAssets([]);
      setLoading(false);
      setAssetsLoading(false);
      return;
    }
    
    setLoading(true);
    setAssetsLoading(true);
    
    const apiBaseUrl = getApiUrl(currentNetwork);
    const apiUrl = `${apiBaseUrl}/extended/v1/address/${address}/balances?unanchored=false`;
    const normalizedSbtcId = sbtcContractId?.toLowerCase();
    
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Balances request failed with ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        type FungibleTokenData = {
          balance: string;
          total_sent?: string;
          total_received?: string;
          token?: {
            address: string;
            contractName: string;
            name?: string;
            symbol?: string;
            decimals?: number;
          };
        };

        const parsedAssets: WalletAsset[] = [];
        let detectedSbtcBalance: string | null = null;

        const stxBalanceRaw = data?.stx?.balance;
        if (typeof stxBalanceRaw === 'string') {
          parsedAssets.push({
            id: 'stx',
            name: 'Stacks',
            symbol: 'STX',
            formattedBalance: formatTokenBalance(stxBalanceRaw, 6),
            rawBalance: stxBalanceRaw,
            type: 'stx',
          });
        }

        const tokens = (data?.fungible_tokens || {}) as Record<string, FungibleTokenData>;

        Object.entries(tokens).forEach(([key, tokenData]) => {
          const decimals = typeof tokenData?.token?.decimals === 'number' ? tokenData.token.decimals : 0;
          const rawBalance = tokenData?.balance ?? '0';
          const symbol = tokenData?.token?.symbol || key.split('::').pop() || 'FT';
          const name = tokenData?.token?.name || symbol;
          const lowerKey = key.toLowerCase();
          const lowerSymbol = symbol.toLowerCase();
          const lowerName = name.toLowerCase();
          const isSbtcToken = Boolean(
            (normalizedSbtcId && lowerKey.startsWith(`${normalizedSbtcId}::`)) ||
            lowerSymbol.includes('sbtc') ||
            lowerName.includes('sbtc')
          );
          if (isSbtcToken) {
            detectedSbtcBalance = formatTokenBalance(rawBalance, decimals);
            return;
          }

          parsedAssets.push({
            id: key,
            name,
            symbol: symbol.toUpperCase(),
            formattedBalance: formatTokenBalance(rawBalance, decimals),
            rawBalance,
            type: 'fungible',
          });
        });

        parsedAssets.sort((a, b) => {
          const aVal = Number(a.rawBalance || '0');
          const bVal = Number(b.rawBalance || '0');
          return bVal - aVal;
        });

        const sbtcTokenBalance = detectedSbtcBalance ?? '0';
        const featuredAssets = parsedAssets.filter((asset) => {
          if (asset.symbol === 'STX') return true;
          const assetId = typeof asset.id === 'string' ? asset.id.toLowerCase() : '';
          const assetSymbol = typeof asset.symbol === 'string' ? asset.symbol.toLowerCase() : '';
          return FEATURED_TOKEN_CONTRACTS.has(assetId) || FEATURED_TOKEN_SYMBOLS.has(assetSymbol);
        });

        setAssets(featuredAssets);
        setSbtcBalance(sbtcTokenBalance);
        setLoading(false);
        setAssetsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch wallet balances:', error);
        setAssets([]);
        setSbtcBalance('--');
        setLoading(false);
        setAssetsLoading(false);
      });
  }, [address, currentNetwork, sbtcContractId, formatTokenBalance]);

  // Send handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sendFormValid) {
      toast.error('Please fix the highlighted fields before sending.');
      return;
    }

    setSendLoading(true);
    const recipient = trimmedRecipient;
    const amountInMicroStx = Math.round(parsedAmount * 1e6);
    const memoPayload = memoError ? '' : sendMemo.trim();

    try {
      if (extensionAvailable) {
        try {
          const win = typeof window !== 'undefined' ? window : undefined;
          let provider: {
            request?: (method: string, params?: unknown) => Promise<unknown>;
          } | null = null;
          if (win && 'LeatherProvider' in win) {
            provider = (win.LeatherProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          } else if (
            win &&
            'XverseProviders' in win &&
            typeof (win as { XverseProviders?: { StacksProvider?: unknown } }).XverseProviders !== 'undefined' &&
            (win as { XverseProviders: { StacksProvider?: unknown } }).XverseProviders.StacksProvider
          ) {
            provider = ((win as { XverseProviders: { StacksProvider?: unknown } }).XverseProviders.StacksProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          } else if (win && 'StacksProvider' in win) {
            provider = (win.StacksProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          }
          if (!provider) {
            toast.error('No compatible wallet extension found.');
            setSendLoading(false);
            return;
          }
          // Leather: use "stx_transferStx"; Xverse: use "stx_transferStx"; fallback: try "stx_requestTransfer"
          try {
            await provider.request?.(
              "stx_transferStx",
              {
                recipient,
                amount: String(amountInMicroStx), // microSTX as string
                memo: memoPayload,
              }
            );
          } catch (err) {
            // Try fallback method for older providers
            if (provider.request && typeof provider.request === 'function') {
              try {
                await provider.request?.(
                  "stx_requestTransfer",
                  {
                    recipient,
                    amount: String(amountInMicroStx),
                    memo: memoPayload,
                  }
                );
              } catch (fallbackErr) {
                throw fallbackErr;
              }
            } else {
              throw err;
            }
          }
          toast.success('sBTC transfer sent via extension!');
          closeSendModal();
        } catch (err: unknown) {
          // Log the error object for debugging
          console.error('Extension transaction error:', err);
          const errorMsg = getWalletErrorMessage(err, 'Extension transaction failed');
          if (!isWalletRequestCancelled(err)) {
            toast.error(errorMsg);
          }
        }
        setSendLoading(false);
        return;
      }
      // 1. Decrypt wallet with password
      const wallet = await retrieveEncryptedWallet(sendPassword);
      if (!wallet || !wallet.privateKey) throw new Error("Invalid password or wallet not found");

      // 2. Prepare transaction
      const network = getSigningNetwork();
      const tx = await makeSTXTokenTransfer({
        recipient,
        amount: amountInMicroStx,
        senderKey: wallet.privateKey,
        network,
        memo: memoPayload || undefined,
      });

      // 3. Broadcast transaction
      const result = await broadcastTransaction({ transaction: tx, network });
      if ('txid' in result) {
        toast.success(`sBTC transfer sent! TXID: ${result.txid}`);
      } else {
        toast.error(result || 'Broadcast failed');
      }
      closeSendModal();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Error sending sBTC');
      } else {
        toast.error('Error sending sBTC');
      }
    } finally {
      setSendLoading(false);
    }
  };

  // Recent transactions state
  // Define a minimal transaction type for recent transactions
  type RecentTransaction = {
    tx_id: string;
    tx_type: string;
    sender_address: string;
    token_transfer?: {
      recipient_address: string;
      amount: string;
    };
    burn_block_time_iso?: string;
    [key: string]: unknown;
  };
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Fetch recent transactions
  useEffect(() => {
    if (!address) {
      setTransactions([]);
      return;
    }
    setTxLoading(true);
    fetchRecentTransactions(address, currentNetwork, 10)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [address, currentNetwork, showSend]);

  useEffect(() => {
    if (!address) {
      setBtcAddress(null);
      setBtcAddressError(null);
      setBtcAddressLoading(false);
      return;
    }

    setBtcAddressLoading(true);
    setBtcAddressError(null);

    const apiBaseUrl = getApiUrl(currentNetwork);
    const accountUrl = `${apiBaseUrl}/v2/accounts/${address}`;

    fetch(accountUrl)
      .then(async (res) => {
        if (!res.ok) {
          let message = `Account lookup failed with ${res.status}`;
          try {
            const payload = await res.json();
            if (payload && typeof payload === 'object') {
              const errorValue = (payload as { error?: unknown }).error;
              if (typeof errorValue === 'string') {
                message = errorValue;
              } else if (typeof errorValue === 'object' && errorValue !== null) {
                const text = getWalletErrorMessage(errorValue, message);
                if (text) message = text;
              }
            }
          } catch {
            // ignore parse failures
          }
          throw new Error(message);
        }
        return res.json();
      })
      .then(data => {
        const btcInfo = data?.btc_address;
        const derivedAddress = typeof btcInfo === 'string'
          ? btcInfo
          : btcInfo?.p2wpkh || btcInfo?.bech32 || btcInfo?.p2tr || null;

        const storedWallet = getStoredEncryptedWallet();
        const localBitcoinAddress = storedWallet?.bitcoinAddress ?? null;
        const localRskAddress = storedWallet?.rootstockAddress ?? null;
        const localLiquidAddress = storedWallet?.liquidAddress ?? null;
        const finalAddress = derivedAddress || localBitcoinAddress;

        setBtcAddress(finalAddress);
        setRskAddress(localRskAddress);
        setLiquidAddress(localLiquidAddress);
        if (!finalAddress) {
          setBtcAddressError('No Bitcoin address reported for this account yet.');
        }
      })
      .catch(error => {
        console.error('Failed to fetch Bitcoin L1 address:', error);
        const storedWallet = getStoredEncryptedWallet();
        const localBitcoinAddress = storedWallet?.bitcoinAddress ?? null;
        const localRskAddress = storedWallet?.rootstockAddress ?? null;
        const localLiquidAddress = storedWallet?.liquidAddress ?? null;
        setRskAddress(localRskAddress);
        setLiquidAddress(localLiquidAddress);
        if (localBitcoinAddress) {
          setBtcAddress(localBitcoinAddress);
          setBtcAddressError(null);
        } else {
          setBtcAddress(null);
          setBtcAddressError(getWalletErrorMessage(error, 'Unable to derive Bitcoin address. Check your wallet connection and network.'));
        }
      })
      .finally(() => setBtcAddressLoading(false));
  }, [address, currentNetwork]);


  // If no wallet address, ask to connect wallet
  if (!address) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 rounded-2xl border shadow flex flex-col items-center justify-center select-none bg-card text-card-foreground border-border">
        <h1 className="text-3xl font-bold mb-6">Wallet</h1>
        <p className="mb-8 text-lg text-muted-foreground text-center">
          Please connect your wallet to manage your funds.
        </p>
        <Link
          href="/"
          className="py-3 px-6 rounded-xl border bg-primary text-primary-foreground hover:bg-secondary hover:text-secondary-foreground border-border transition-all duration-200 focus:outline-none cursor-pointer select-none"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 bg-background my-16">

      <div className="w-full max-w-xl mx-auto p-8 bg-card rounded-2xl border border-border shadow text-card-foreground select-none">
        <div className="my-2 flex items-center justify-start gap-3">
          <Wallet className="w-8 h-8 text-foreground" />
          <h1 className="title text-lg font-bold">Wallet</h1>
        </div>
        <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-3">
          {loading ? (
            <LoaderCircle className="animate-spin text-foreground" size={32} />
          ) : (
            <div className="my-8 text-center">
              <div className="title text-2xl font-bold select-all">{sbtcBalance}</div>
              <div className="text-lg">Satoshis</div>
            </div>
          )}
        </div>
      </div>

      {/* Network and Address Info - Only show if not mainnet */}
      {currentNetwork !== 'mainnet' && (
        <div className="mb-16 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-center text-sm">
            <span className="text-primary text-center uppercase">{currentNetwork}</span>
          </div>
        </div>
      )}
    
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          className="bg-background border border-border text-foreground w-full px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowSend(true)}
        >
          Send
        </button>
        <button
          className="bg-transparent border border-border text-foreground px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowReceive(true)}
        >
          Receive
        </button>
      </div>

      <div className="mt-16 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logos/stacks.svg" alt="Stacks" width={28} height={28} className="rounded-full" />
            <h2 className="text-lg font-semibold">Assets</h2>
          </div>
          {!assetsLoading && (
            <span className="text-xs text-muted-foreground">{visibleAssetCount} assets</span>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card/40">
          <div className="space-y-4 p-4">
            <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/btc.svg" alt="Bitcoin" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold">Bitcoin</div>
                  <div className="text-xs text-muted-foreground">BTC</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{btcBalanceDisplay}</div>
                <div className="text-xs text-muted-foreground">Balance</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/rsk.svg" alt="Rootstock" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold">Rootstock</div>
                  <div className="text-xs text-muted-foreground">RSK</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{rskBalanceDisplay}</div>
                <div className="text-xs text-muted-foreground">Balance</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/stx.png" alt="Stacks" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold">Stacks</div>
                  <div className="text-xs text-muted-foreground">STX</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{stxBalanceDisplay}</div>
                <div className="text-xs text-muted-foreground">Balance</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/liquid.svg" alt="Liquid" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold">Liquid</div>
                  <div className="text-xs text-muted-foreground">Liquid</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{liquidBalanceDisplay}</div>
                <div className="text-xs text-muted-foreground">Balance</div>
              </div>
            </div>
          </div>

          {assetsLoading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : visibleAssetCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No assets detected for this wallet yet.</div>
          ) : (
            <ul>
              {visibleAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/60 last:border-b-0"
                >
                  <div>
                    <div className="font-semibold tracking-wide">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{asset.formattedBalance}</div>
                    <div className="text-[11px] uppercase text-muted-foreground">
                      {asset.type === 'stx' ? 'Stacks' : 'Token'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Send Modal */}
      {showSend && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => {
            if (!sendLoading) closeSendModal();
          }}
        >
          <div
            className="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Send Sats</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {currentNetwork !== 'mainnet' && (
                    <span className="ml-1 font-mono uppercase">{currentNetwork}</span>
                    )}
                </p>
              </div>
              <button
                onClick={closeSendModal}
                className="bg-none border-none text-muted-foreground hover:text-foreground text-xl cursor-pointer disabled:opacity-40"
                aria-label="Close"
                type="button"
                disabled={sendLoading}
              >
                <X className="h-[20px]" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{sendMethodTitle}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{sendMethodDescription}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Available balance:
                <span className="ml-1 font-semibold">{sbtcBalance ?? '--'}</span>
              </p>
            </div>

            <form onSubmit={handleSend} className="space-y-5 mt-6">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-recipient">
                  Recipient Address
                </label>
                <div className="flex gap-2">
                  <input
                    id="send-recipient"
                    className={`flex-1 px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 ${recipientError ? 'border-destructive/70' : 'border-border'}`}
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    required
                    placeholder="SP3FBR2K..."
                    disabled={sendLoading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handlePasteRecipient}
                    disabled={sendLoading}
                    aria-label="Paste address from clipboard"
                  >
                    Paste
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Double-check the destination—sBTC transfers on Stacks are final.</p>
                {recipientError && (
                  <p className="text-xs text-destructive mt-2">{recipientError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-amount">
                  Amount 
                </label>
                <div className="flex gap-2">
                  <input
                    id="send-amount"
                    className={`flex-1 px-4 py-3 rounded-xl border bg-background text-foreground text-right text-2xl focus:outline-none focus:ring-2 focus:ring-primary/60 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${amountError ? 'border-destructive/70' : 'border-border'}`}
                    type="number"
                    min={MIN_SEND_AMOUNT}
                    step="any"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    required
                    placeholder="0.0"
                    disabled={sendLoading}
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => handleQuickFillValue(maxFillValue)}
                    disabled={sendLoading || !maxFillValue}
                  >
                    Max
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
                  <span>Minimum {MIN_SEND_AMOUNT} sBTC (≈1 sat)</span>
                  <span>Available {formatCompactBalance(availableBalanceValue)} sBTC</span>
                </div>
                {quickFillOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {quickFillOptions.map(option => (
                      <button
                        key={option.label}
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => handleQuickFillValue(option.value)}
                        disabled={sendLoading}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {amountError && (
                  <p className="text-xs text-destructive mt-2">{amountError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-memo">
                  Memo (optional)
                </label>
                <textarea
                  id="send-memo"
                  className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none ${memoError ? 'border-destructive/70' : 'border-border'}`}
                  rows={2}
                  maxLength={120}
                  value={sendMemo}
                  onChange={e => setSendMemo(e.target.value)}
                  placeholder="Add a note for your records"
                  disabled={sendLoading}
                />
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className={memoError ? 'text-destructive' : 'text-muted-foreground'}>
                      {memoByteLength}/{MAX_MEMO_BYTES} bytes
                    </span>
                    {!memoError && (
                      <span className="text-muted-foreground">Memo limit enforced by the sBTC contract</span>
                    )}
                </div>
                {memoError && <p className="text-xs text-destructive mt-2">{memoError}</p>}
              </div>

              {(sendAmount || trimmedRecipient) && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-mono uppercase">{currentNetwork}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className={`font-mono text-xs ${trimmedRecipient ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {summaryRecipientDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-lg">{sendAmount || '0.0'} sBTC</span>
                  </div>
                  {remainingBalanceDisplay && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>Remaining balance</span>
                      <span>{remainingBalanceDisplay} sBTC</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <span>Method</span>
                    <span>{extensionAvailable ? 'Browser extension' : 'Encrypted wallet'}</span>
                  </div>
                </div>
              )}

              {!extensionAvailable && (
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="send-password">
                    Wallet Password
                  </label>
                  <input
                    id="send-password"
                    className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 ${passwordError ? 'border-destructive/70' : 'border-border'}`}
                    type="password"
                    value={sendPassword}
                    onChange={e => setSendPassword(e.target.value)}
                    required
                    placeholder="Enter the password you created"
                    disabled={sendLoading}
                    autoComplete="current-password"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Required to decrypt and sign with your local wallet.</p>
                  {passwordError && <p className="text-xs text-destructive mt-2">{passwordError}</p>}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl border border-transparent bg-primary text-primary-foreground transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={sendLoading || !sendFormValid}
                >
                  {sendLoading ? (extensionAvailable ? 'Sending via extension...' : 'Sending...') : sendActionLabel}
                </button>
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl border border-border bg-transparent text-foreground hover:bg-muted/60 transition-all cursor-pointer"
                  onClick={closeSendModal}
                  disabled={sendLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={closeReceiveModal}
        >
          <div
            className="bg-background text-foreground p-8 rounded-2xl border border-[#333] shadow-xl w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end">
              <button
                onClick={closeReceiveModal}
                className="bg-none border-none text-[#555] text-xl cursor-pointer"
                aria-label="Close"
                type="button"
              >
                <X className="h-[18px]" />
              </button>
            </div>
            <h2 className="text-xl font-bold mb-6">Receive</h2>
            <div className="mb-6">
              {address ? (
                <div className="w-full p-6 flex items-center justify-center rounded-xl bg-background">
                  <QRCodeSVG
                    value={address}
                    width="100%"
                    height="100%"
                    size={256}
                    bgColor="#fff"
                    fgColor="#181818"
                    includeMargin={false}
                    level="M"
                    style={{ width: "100%", height: "auto", maxWidth: 256, maxHeight: 256 }}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto bg-gray-800 flex items-center justify-center rounded-xl text-gray-400">
                  QR
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="font-light px-8 py-2 rounded-xl text-sm break-all select-text">{address}</span>
                <button
                  className="text-center text-foreground text-sm p-1 rounded transition"
                  onClick={() => {
                    if (address) {
                      navigator.clipboard.writeText(address);
                      toast.success("Stacks address copied!");
                    }
                  }}
                  aria-label="Copy address"
                  type="button"
                >
                  <Copy size={18} className="text-accent-foreground cursor-pointer" />
                </button>
              </div>

              <div className="grid gap-3 text-left">
                <div className="p-4 rounded-2xl bg-slate-100 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Bitcoin</div>
                  {btcAddressLoading ? (
                    <div className="text-sm">Loading address…</div>
                  ) : btcAddress ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm break-all">{btcAddress}</span>
                      <button
                        className="text-foreground text-sm p-1 rounded transition"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(btcAddress);
                          toast.success("Bitcoin address copied!");
                        }}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-destructive">{btcAddressError || 'No Bitcoin address available.'}</div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Rootstock</div>
                  {rskAddress ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm break-all">{rskAddress}</span>
                      <button
                        className="text-foreground text-sm p-1 rounded transition"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(rskAddress);
                          toast.success("Rootstock address copied!");
                        }}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Rootstock address not configured.</div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Liquid</div>
                  {liquidAddress ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm break-all">{liquidAddress}</span>
                      <button
                        className="text-foreground text-sm p-1 rounded transition"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(liquidAddress);
                          toast.success("Liquid address copied!");
                        }}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Liquid address not configured.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="bg-card rounded-xl py-4 max-h-96 overflow-y-auto border border-border">
          {txLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoaderCircle className="animate-spin text-foreground" size={32} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No recent transactions found.</div>
          ) : (
            <ul className="space-4 mx-4">
              {transactions.map((tx) => (
                <li key={tx.tx_id} className="border-b border-border last:border-b-0 pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        <a href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=${currentNetwork}`}
                          target="_blank" rel="noopener noreferrer"
                          className="hover:underline text-primary">
                          {tx.tx_id.slice(0, 10)}...{tx.tx_id.slice(-8)}
                        </a>
                      </div>
                      <div className="text-sm mt-1">
                        {tx.tx_type === 'token_transfer' ? (
                          <>
                            <span className="font-semibold">{tx.sender_address === address ? 'Sent' : 'Received'}</span>
                            {tx.sender_address === address ? (
                              <> to <span className="font-mono">{tx.token_transfer?.recipient_address?.slice(0, 8)}...{tx.token_transfer?.recipient_address?.slice(-6)}</span></>
                            ) : (
                              <> from <span className="font-mono">{tx.sender_address.slice(0, 8)}...{tx.sender_address.slice(-6)}</span></>
                            )}
                            <span className="ml-2">{tx.token_transfer?.amount ? Number(tx.token_transfer.amount) / 1e6 : ''} STX</span>
                          </>
                        ) : (
                          <span className="text-gray-500">{tx.tx_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right whitespace-nowrap">
                      {tx.burn_block_time_iso ? new Date(tx.burn_block_time_iso).toLocaleString() : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}