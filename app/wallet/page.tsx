"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getStoredEncryptedWallet, retrieveEncryptedWallet, updateEncryptedWalletAddresses } from "@/lib/encryptedStorage";
import { getBitcoinAddressFromPrivateKey, getLiquidAddressFromPrivateKey, getRootstockAddressFromPrivateKey } from "@/lib/bitcoinWallet";
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { PasswordSigningModal } from "@/components/PasswordSigningModal";
import { request as satsRequest } from 'sats-connect';
import { useWallet } from "@/components/WalletProvider";
import { sendBitcoinWithKey } from "@/lib/bitcoinTransfer";

const STACKS_ADDRESS_REGEX = /^(SP|SM|SN|ST|SU|TP|TM|TN|TS)[A-Za-z0-9]{30,40}$/i;
const BITCOIN_MAINNET_ADDRESS_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i;
const BITCOIN_TESTNET_ADDRESS_REGEX = /^(tb1|[mn2])[a-zA-HJ-NP-Z0-9]{25,90}$/i;
const MAX_MEMO_BYTES = 34;
const SATS_PER_BTC = 100_000_000;

type ReceiveLayer = 'bitcoin' | 'rootstock' | 'liquid';
type ReceiveAsset = ReceiveLayer | 'stacks';
type SendAsset = 'bitcoin' | 'sbtc' | 'rootstock' | 'liquid';

const RECEIVE_LAYER_LABELS: Record<ReceiveLayer, string> = {
  bitcoin: 'Bitcoin',
  rootstock: 'Rootstock',
  liquid: 'Liquid',
};

const RECEIVE_ASSET_LABELS: Record<ReceiveAsset, string> = {
  bitcoin: 'Bitcoin L1',
  stacks: 'Stacks',
  rootstock: 'Rootstock',
  liquid: 'Liquid',
};

const SEND_ASSETS: Array<{
  id: SendAsset;
  label: string;
  networkLabel: string;
  unit: string;
  placeholder: string;
  recipientHint: string;
  supported: boolean;
  requiresExtension?: boolean;
}> = [
  {
    id: 'bitcoin',
    label: 'BTC',
    networkLabel: 'Bitcoin',
    unit: 'BTC',
    placeholder: 'bc1...',
    recipientHint: 'Use a Bitcoin L1 address.',
    supported: true,
    requiresExtension: true,
  },
  {
    id: 'sbtc',
    label: 'Stacks BTC',
    networkLabel: 'Stacks',
    unit: 'sBTC',
    placeholder: 'SP3FBR2K...',
    recipientHint: 'Use a Stacks address for sBTC on Stacks.',
    supported: true,
  },
  {
    id: 'rootstock',
    label: 'Rootstock BTC',
    networkLabel: 'Rootstock',
    unit: 'RBTC',
    placeholder: '0x...',
    recipientHint: 'Use a Rootstock EVM address.',
    supported: false,
  },
  {
    id: 'liquid',
    label: 'Liquid BTC',
    networkLabel: 'Liquid',
    unit: 'L-BTC',
    placeholder: 'ex1...',
    recipientHint: 'Use a Liquid address.',
    supported: false,
  },
];

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

const isValidBitcoinAddress = (value: string, network: 'mainnet' | 'testnet' | 'devnet') => {
  const normalized = value.trim();
  if (!normalized) return false;
  return network === 'mainnet'
    ? BITCOIN_MAINNET_ADDRESS_REGEX.test(normalized)
    : BITCOIN_TESTNET_ADDRESS_REGEX.test(normalized);
};

const btcToSats = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const wholeSats = BigInt(whole) * BigInt(SATS_PER_BTC);
  const fractionalSats = BigInt(fraction.padEnd(8, '0'));
  const total = wholeSats + fractionalSats;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(total);
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

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API copy failed, trying fallback:', error);
  }

  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (error) {
    console.warn('Fallback copy failed:', error);
    return false;
  }
}

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

import { getApiUrl } from "@/lib/stacks-api";
import { getPersistedNetwork, inferNetworkFromAddress, persistNetwork, type Network } from "@/lib/network";
import { getSBTCContract } from "@/lib/contracts";
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { sendSbtcDonation, sendSbtcDonationWithKey } from "@/lib/bbox-contract";

