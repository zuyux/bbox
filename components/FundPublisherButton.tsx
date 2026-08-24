"use client";

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Coins, ExternalLink, Wallet, Shield, Loader2, X, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PasswordSigningModal } from '@/components/PasswordSigningModal';
import ConnectModal from '@/components/ConnectModal';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import { retrieveEncryptedWallet } from '@/lib/encryptedStorage';
import {
	satsToBTC,
	sendSbtcDonation,
	sendSbtcDonationWithKey,
} from '@/lib/bbox-contract';

type PaymentMethod = 'extension' | 'internal';

interface FundPublisherButtonProps {
	appName: string;
	publisherName?: string | null;
	publisherAddress: string;
}

export function FundPublisherButton({ appName, publisherName, publisherAddress }: FundPublisherButtonProps) {
	const currentAddress = useCurrentAddress();
	const { walletInfo, isWalletEncrypted } = useEncryptedWallet();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [amountInput, setAmountInput] = useState('1000');
	const [memoInput, setMemoInput] = useState('');
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [pendingDonation, setPendingDonation] = useState<{ amount: bigint; memo: string } | null>(null);
	const [isInternalSigning, setIsInternalSigning] = useState(false);
	const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

	const hasInternalWallet = Boolean(walletInfo?.address || isWalletEncrypted);
	const extensionConnected = Boolean(currentAddress);
	const activeMethod: PaymentMethod | null = extensionConnected
		? 'extension'
		: hasInternalWallet
			? 'internal'
			: null;

	const shortPublisherAddress = useMemo(() => {
		if (!publisherAddress) {
			return 'publisher address';
		}
		if (publisherAddress.length <= 12) {
			return publisherAddress;
		}
		return `${publisherAddress.slice(0, 6)}…${publisherAddress.slice(-4)}`;
	}, [publisherAddress]);

	const defaultMemo = useMemo(() => {
		const normalized = appName
			? appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
			: 'bbox';
		return `bbox-${normalized || 'funding'}`.slice(0, 34);
	}, [appName]);

	const shortTx = useCallback((txId?: string | null) => {
		if (!txId) return '';
		return `${txId.slice(0, 6)}…${txId.slice(-4)}`;
	}, []);

	const btcEquivalent = useMemo(() => {
		if (!amountInput || !/^\d+$/.test(amountInput)) {
			return '0.00000000';
		}
		try {
			return satsToBTC(BigInt(amountInput));
		} catch {
			return '0.00000000';
		}
	}, [amountInput]);

	const closeModal = useCallback((force = false) => {
		if (!force && (isSubmitting || isInternalSigning)) {
			return;
		}
		setIsModalOpen(false);
		setFormError(null);
		setPendingDonation(null);
		setIsPasswordModalOpen(false);
	}, [isSubmitting, isInternalSigning]);

	const openModal = () => {
		setAmountInput('1000');
		setMemoInput(defaultMemo);
		setFormError(null);
		setIsModalOpen(true);
	};

	const validateAmount = (): bigint | null => {
		const trimmed = amountInput.trim();
		if (!trimmed || !/^\d+$/.test(trimmed)) {
			setFormError('Enter a valid positive amount in satoshis');
			return null;
		}
		const amount = BigInt(trimmed);
		if (amount <= 0) {
			setFormError('Donation amount must be greater than zero');
			return null;
		}
		return amount;
	};

	const handleExtensionDonation = async (amount: bigint, memo: string) => {
		if (!currentAddress) {
			setFormError('Connect a wallet extension to continue');
			return;
		}
		setIsSubmitting(true);
		setFormError(null);
		try {
			await sendSbtcDonation({
				amount,
				senderAddress: currentAddress,
				recipientAddress: publisherAddress,
				memo,
				onFinish: (txId) => {
					toast.success('Donation broadcast', {
						description: `Tx ${shortTx(txId)}`,
					});
					closeModal(true);
				},
				onCancel: () => {
					toast('Donation cancelled');
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to send donation';
			setFormError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleInternalDonation = async (password: string) => {
		if (!pendingDonation) {
			return;
		}
		setIsInternalSigning(true);
		try {
			const walletData = await retrieveEncryptedWallet(password);
			if (!walletData) {
				throw new Error('Wallet locked or unavailable');
			}

			await sendSbtcDonationWithKey({
				amount: pendingDonation.amount,
				senderAddress: walletData.address,
				recipientAddress: publisherAddress,
				memo: pendingDonation.memo,
				privateKey: walletData.privateKey,
				onFinish: (txId) => {
					toast.success('Donation broadcast', {
						description: `Tx ${shortTx(txId)}`,
					});
				},
			});

			setIsPasswordModalOpen(false);
			closeModal(true);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to send donation';
			setFormError(message);
			throw error;
		} finally {
			setIsInternalSigning(false);
		}
	};

	const submitDonation = () => {
		setFormError(null);
		const amount = validateAmount();
		if (!amount) {
			return;
		}
		if (!publisherAddress) {
			setFormError('Publisher address unavailable for this submission');
			return;
		}

		const memo = (memoInput?.trim() || defaultMemo).slice(0, 34);

		if (activeMethod === 'internal') {
			if (!hasInternalWallet) {
				setFormError('Add an encrypted wallet in Settings first');
				return;
			}
			setPendingDonation({ amount, memo });
			setIsPasswordModalOpen(true);
			return;
		}

		if (activeMethod !== 'extension') {
			setFormError('Connect a wallet to continue');
			setIsConnectModalOpen(true);
			return;
		}

		handleExtensionDonation(amount, memo);
	};

	return (
		<>
			<Button
				onClick={openModal}
				disabled={!publisherAddress}
				className="bg-foreground hover:bg-foreground text-background cursor-pointer"
			>
				<Coins className="h-4 w-4 mr-2" />
				Support this app
			</Button>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/60" onClick={() => closeModal()} />
					<div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
						<div className="flex items-center justify-between mb-4">
							<div>
								<p className="text-sm text-muted-foreground">Support</p>
								<h3 className="text-2xl font-bold">Fund {publisherName || 'this publisher'}</h3>
							</div>
							<button
								type="button"
								onClick={() => closeModal()}
								className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">
									Amount (satoshis)
								</label>
								<Input
									type="number"
									min="1"
									value={amountInput}
									onChange={(event) => setAmountInput(event.target.value)}
									className="bg-background"
								/>
								<p className="text-xs text-muted-foreground mt-1">
									≈ {btcEquivalent} sBTC
								</p>
							</div>

							<div>
								<label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 block">
									Memo (optional)
								</label>
								<Textarea
									rows={2}
									value={memoInput}
									onChange={(event) => setMemoInput(event.target.value)}
									maxLength={34}
									placeholder={defaultMemo}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									Memo shared on-chain (max 34 characters)
								</p>
							</div>

							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
									Wallet
								</p>
								<div className={`rounded-xl border p-4 flex flex-col gap-3 ${activeMethod ? 'border-border' : 'border-red-200 bg-red-50/70'}`}>
									<div className="flex gap-3">
										<div className="h-10 w-10 rounded-full border border-border flex items-center justify-center">
											{activeMethod === 'extension' && <Wallet className="h-4 w-4" />}
											{activeMethod === 'internal' && <Shield className="h-4 w-4" />}
											{!activeMethod && <AlertTriangle className="h-4 w-4 text-red-500" />}
										</div>
										<div>
											<p className="text-sm font-semibold">
												{activeMethod === 'extension' && 'Wallet extension connected'}
												{activeMethod === 'internal' && (walletInfo?.label ? `Encrypted wallet: ${walletInfo.label}` : 'Encrypted wallet ready')}
												{!activeMethod && 'No wallet detected'}
											</p>
											<p className="text-xs text-muted-foreground">
												{activeMethod === 'extension' && (currentAddress ? `Address ${currentAddress.slice(0, 6)}…${currentAddress.slice(-4)}` : 'Awaiting address')}
												{activeMethod === 'internal' && 'Enter your password on continue to sign with your BBOXX wallet.'}
												{!activeMethod && 'Connect a wallet extension or set up an encrypted wallet in Settings.'}
											</p>
										</div>
									</div>
									{!activeMethod && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setIsConnectModalOpen(true)}
											className="self-start cursor-pointer"
										>
											Connect wallet
										</Button>
									)}
								</div>
							</div>

							{formError && (
								<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
									{formError}
								</div>
							)}

							<div className="flex items-center justify-between gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => closeModal()}
									className="flex-1 cursor-pointer"
									disabled={isSubmitting || isInternalSigning}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={submitDonation}
									className="flex-1 bg-foreground hover:bg-foreground cursor-pointer"
									disabled={!activeMethod || isSubmitting || isInternalSigning}
								>
									{isSubmitting || isInternalSigning ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											Awaiting confirmation…
										</>
									) : (
										'Continue'
									)}
								</Button>
							</div>

							<div className="text-xs text-muted-foreground flex items-center gap-1">
								<ExternalLink className="h-3 w-3" />
								Funds go directly to {shortPublisherAddress} via sBTC transfer.
							</div>
						</div>
					</div>
				</div>
			)}

			<PasswordSigningModal
				isOpen={isPasswordModalOpen}
				onClose={() => {
					if (!isInternalSigning) {
						setIsPasswordModalOpen(false);
					}
				}}
				onSign={async (password) => {
					await handleInternalDonation(password);
				}}
				title="Confirm sBTC donation"
				description={`Enter your password to send funds to ${publisherName || 'this app publisher'}.`}
				actionText="Send"
				isLoading={isInternalSigning}
			/>

			{isConnectModalOpen && (
				<ConnectModal
					onClose={() => setIsConnectModalOpen(false)}
					onSuccess={() => {
						setIsConnectModalOpen(false);
						setFormError(null);
					}}
					onError={(message) => setFormError(message)}
				/>
			)}
		</>
	);
}

export default FundPublisherButton;