import { Copy, X, LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { fetchRecentTransactions } from "@/lib/fetchRecentTransactions";
import Image from "next/image";

export default function WalletPage() {
  const address = useCurrentAddress() || "";
  const { walletType } = useWallet();
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
  const [showGenerateAddressesModal, setShowGenerateAddressesModal] = useState(false);
  const [generatingAddresses, setGeneratingAddresses] = useState(false);
  const [generateAddressLayer, setGenerateAddressLayer] = useState<ReceiveLayer | null>(null);

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
  const [receiveAsset, setReceiveAsset] = useState<ReceiveAsset>('bitcoin');
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMemo, setSendMemo] = useState("");
  const [sendAsset, setSendAsset] = useState<SendAsset>('bitcoin');
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  const selectedSendAsset = SEND_ASSETS.find((asset) => asset.id === sendAsset) ?? SEND_ASSETS[0];
  const trimmedRecipient = sendTo.trim();
  const parsedAmount = Number(sendAmount);
  const recipientError = (() => {
    if (!trimmedRecipient) return undefined;
    if (sendAsset === 'sbtc' && !STACKS_ADDRESS_REGEX.test(trimmedRecipient)) {
      return 'Enter a valid Stacks address for sBTC.';
    }
    if (sendAsset === 'bitcoin' && !isValidBitcoinAddress(trimmedRecipient, currentNetwork)) {
      return currentNetwork === 'mainnet'
        ? 'Enter a valid Bitcoin mainnet address.'
        : 'Enter a valid Bitcoin testnet address.';
    }
    return undefined;
  })();
  const amountError = sendAmount
    ? (!Number.isFinite(parsedAmount) || parsedAmount <= 0
      ? `Enter a valid ${selectedSendAsset.unit} amount`
      : sendAsset === 'sbtc' && (!Number.isInteger(parsedAmount) || parsedAmount < 1)
        ? 'Enter at least 1 satoshi'
        : sendAsset === 'bitcoin' && btcToSats(sendAmount) === null
          ? 'Enter a BTC amount with up to 8 decimal places'
        : undefined)
    : undefined;
  const unsupportedSendAssetMessage = selectedSendAsset.supported
    ? undefined
    : `${selectedSendAsset.label} sends need chain-specific signing and broadcasting support before they can be enabled.`;
  const isLocalWallet = walletType === 'imported';
  const selectedAssetNeedsPassword = (sendAsset === 'sbtc' && !extensionAvailable) || (sendAsset === 'bitcoin' && isLocalWallet);
  const selectedAssetCanUseCurrentSigner = sendAsset === 'bitcoin'
    ? !isLocalWallet || !!sendPassword
    : sendAsset === 'sbtc'
      ? extensionAvailable || !!sendPassword
      : false;
  const supportsMemo = sendAsset === 'sbtc';
  const memoByteLength = useMemo(() => new TextEncoder().encode(sendMemo || '').length, [sendMemo]);
  const memoError = supportsMemo && memoByteLength > MAX_MEMO_BYTES ? `Memo must be ${MAX_MEMO_BYTES} bytes or fewer` : undefined;
  const passwordError = selectedAssetNeedsPassword && sendPassword && sendPassword.length < 8
    ? 'Password must be at least 8 characters'
    : undefined;
  const sendFormValid = Boolean(
    trimmedRecipient &&
    sendAmount &&
    selectedSendAsset.supported &&
    selectedAssetCanUseCurrentSigner &&
    !recipientError &&
    !amountError &&
    !memoError &&
    (!selectedAssetNeedsPassword || (!!sendPassword && !passwordError))
  );

  const availableBalanceValue = useMemo(() => {
    if (sendAsset !== 'sbtc') {
      return 0;
    }
    if (!sbtcBalance) {
      return 0;
    }
    const sanitized = Number(String(sbtcBalance).replace(/,/g, ''));
    return Number.isFinite(sanitized) ? sanitized : 0;
  }, [sbtcBalance, sendAsset]);

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

  const getSendAssetBalanceDisplay = useCallback((asset: SendAsset) => {
    if (asset === 'sbtc') {
      return `${formatCompactBalance(availableBalanceValue)} BTC`;
    }
    const unit = SEND_ASSETS.find((sendAssetOption) => sendAssetOption.id === asset)?.unit ?? '';
    return `0.00${unit ? ` ${unit}` : ''}`;
  }, [availableBalanceValue]);
  const selectedAssetBalanceDisplay = getSendAssetBalanceDisplay(sendAsset);
  const sendActionLabel = selectedSendAsset.supported
    ? (sendAsset === 'bitcoin'
      ? isLocalWallet ? 'Send BTC Securely' : 'Send'
      : extensionAvailable ? 'Send via Extension' : 'Send Securely')
    : 'Select Supported Asset';
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
    setSendAsset('bitcoin');
  };

  const closeSendModal = () => {
    resetSendForm();
    setShowSend(false);
  };

  const closeReceiveModal = () => setShowReceive(false);

  const handleReceiveAssetKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>, asset: ReceiveAsset) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setReceiveAsset(asset);
  }, []);

  const copyReceiveAddress = useCallback(async (value: string, label: string) => {
    const copied = await copyToClipboard(value);
    if (copied) {
      toast.success(`${label} address copied!`);
    } else {
      toast.error(`Failed to copy ${label} address`);
    }
  }, []);

  const openGenerateAddressModal = useCallback((layer: ReceiveLayer) => {
    setGenerateAddressLayer(layer);
    setShowGenerateAddressesModal(true);
  }, []);

  const closeGenerateAddressModal = useCallback(() => {
    if (generatingAddresses) return;
    setShowGenerateAddressesModal(false);
    setGenerateAddressLayer(null);
  }, [generatingAddresses]);

  const handleGenerateAddress = useCallback(async (password: string) => {
    if (!generateAddressLayer) {
      throw new Error('Select an address layer to generate');
    }

    setGeneratingAddresses(true);

    try {
      const wallet = await retrieveEncryptedWallet(password);
      if (!wallet?.privateKey) {
        throw new Error('Unable to unlock wallet private key');
      }

      const bitcoinNetwork = currentNetwork === 'testnet' ? 'testnet' : 'mainnet';
      if (generateAddressLayer === 'bitcoin') {
        const nextBitcoinAddress = wallet.bitcoinAddress || getBitcoinAddressFromPrivateKey(wallet.privateKey, bitcoinNetwork);
        updateEncryptedWalletAddresses({ bitcoinAddress: nextBitcoinAddress });
        setBtcAddress(nextBitcoinAddress);
        setBtcAddressError(null);
      }

      if (generateAddressLayer === 'rootstock') {
        const nextRootstockAddress = wallet.rootstockAddress || getRootstockAddressFromPrivateKey(wallet.privateKey);
        updateEncryptedWalletAddresses({ rootstockAddress: nextRootstockAddress });
        setRskAddress(nextRootstockAddress);
      }

      if (generateAddressLayer === 'liquid') {
        const nextLiquidAddress = wallet.liquidAddress || getLiquidAddressFromPrivateKey(wallet.privateKey, bitcoinNetwork);
        updateEncryptedWalletAddresses({ liquidAddress: nextLiquidAddress });
        setLiquidAddress(nextLiquidAddress);
      }

      setShowGenerateAddressesModal(false);
      setGenerateAddressLayer(null);
      toast.success(`${RECEIVE_LAYER_LABELS[generateAddressLayer]} address generated`);
    } finally {
      setGeneratingAddresses(false);
    }
  }, [currentNetwork, generateAddressLayer]);

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

  const sendMethodTitle = selectedSendAsset.supported
    ? `Sending ${selectedSendAsset.label} ${sendAsset === 'bitcoin' && !isLocalWallet || extensionAvailable && sendAsset !== 'bitcoin' ? 'with Extension' : 'with Local Wallet'}`
    : `${selectedSendAsset.label} selected`;
  const sendMethodDescription = selectedSendAsset.supported
    ? (sendAsset === 'bitcoin' && isLocalWallet
      ? 'Your encrypted wallet password unlocks the local private key to sign and broadcast this BTC transfer.'
      : sendAsset === 'bitcoin'
      ? 'Your Bitcoin browser wallet will build, sign, fee, and broadcast this BTC transfer.'
      : extensionAvailable
      ? 'Your connected browser wallet will handle signing, fees, and confirmation prompts for this transfer.'
      : 'Your encrypted wallet password unlocks the private key locally to sign this transfer.')
    : unsupportedSendAssetMessage;
  const primaryReceiveAddress = btcAddress;
  const selectedReceiveAddress = receiveAsset === 'bitcoin'
    ? primaryReceiveAddress
    : receiveAsset === 'stacks'
      ? address
      : receiveAsset === 'rootstock'
        ? rskAddress
        : liquidAddress;
  const selectedReceiveLabel = RECEIVE_ASSET_LABELS[receiveAsset];
  const getReceiveCopyButtonClass = useCallback((asset: ReceiveAsset) => {
    const baseClass = 'shrink-0 text-sm p-2 rounded-lg transition';
    return receiveAsset === asset
      ? `${baseClass} text-background hover:bg-background hover:text-foreground`
      : `${baseClass} text-foreground hover:bg-background/70`;
  }, [receiveAsset]);
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

    if (sendAsset !== 'sbtc' && sendAsset !== 'bitcoin') {
      toast.error(unsupportedSendAssetMessage || 'This asset is not supported for sending yet.');
      return;
    }

    setSendLoading(true);
    const recipient = trimmedRecipient;
    const amountInSats = sendAsset === 'bitcoin' ? btcToSats(sendAmount) : Number(sendAmount);
    const memoPayload = supportsMemo && !memoError ? sendMemo.trim() : '';

    if (!amountInSats || amountInSats <= 0) {
      toast.error(`Enter a valid ${selectedSendAsset.unit} amount.`);
      setSendLoading(false);
      return;
    }

    try {
      if (sendAsset === 'bitcoin') {
        if (isLocalWallet) {
          const wallet = await retrieveEncryptedWallet(sendPassword);
          if (!wallet?.privateKey) throw new Error('Invalid password or wallet not found');

          const txId = await sendBitcoinWithKey({
            privateKey: wallet.privateKey,
            toAddress: recipient,
            amountSats: amountInSats,
            network: currentNetwork,
          });

          toast.success(`BTC transfer sent! TXID: ${txId}`);
          closeSendModal();
          return;
        }

        const response = await satsRequest('sendTransfer', {
          recipients: [
            {
              address: recipient,
              amount: amountInSats,
            },
          ],
        });

        if (response.status === 'success') {
          toast.success(`BTC transfer sent! TXID: ${response.result.txid}`);
          closeSendModal();
          return;
        }

        if (!isWalletRequestCancelled(response.error)) {
          toast.error(getWalletErrorMessage(response.error, 'Bitcoin transfer failed'));
        }
        return;
      }

      const sbtcAmount = BigInt(amountInSats);

      if (extensionAvailable) {
        try {
          await sendSbtcDonation({
            amount: sbtcAmount,
            senderAddress: address,
            recipientAddress: recipient,
            memo: memoPayload,
            onFinish: (txId) => {
              toast.success(`sBTC transfer sent! TXID: ${txId}`);
            },
            onCancel: () => {
              toast('sBTC transfer cancelled');
            },
          });
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

      const txId = await sendSbtcDonationWithKey({
        amount: sbtcAmount,
        senderAddress: wallet.address,
        recipientAddress: recipient,
        memo: memoPayload,
        privateKey: wallet.privateKey,
      });

      toast.success(`sBTC transfer sent! TXID: ${txId}`);
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
    fetchRecentTransactions<RecentTransaction>(address, currentNetwork, 10)
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
            <Image src="/btc.svg" alt="Bitcoin" width={28} height={28} />
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
            <div className="p-4 text-sm text-muted-foreground hidden">No assets detected for this wallet yet.</div>
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-100 px-4 py-6"
          onClick={() => {
            if (!sendLoading) closeSendModal();
          }}
        >
          <div
            className="bg-card text-card-foreground rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-border/60">
              <div>
                <h2 className="text-xl font-semibold">Send Bitcoin</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSendAsset.networkLabel}
                  {currentNetwork !== 'mainnet' && sendAsset === 'sbtc' && (
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

            <form onSubmit={handleSend} className="space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-asset">
                  Asset
                </label>
                <select
                  id="send-asset"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  value={sendAsset}
                  onChange={(event) => setSendAsset(event.target.value as SendAsset)}
                  disabled={sendLoading}
                >
                  {SEND_ASSETS.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label} - {getSendAssetBalanceDisplay(asset.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium">{sendMethodTitle}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{sendMethodDescription}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Available balance:
                  <span className="ml-1 font-semibold">{selectedAssetBalanceDisplay}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-recipient">
                  Recipient Address
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <input
                    id="send-recipient"
                    className={`min-w-0 w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 ${recipientError ? 'border-destructive/70' : 'border-border'}`}
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    required
                    placeholder={selectedSendAsset.placeholder}
                    disabled={sendLoading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handlePasteRecipient}
                    disabled={sendLoading}
                    aria-label="Paste address from clipboard"
                  >
                    Paste
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{selectedSendAsset.recipientHint}</p>
                {recipientError && (
                  <p className="text-xs text-destructive mt-2">{recipientError}</p>
                )}
                {unsupportedSendAssetMessage && (
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-2">{unsupportedSendAssetMessage}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-amount">
                  Amount
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <input
                    id="send-amount"
                    className={`min-w-0 w-full px-4 py-3 rounded-xl border bg-background text-foreground text-right text-2xl focus:outline-none focus:ring-2 focus:ring-primary/60 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${amountError ? 'border-destructive/70' : 'border-border'}`}
                    type="number"
                    min={sendAsset === 'sbtc' ? 1 : sendAsset === 'bitcoin' ? 0.00000001 : 0}
                    step={sendAsset === 'sbtc' ? 1 : sendAsset === 'bitcoin' ? 0.00000001 : 'any'}
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    required
                    placeholder={sendAsset === 'sbtc' ? '1000' : sendAsset === 'bitcoin' ? '0.00000000' : '0.0'}
                    disabled={sendLoading}
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => handleQuickFillValue(maxFillValue)}
                    disabled={sendLoading || !maxFillValue}
                  >
                    Max
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
                  <span>{sendAsset === 'sbtc' ? 'Minimum 1 sat' : sendAsset === 'bitcoin' ? 'Amount in BTC' : `Amount in ${selectedSendAsset.unit}`}</span>
                  <span>Available {selectedAssetBalanceDisplay}</span>
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

              {supportsMemo && (
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
                      <span className="text-muted-foreground">
                        Memo limit enforced by the sBTC contract
                      </span>
                    )}
                  </div>
                  {memoError && <p className="text-xs text-destructive mt-2">{memoError}</p>}
                </div>
              )}

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
                    <span className="font-semibold text-lg">{sendAmount || '0'} {selectedSendAsset.unit}</span>
                  </div>
                  {remainingBalanceDisplay && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>Remaining balance</span>
                      <span>{remainingBalanceDisplay} {selectedSendAsset.unit}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <span>Method</span>
                    <span>{sendAsset === 'bitcoin' && !isLocalWallet || extensionAvailable && sendAsset !== 'bitcoin' ? 'Browser extension' : 'Encrypted wallet'}</span>
                  </div>
                </div>
              )}

              {selectedAssetNeedsPassword && selectedSendAsset.supported && (
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
            <h2 className="text-xl font-bold mb-6">Receive {selectedReceiveLabel}</h2>
            <div className="mb-6">
              {selectedReceiveAddress ? (
                <div className="w-full p-6 flex items-center justify-center rounded-xl bg-background">
                  <QRCodeSVG
                    value={selectedReceiveAddress}
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
                <div className="w-full min-h-56 mx-auto bg-muted flex flex-col items-center justify-center gap-3 rounded-xl text-muted-foreground">
                  {btcAddressLoading ? (
                    <LoaderCircle className="animate-spin" size={28} />
                  ) : (
                    <>
                      <div className="text-sm">No {selectedReceiveLabel} address yet</div>
                      {receiveAsset !== 'stacks' && (
                        <button
                          type="button"
                          className="rounded-lg border border-border bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => openGenerateAddressModal(receiveAsset)}
                          disabled={generatingAddresses}
                        >
                          Generate {selectedReceiveLabel} Address
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                className={`w-full rounded-2xl border p-4 text-left transition ${receiveAsset === 'bitcoin' ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted/40 hover:bg-muted/70'}`}
                onClick={() => setReceiveAsset('bitcoin')}
                onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'bitcoin')}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Bitcoin L1</span>
                  {!btcAddressLoading && !primaryReceiveAddress && (
                    <button
                      type="button"
                      className="rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        openGenerateAddressModal('bitcoin');
                      }}
                      disabled={generatingAddresses}
                    >
                      Generate
                    </button>
                  )}
                </div>
                {btcAddressLoading ? (
                  <div className="text-sm">Loading address...</div>
                ) : primaryReceiveAddress ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm break-all">{primaryReceiveAddress}</span>
                    <button
                      className={getReceiveCopyButtonClass('bitcoin')}
                      type="button"
                      aria-label="Copy Bitcoin address"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await copyReceiveAddress(primaryReceiveAddress, 'Bitcoin');
                      }}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-destructive">{btcAddressError || 'No Bitcoin address available.'}</div>
                )}
              </div>

              <div className="grid gap-3 text-left">
                <div
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl border text-left text-sm transition ${receiveAsset === 'stacks' ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'}`}
                  onClick={() => setReceiveAsset('stacks')}
                  onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'stacks')}
                >
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Stacks</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm break-all">{address}</span>
                    <button
                      className={getReceiveCopyButtonClass('stacks')}
                      type="button"
                      aria-label="Copy Stacks address"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await copyReceiveAddress(address, 'Stacks');
                      }}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl border text-left text-sm transition ${receiveAsset === 'rootstock' ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'}`}
                  onClick={() => setReceiveAsset('rootstock')}
                  onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'rootstock')}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Rootstock</span>
                    {!rskAddress && (
                      <button
                        type="button"
                        className="rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          openGenerateAddressModal('rootstock');
                        }}
                        disabled={generatingAddresses}
                      >
                        Generate
                      </button>
                    )}
                  </div>
                  {rskAddress ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm break-all">{rskAddress}</span>
                      <button
                        className={getReceiveCopyButtonClass('rootstock')}
                        type="button"
                        aria-label="Copy Rootstock address"
                        onClick={async (event) => {
                          event.stopPropagation();
                          await copyReceiveAddress(rskAddress, 'Rootstock');
                        }}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Rootstock address not configured.</div>
                  )}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl border text-left text-sm transition ${receiveAsset === 'liquid' ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'}`}
                  onClick={() => setReceiveAsset('liquid')}
                  onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'liquid')}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Liquid</span>
                    {!liquidAddress && (
                      <button
                        type="button"
                        className="rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          openGenerateAddressModal('liquid');
                        }}
                        disabled={generatingAddresses}
                      >
                        Generate
                      </button>
                    )}
                  </div>
                  {liquidAddress ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm break-all">{liquidAddress}</span>
                      <button
                        className={getReceiveCopyButtonClass('liquid')}
                        type="button"
                        aria-label="Copy Liquid address"
                        onClick={async (event) => {
                          event.stopPropagation();
                          await copyReceiveAddress(liquidAddress, 'Liquid');
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

      <PasswordSigningModal
        isOpen={showGenerateAddressesModal}
        onClose={closeGenerateAddressModal}
        onSign={handleGenerateAddress}
        title={`Generate ${generateAddressLayer ? RECEIVE_LAYER_LABELS[generateAddressLayer] : 'Receive'} Address`}
        description={`Enter your wallet password to decrypt the local private key and generate ${generateAddressLayer ? `your ${RECEIVE_LAYER_LABELS[generateAddressLayer]}` : 'the selected'} receive address in this browser.`}
        actionText="Generate"
        isLoading={generatingAddresses}
      />

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
