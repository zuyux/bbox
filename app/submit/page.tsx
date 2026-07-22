'use client';



import { LocalizedText } from '@/components/LocalizedText';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GetInModal from '@/components/GetInModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Plus, 
  ExternalLink, 
  Github, 
  Globe, 
  Shield, 
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Coins,
  Info,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getListingFee, formatListingFee, submitAppToContract, DEFAULT_LISTING_FEE } from '@/lib/bbox-contract';
import { getPersistedNetwork } from '@/lib/network';
import { uploadFileToPinata, getIPFSUrl } from '@/lib/pinataUpload';
import { useWallet } from '@/components/WalletProvider';
import { signStacksMessage, type StacksSignatureResult } from '@/lib/commentSigning';
import { uploadAppMetadataToIPFS, validateAppMetadata, createMetadataFromFormData } from '@/lib/ipfs-metadata';
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from '@/lib/developerMode';
import { getProfileDeveloperMode } from '@/lib/profileApi';
import {
  createBarPayload,
  createSignedBarPayloadWithPasskey,
  estimateBarInscriptionFees,
  getBarOrdinalsAddress,
  inscribeBarPayloadWithExtension,
  submitBarPayloadWithPasskey,
  BAR_CANONICAL_TAPROOT_ADDRESS,
  type BarFeeEstimate,
} from '@/lib/bar-inscription';

interface AppFormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon_cid: string;
  version: string;
  website_url: string;
  github_url: string;
  documentation_url: string;
  platforms: string[];
  supported_networks: string[];
  license: string;
  pricing_model: string;
  price_usd: number;
  accepts_lightning: boolean;
  lightning_address: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  data_collection_summary: string;
  open_source: boolean;
  publisher_name: string;
  publisher_email: string;
}

type SubmitStatus = 'idle' | 'metadata' | 'bar' | 'contract' | 'uploading' | 'email' | 'success' | 'error';
type BarSigningMethod = 'extension' | 'passkey';
const BAR_INSCRIPTIONS_UNDER_CONSTRUCTION = true;
const APP_SUBMISSIONS_UNDER_CONSTRUCTION = true;

const CATEGORIES = [
  'Wallet',
  'Lightning',
  'DeFi',
  'Mining',
  'Payment',
  'Explorer',
  'Social',
  'Networking',
  'Identity',
  'Infrastructure',
  'Developer',
  'Creator',
  'Research',
  'Privacy',
  'Cybersecurity',
  'OSINT',
  'Nostr',
  'Gaming',
  'Other'
];

const PLATFORMS = [
  'Web Application',
  'Desktop (Windows)',
  'Desktop (macOS)',
  'Desktop (Linux)',
  'Mobile (iOS)',
  'Mobile (Android)',
  'Browser Extension',
  'CLI Tool',
  'API/Service'
];

const NETWORKS = [
  'None / Off-chain',
  'Bitcoin',
  'Lightning Network',
  'Stacks',
  'Liquid Network',
  'RGB Protocol',
  'Ordinals',
  'Runes',
  'Ethereum',
  'Solana',
  'Nostr',
  'AI / Local Models',
  'Other'
];

const LICENSES = [
  'MIT',
  'Apache 2.0',
  'GPL v3',
  'BSD 3-Clause',
  'ISC',
  'Creative Commons',
  'Proprietary',
  'Other'
];

export default function PublishPage() {
  const router = useRouter();
  const currentAddress = useCurrentAddress();
  const { walletType } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [newTag, setNewTag] = useState('');
  const [listingFee, setListingFee] = useState<{ token: string; amount: bigint } | null>(null);
  const [listingFeeSource, setListingFeeSource] = useState<'network' | 'fallback' | null>(null);
  const [network, setNetwork] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [iconUploadStatus, setIconUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [iconUploadError, setIconUploadError] = useState('');
  const [signatureStatus, setSignatureStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle');
  const [signatureError, setSignatureError] = useState('');
  const [signatureResult, setSignatureResult] = useState<StacksSignatureResult | null>(null);
  const [metadataCid, setMetadataCid] = useState<string | null>(null);
  const [contractTxId, setContractTxId] = useState<string | null>(null);
  const [barTxId, setBarTxId] = useState<string | null>(null);
  const [barInscriptionId, setBarInscriptionId] = useState<string | null>(null);
  const [barOwnerAddress, setBarOwnerAddress] = useState<string | null>(null);
  const [barFeeEstimate, setBarFeeEstimate] = useState<BarFeeEstimate | null>(null);
  const [publishToBar, setPublishToBar] = useState(false);
  const [publishToClarity, setPublishToClarity] = useState(true);
  const [barSigningMethod, setBarSigningMethod] = useState<BarSigningMethod>('extension');
  const [barFeeRate, setBarFeeRate] = useState(8);
  const [barServiceFee, setBarServiceFee] = useState(0);
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [developerMode, setDeveloperMode] = useState<boolean | null>(null);
  const effectiveListingFee = listingFee ?? DEFAULT_LISTING_FEE;
  const isFallbackListingFee = listingFeeSource === 'fallback';
  const listingFeeDisplay = formatListingFee(effectiveListingFee.amount, effectiveListingFee.token);

  useEffect(() => {
    let cancelled = false;

    const syncDeveloperMode = async () => {
      if (!currentAddress) {
        setDeveloperMode(isDeveloperModeEnabled());
        return;
      }

      try {
        const savedDeveloperMode = await getProfileDeveloperMode(currentAddress);
        if (cancelled) return;
        setDeveloperMode(savedDeveloperMode);
        setDeveloperModeEnabled(savedDeveloperMode);
      } catch (error) {
        console.warn('Unable to load Developer Mode from profile:', error);
        if (!cancelled) {
          setDeveloperMode(isDeveloperModeEnabled());
        }
      }
    };

    syncDeveloperMode();
    window.addEventListener('storage', syncDeveloperMode);
    window.addEventListener('bbox-developer-mode-change', syncDeveloperMode);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncDeveloperMode);
      window.removeEventListener('bbox-developer-mode-change', syncDeveloperMode);
    };
  }, [currentAddress]);

  useEffect(() => {
    setSignatureResult(null);
    setSignatureStatus('idle');
    setSignatureError('');
  }, [currentAddress, walletType]);

  useEffect(() => {
    if (!currentAddress) {
      setShowGetInModal(true);
    } else {
      setShowGetInModal(false);
    }
  }, [currentAddress]);

  // Fetch listing fee and network on mount
  useEffect(() => {
    let cancelled = false;

    const fetchListingFee = async () => {
      try {
        const fee = await getListingFee();
        if (!cancelled) {
          setListingFee(fee);
          setListingFeeSource('network');
        }
      } catch (error) {
        console.warn('Failed to fetch listing fee, using fallback:', error);
        if (!cancelled) {
          setListingFee(DEFAULT_LISTING_FEE);
          setListingFeeSource('fallback');
        }
      }
    };

    fetchListingFee();
    setNetwork(getPersistedNetwork());

    return () => {
      cancelled = true;
    };
  }, []);

  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    description: '',
    category: '',
    tags: [],
    icon_cid: '',
    version: '',
    website_url: '',
    github_url: '',
    documentation_url: '',
    platforms: [],
    supported_networks: [],
    license: '',
    pricing_model: '',
    price_usd: 0,
    accepts_lightning: false,
    lightning_address: '',
    privacy_policy_url: '',
    terms_of_service_url: '',
    data_collection_summary: '',
    open_source: false,
    publisher_name: '',
    publisher_email: ''
  });
  const barPreviewEstimate = estimateBarInscriptionFees(
    createBarPayload(formData, barOwnerAddress || BAR_CANONICAL_TAPROOT_ADDRESS, metadataCid || undefined),
    Math.max(1, Math.round(Number(barFeeRate) || 1)),
    Math.max(0, Math.round(Number(barServiceFee) || 0))
  );

  const clearSignatureState = () => {
    setSignatureResult(null);
    setSignatureStatus('idle');
    setSignatureError('');
  };

  const handleInputChange = (field: keyof AppFormData, value: string | number | boolean | string[]) => {
    clearSignatureState();
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field: 'platforms' | 'supported_networks' | 'tags', value: string) => {
    clearSignatureState();
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleArrayToggle('tags', newTag.trim());
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    clearSignatureState();
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

    const buildSignaturePayload = () => {
      return JSON.stringify({
        action: 'bbox_app_submission',
        address: currentAddress,
        network,
        timestamp: new Date().toISOString(),
        app: {
          name: formData.name,
          version: formData.version,
          category: formData.category,
          website_url: formData.website_url,
          github_url: formData.github_url,
          icon_cid: formData.icon_cid,
          pricing_model: formData.pricing_model,
          open_source: formData.open_source,
          tags: formData.tags,
        },
      });
    };

    const requestSubmissionSignature = async (): Promise<StacksSignatureResult> => {
      if (!walletType) {
        throw new Error('Wallet type not detected. Reconnect your Stacks wallet and try again.');
      }
      if (!currentAddress) {
        throw new Error('Please connect your wallet before signing the submission.');
      }

      setSignatureStatus('signing');
      setSignatureError('');

      const payload = buildSignaturePayload();

      try {
        const result = await signStacksMessage(payload, walletType);
        setSignatureResult(result);
        setSignatureStatus('signed');
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign submission';
        setSignatureError(message);
        setSignatureStatus('error');
        throw error;
      }
    };

    const handleSignSubmission = async () => {
      try {
        await requestSubmissionSignature();
      } catch (error) {
        console.error('Signature request failed:', error);
      }
    };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setIconUploadStatus('uploading');
    setIconUploadError('');

    try {
      const result = await uploadFileToPinata(file);

      if (result.success) {
        handleInputChange('icon_cid', result.data.IpfsHash);
        setIconUploadStatus('success');
      } else {
        setIconUploadStatus('error');
        setIconUploadError(result.error);
      }
    } finally {
      input.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (APP_SUBMISSIONS_UNDER_CONSTRUCTION) {
      setErrorMessage("App submissions are under construction. Please check back soon.");
      setSubmitStatus('error');
      return;
    }
    
    if (!currentAddress) {
      setErrorMessage("Please connect your wallet to publish an app");
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    setValidationErrors([]);
    setMetadataCid(null);
    setContractTxId(null);
    setBarTxId(null);
    setBarInscriptionId(null);
    setBarOwnerAddress(null);
    setBarFeeEstimate(null);

    try {
      // Validate required fields
      const baseValidationErrors: string[] = [];
      if (!formData.name || !formData.description || !formData.category || !formData.publisher_email) {
        baseValidationErrors.push('Please fill in all required fields (Name, Description, Category, Email)');
      }

      if (formData.description.length < 50) {
        baseValidationErrors.push('Description must be at least 50 characters long');
      }

      if (baseValidationErrors.length > 0) {
        setValidationErrors(baseValidationErrors);
        throw new Error(baseValidationErrors[0]);
      }

      if (BAR_INSCRIPTIONS_UNDER_CONSTRUCTION && publishToBar) {
        throw new Error('BAR inscriptions are under construction. Use the Stacks Clarity contract option for now.');
      }

      if (!publishToClarity) {
        throw new Error('Use the Stacks Clarity contract option for submissions while BAR inscriptions are under construction.');
      }

      let submissionSignature = signatureResult;
      if (!submissionSignature) {
        try {
          submissionSignature = await requestSubmissionSignature();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Signature required to submit app';
          setErrorMessage(message);
          setSubmitStatus('error');
          setIsSubmitting(false);
          return;
        }
      }

      if (!submissionSignature) {
        throw new Error('Missing submission signature. Please try again.');
      }

      const metadataPayload = createMetadataFromFormData(formData as unknown as Record<string, unknown>, currentAddress);
      const metadataValidation = validateAppMetadata(metadataPayload);

      if (!metadataValidation.valid) {
        setValidationErrors(metadataValidation.errors);
        throw new Error(metadataValidation.errors[0] || 'Metadata validation failed');
      }

      setSubmitStatus('metadata');
      const ipfsHash = await uploadAppMetadataToIPFS(metadataPayload);
      setMetadataCid(ipfsHash);

      let resolvedBarTxId = '';
      let resolvedBarInscriptionId = '';
      let resolvedBarOwnerAddress = '';

      if (publishToBar && !BAR_INSCRIPTIONS_UNDER_CONSTRUCTION) {
        setSubmitStatus('bar');
        const normalizedFeeRate = Math.max(1, Math.round(Number(barFeeRate) || 1));
        const normalizedServiceFee = Math.max(0, Math.round(Number(barServiceFee) || 0));

        if (barSigningMethod === 'extension') {
          const ownerAddress = await getBarOrdinalsAddress();
          const barPayload = createBarPayload(formData, ownerAddress, ipfsHash);
          const previewEstimate = estimateBarInscriptionFees(barPayload, normalizedFeeRate, normalizedServiceFee);
          setBarOwnerAddress(ownerAddress);
          setBarFeeEstimate(previewEstimate);

          const result = await inscribeBarPayloadWithExtension(
            barPayload,
            normalizedFeeRate,
            normalizedServiceFee,
            BAR_CANONICAL_TAPROOT_ADDRESS
          );
          resolvedBarTxId = result.txId;
          resolvedBarInscriptionId = result.inscriptionId || '';
          resolvedBarOwnerAddress = ownerAddress;
          setBarTxId(result.txId);
          setBarInscriptionId(result.inscriptionId || null);
          setBarFeeEstimate(result.feeEstimate);
        } else {
          const password = window.prompt('Enter your wallet password to authorize the BAR inscription relay.');
          if (!password) {
            throw new Error('Passkey authorization is required for BAR inscription.');
          }
          const signedPayload = await createSignedBarPayloadWithPasskey(
            currentAddress,
            password,
            formData,
            ipfsHash,
            normalizedFeeRate,
            normalizedServiceFee
          );
          setBarOwnerAddress(signedPayload.payload.owner);
          setBarFeeEstimate(signedPayload.feeEstimate);
          const result = await submitBarPayloadWithPasskey(
            signedPayload.authorization,
            signedPayload.payload,
            signedPayload.feeEstimate
          );
          resolvedBarTxId = result.txId;
          resolvedBarInscriptionId = result.inscriptionId || '';
          resolvedBarOwnerAddress = result.ownerAddress;
          setBarTxId(result.txId);
          setBarInscriptionId(result.inscriptionId || null);
        }
      }

      let resolvedContractTxId = '';

      if (publishToClarity) {
        const feeForTx = listingFee ?? DEFAULT_LISTING_FEE;
        if (!listingFee) {
          console.warn('Listing fee unavailable at submit time. Using fallback default.');
          setListingFee(feeForTx);
          setListingFeeSource('fallback');
        }

        const awaitContractTx = async (): Promise<string> =>
          new Promise((resolve, reject) => {
            submitAppToContract(
              {
                ipfsHash,
                listingFee: feeForTx,
              },
              (txId) => resolve(txId),
              () => reject(new Error('Contract call cancelled by user'))
            ).catch((error) => reject(error));
          });

        setSubmitStatus('contract');
        resolvedContractTxId = await awaitContractTx();
        setContractTxId(resolvedContractTxId);
      }

      // Step 1: Submit to Supabase
      setSubmitStatus('uploading');
      const submitResponse = await fetch('/api/submit-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          publisher_address: currentAddress,
          metadata_cid: ipfsHash,
          contract_txid: resolvedContractTxId,
          contract_network: publishToClarity ? network : '',
          bar_txid: resolvedBarTxId,
          bar_inscription_id: resolvedBarInscriptionId,
          bar_owner_address: resolvedBarOwnerAddress,
        }),
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok || !submitData.success) {
        throw new Error(submitData.error || 'Failed to submit app to database');
      }


      // Step 2: Send confirmation emails
      setSubmitStatus('email');
      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'app-submission',
          data: {
            appName: formData.name,
            version: formData.version,
            category: formData.category,
            description: formData.description,
            userEmail: formData.publisher_email,
            publisherName: formData.publisher_name,
            publisherAddress: currentAddress,
            websiteUrl: formData.website_url,
            githubUrl: formData.github_url,
            pricingModel: formData.pricing_model,
            license: formData.license,
            openSource: formData.open_source,
            acceptsLightning: formData.accepts_lightning,
            tags: formData.tags,
            platforms: formData.platforms,
            supportedNetworks: formData.supported_networks,
          },
        }),
      });

      if (!emailResponse.ok) {
        console.error('⚠️ Failed to send emails, but app was submitted successfully');
      } else {
      }

      // Step 3: Success! Redirect to success page
      setSubmitStatus('success');
      setIsSubmitting(false);
      setTimeout(() => {
        const query = new URLSearchParams();
        const primaryTxId = resolvedContractTxId || resolvedBarTxId;
        if (primaryTxId) {
          query.set('txid', primaryTxId);
        }
        const redirectNetwork = network || getPersistedNetwork();
        if (redirectNetwork) {
          query.set('network', redirectNetwork);
        }
        const path = query.size > 0 ? `/submit/success?${query.toString()}` : '/submit/success';
        router.push(path);
      }, 1000);

    } catch (error: unknown) {
      console.error('❌ Error publishing app:', error);
      const message = error instanceof Error ? error.message : 'Failed to publish app. Please try again.';
      setErrorMessage(message);
      setSubmitStatus('error');
      setIsSubmitting(false);
    }
  };

  const handleGetInModalClose = () => {
    setShowGetInModal(false);
    router.push('/');
  };

  if (developerMode === null) {
    return (
      <div className="bg-background min-h-screen">
      </div>
    );
  }

  if (developerMode === false) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 pt-28 pb-12">
          <Card className="mx-auto max-w-xl border-border bg-card">
            <CardHeader>
              <CardTitle><LocalizedText>Developer Mode is off</LocalizedText></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p><LocalizedText>Publishing tools are hidden for the everyday app store experience. Turn on Developer Mode in Settings when you want to submit a project.</LocalizedText></p>
              <Button asChild className="w-full bg-orange-500 text-white hover:bg-orange-600">
                <Link href="/settings#developer-mode"><LocalizedText>Open Settings</LocalizedText></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentAddress) {
    return (
      <div className="bg-background min-h-screen">
        {showGetInModal && <GetInModal onClose={handleGetInModalClose} />}
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="title text-3xl font-bold mb-2"><LocalizedText>Submit Your R&amp;D Project</LocalizedText></h1>
              <p className="text-muted-foreground">
                <LocalizedText>Submit an application or focused research project to the BBOX registry. Open-source, privacy, cybersecurity, OSINT, Bitcoin, developer, safe AI, and off-chain public-good work are welcome.
              </LocalizedText></p>
            </div>
            <Button
              asChild
              variant="outline"
              className="cursor-pointer w-full sm:w-auto justify-center"
            >
              <Link href="/submit/review" className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <LocalizedText>Review submissions
              </LocalizedText></Link>
            </Button>
          </div>

          {/* Status Messages */}
          {submitStatus === "metadata" && (
            <Card className="mb-6 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <span className="text-purple-900 dark:text-purple-100">
                    <LocalizedText>Uploading your metadata to IPFS...
                  </LocalizedText></span>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-200 mt-2 ml-7">
                  <LocalizedText>This pins your app details before the on-chain submission
                </LocalizedText></p>
              </CardContent>
            </Card>
          )}

          {submitStatus === "contract" && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  <span className="text-orange-900 dark:text-orange-100">
                    <LocalizedText>Confirm the on-chain listing fee in your wallet
                  </LocalizedText></span>
                </div>
                <p className="text-xs text-orange-800 dark:text-orange-200 mt-2 ml-7">
                  <LocalizedText>Pay </LocalizedText>{listingFeeDisplay} <LocalizedText>in sBTC plus STX gas to submit on-chain
                  </LocalizedText>{isFallbackListingFee && " (estimate)"}
                </p>
              </CardContent>
            </Card>
          )}

          {submitStatus === "bar" && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  <span className="text-orange-900 dark:text-orange-100">
                    <LocalizedText>Confirm the BAR inscription in your Bitcoin wallet
                  </LocalizedText></span>
                </div>
                <p className="text-xs text-orange-800 dark:text-orange-200 mt-2 ml-7">
                  <LocalizedText>The wallet will inscribe a brc-app JSON record to Bitcoin L1 and handle miner fees.
                </LocalizedText></p>
                {barFeeEstimate && (
                  <p className="text-[11px] text-orange-800 dark:text-orange-200 mt-2 ml-7">
                    <LocalizedText>Estimate: </LocalizedText>{barFeeEstimate.estimatedTotalSats.toLocaleString()} <LocalizedText>sats at </LocalizedText>{barFeeEstimate.feeRate} <LocalizedText>sat/vB
                  </LocalizedText></p>
                )}
              </CardContent>
            </Card>
          )}

          {submitStatus === "uploading" && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-800 dark:text-blue-200">
                    <LocalizedText>Finalizing your submission...
                  </LocalizedText></span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 ml-7">
                  <LocalizedText>Saving metadata and transaction details to the database
                </LocalizedText></p>
                {metadataCid && (
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-2 ml-7 break-all">
                    <LocalizedText>Metadata CID: </LocalizedText><span className="font-mono">{metadataCid}</span>
                  </p>
                )}
                {contractTxId && (
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 ml-7 break-all">
                    <LocalizedText>Contract TX: </LocalizedText><span className="font-mono">{contractTxId}</span>
                  </p>
                )}
                {barTxId && (
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 ml-7 break-all">
                    <LocalizedText>BAR TX: </LocalizedText><span className="font-mono">{barTxId}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {submitStatus === "email" && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  <span className="text-amber-900 dark:text-amber-100">
                    <LocalizedText>Sending confirmation emails...
                  </LocalizedText></span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 ml-7">
                  <LocalizedText>You&apos;ll receive a confirmation shortly
                </LocalizedText></p>
              </CardContent>
            </Card>
          )}

          {submitStatus === 'success' && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    <LocalizedText>App submitted successfully!
                  </LocalizedText></span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2 ml-7">
                  <LocalizedText>Redirecting to success page...
                </LocalizedText></p>
                {contractTxId && (
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 break-all">
                    <LocalizedText>Contract TX: </LocalizedText><span className="font-mono">{contractTxId}</span>
                  </p>
                )}
                {metadataCid && (
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 break-all">
                    <LocalizedText>Metadata CID: </LocalizedText><span className="font-mono">{metadataCid}</span>
                  </p>
                )}
                {barTxId && (
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 break-all">
                    <LocalizedText>BAR TX: </LocalizedText><span className="font-mono">{barTxId}</span>
                  </p>
                )}
                {barInscriptionId && (
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7 break-all">
                    <LocalizedText>BAR Inscription: </LocalizedText><span className="font-mono">{barInscriptionId}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {submitStatus === 'error' && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-red-800 dark:text-red-200 font-semibold block mb-1">
                      {errorMessage}
                    </span>
                    {errorMessage.includes('wallet') && errorMessage.includes('install') && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded">
                        <p className="font-semibold mb-2"><LocalizedText>💼 Install a Stacks Wallet:</LocalizedText></p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <a 
                              href="https://leather.io/install-extension" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-red-900 dark:hover:text-red-100 font-semibold"
                            >
                              <LocalizedText>→ Leather Wallet
                            </LocalizedText></a>
                            <span className="ml-2"><LocalizedText>(Recommended)</LocalizedText></span>
                          </div>
                          <div>
                            <a 
                              href="https://www.xverse.app/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-red-900 dark:hover:text-red-100 font-semibold"
                            >
                              <LocalizedText>→ Xverse Wallet
                            </LocalizedText></a>
                          </div>
                          <p className="mt-2 italic"><LocalizedText>After installing, refresh this page and connect your wallet.</LocalizedText></p>
                        </div>
                      </div>
                    )}
                    {errorMessage.includes('Contract not') && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded">
                        <p className="font-semibold mb-2"><LocalizedText>📋 To deploy the contract:</LocalizedText></p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li><LocalizedText>Deploy bbox.clar to your Stacks testnet/mainnet</LocalizedText></li>
                          <li><LocalizedText>Update the contract address in </LocalizedText><code className="bg-red-200 dark:bg-red-800 px-1 rounded">lib/bbox-contract.ts</code></li>
                          <li><LocalizedText>Restart your development server</LocalizedText></li>
                        </ol>
                      </div>
                    )}
                    {validationErrors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
                        {validationErrors.map((err, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-red-500">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Basic Information</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name"><LocalizedText>App Name *</LocalizedText></Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={"Sovereign Notes"}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="version"><LocalizedText>Version</LocalizedText></Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => handleInputChange('version', e.target.value)}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description"><LocalizedText>Description *</LocalizedText></Label>
                    <span className={`text-xs ${formData.description.length < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formData.description.length} <LocalizedText>/ 50 min
                    </LocalizedText></span>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={"An open-source privacy tool, developer utility, safe AI app, or chain-integrated product with verifiable source code..."}
                    rows={4}
                    required
                  />
                  {formData.description.length > 0 && formData.description.length < 50 && (
                    <p className="text-xs text-red-500 mt-1">
                      <LocalizedText>Description must be at least 50 characters
                    </LocalizedText></p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category"><LocalizedText>Category *</LocalizedText></Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={"Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label><LocalizedText>Tags</LocalizedText></Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder={"Add a tag..."}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeTag(tag);
                          }}
                          className="ml-1 hover:opacity-70"
                          aria-label={`Remove ${tag} tag`}
                        >
                          <X className="w-3 h-3 cursor-pointer" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="app_icon"><LocalizedText>App Icon</LocalizedText></Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    <LocalizedText>Upload a square image (PNG, JPG, GIF, or WebP) under 10MB to host on IPFS.
                  </LocalizedText></p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-lg border border-dashed bg-muted">
                      {formData.icon_cid ? (
                        <div className="absolute inset-1 rounded-md overflow-hidden bg-background">
                          <Image
                            src={getIPFSUrl(formData.icon_cid)}
                            alt="App icon preview"
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <Input
                        id="app_icon"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleIconUpload}
                        disabled={iconUploadStatus === "uploading" || isSubmitting}
                        className='cursor-pointer'
                      />
                      {iconUploadStatus === "uploading" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <LocalizedText>Uploading to IPFS...
                        </LocalizedText></p>
                      )}
                      {iconUploadStatus === 'success' && formData.icon_cid && (
                        <p className="text-xs text-green-600">
                          <LocalizedText>Icon uploaded • CID:
                          </LocalizedText><span className="font-mono break-all ml-1">{formData.icon_cid}</span>
                        </p>
                      )}
                      {iconUploadStatus === 'error' && iconUploadError && (
                        <p className="text-xs text-red-500"><LocalizedText>Upload failed: </LocalizedText>{iconUploadError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links and Resources */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Links and Resources</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="website_url"><LocalizedText>Website URL</LocalizedText></Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder={"https://your-app.com"}
                      className='pl-10'
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="github_url"><LocalizedText>GitHub Repository</LocalizedText></Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github_url"
                      type="url"
                      value={formData.github_url}
                      onChange={(e) => handleInputChange('github_url', e.target.value)}
                      placeholder={"https://github.com/username/repo"}
                      className='pl-10'
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="documentation_url"><LocalizedText>Documentation URL</LocalizedText></Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="documentation_url"
                      type="url"
                      value={formData.documentation_url}
                      onChange={(e) => handleInputChange('documentation_url', e.target.value)}
                      placeholder={"https://docs.your-app.com"}
                      className='pl-10'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform and Network Support */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Platform and Network Support</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label><LocalizedText>Supported Platforms</LocalizedText></Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {PLATFORMS.map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={() => handleArrayToggle('platforms', platform)}
                          className="cursor-pointer bg-foreground/50"
                        />
                        <Label htmlFor={platform} className="text-sm">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label><LocalizedText>Supported Networks</LocalizedText></Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {NETWORKS.map(network => (
                      <div key={network} className="flex items-center space-x-2">
                        <Checkbox
                          id={network}
                          checked={formData.supported_networks.includes(network)}
                          onCheckedChange={() => handleArrayToggle('supported_networks', network)}
                          className="cursor-pointer bg-foreground/50"
                        />
                        <Label htmlFor={network} className="text-sm">
                          {network}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="license"><LocalizedText>License</LocalizedText></Label>
                  <Select value={formData.license} onValueChange={(value) => handleInputChange('license', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={"Select license"} />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSES.map(license => (
                        <SelectItem key={license} value={license}>
                          {license}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Monetization */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Monetization</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pricing_model"><LocalizedText>Pricing Model</LocalizedText></Label>
                  <Select value={formData.pricing_model} onValueChange={(value) => handleInputChange('pricing_model', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={"Select pricing model"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free"><LocalizedText>Free</LocalizedText></SelectItem>
                      <SelectItem value="paid"><LocalizedText>Paid</LocalizedText></SelectItem>
                      <SelectItem value="freemium"><LocalizedText>Freemium</LocalizedText></SelectItem>
                      <SelectItem value="donation"><LocalizedText>Donation-based</LocalizedText></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.pricing_model === "paid" && (
                  <div>
                    <Label htmlFor="price_usd"><LocalizedText>Price (USD)</LocalizedText></Label>
                    <Input
                      id="price_usd"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_usd}
                      onChange={(e) => handleInputChange('price_usd', parseFloat(e.target.value))}
                      placeholder="9.99"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accepts_lightning"
                    checked={formData.accepts_lightning}
                    onCheckedChange={(checked) => handleInputChange('accepts_lightning', checked)}
                    className="cursor-pointer bg-foreground/50"
                  />
                  <Label htmlFor="accepts_lightning" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <LocalizedText>Accepts Lightning Network payments
                  </LocalizedText></Label>
                </div>

                {formData.accepts_lightning && (
                  <div>
                    <Label htmlFor="lightning_address"><LocalizedText>Lightning Address</LocalizedText></Label>
                    <Input
                      id="lightning_address"
                      value={formData.lightning_address}
                      onChange={(e) => handleInputChange('lightning_address', e.target.value)}
                      placeholder="you@getalby.com"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Publisher Information */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Publisher Information</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publisher_name"><LocalizedText>Your Name / Organization</LocalizedText></Label>
                    <Input
                      id="publisher_name"
                      value={formData.publisher_name}
                      onChange={(e) => handleInputChange('publisher_name', e.target.value)}
                      placeholder={"Your Name or Company"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publisher_email"><LocalizedText>Contact Email</LocalizedText></Label>
                    <Input
                      id="publisher_email"
                      type="email"
                      value={formData.publisher_email}
                      onChange={(e) => handleInputChange('publisher_email', e.target.value)}
                      placeholder={"contact@yourapp.com"}
                    />
                  </div>
                </div>

                <div>
                  <Label><LocalizedText>Connected Wallet Address</LocalizedText></Label>
                  <Input
                    value={currentAddress}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    <LocalizedText>This address will be used to verify ownership of the app.
                  </LocalizedText></p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy and Legal */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>Privacy and Legal</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="open_source"
                    checked={formData.open_source}
                    onCheckedChange={(checked) => handleInputChange('open_source', checked)}
                    className="cursor-pointer bg-foreground/50"
                  />
                  <Label htmlFor="open_source">
                    <LocalizedText>This is an open-source project
                  </LocalizedText></Label>
                </div>

                <div>
                  <Label htmlFor="data_collection_summary"><LocalizedText>Data Collection Summary</LocalizedText></Label>
                  <Textarea
                    id="data_collection_summary"
                    value={formData.data_collection_summary}
                    onChange={(e) => handleInputChange('data_collection_summary', e.target.value)}
                    placeholder={"Describe what data your app collects and how it's used..."}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="privacy_policy_url"><LocalizedText>Privacy Policy URL</LocalizedText></Label>
                    <Input
                      id="privacy_policy_url"
                      type="url"
                      value={formData.privacy_policy_url}
                      onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                      placeholder={"https://yourapp.com/privacy"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms_of_service_url"><LocalizedText>Terms of Service URL</LocalizedText></Label>
                    <Input
                      id="terms_of_service_url"
                      type="url"
                      value={formData.terms_of_service_url}
                      onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                      placeholder={"https://yourapp.com/terms"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* On-chain Submission */}
            <Card>
              <CardHeader>
                <CardTitle><LocalizedText>On-chain Submission</LocalizedText></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="publish-to-bar"
                        checked={BAR_INSCRIPTIONS_UNDER_CONSTRUCTION ? false : publishToBar}
                        onCheckedChange={(checked) => setPublishToBar(Boolean(checked))}
                        disabled={BAR_INSCRIPTIONS_UNDER_CONSTRUCTION}
                        className="mt-1 cursor-not-allowed bg-foreground/50"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor="publish-to-bar" className="font-semibold">
                            <LocalizedText>Bitcoin L1 BAR inscription
                          </LocalizedText></Label>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-normal">
                            <LocalizedText>Under construction
                          </LocalizedText></Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <LocalizedText>Inscribes a brc-app JSON record with your app metadata onto Bitcoin Layer 1 through Ordinals.
                          The publisher owner is a Taproot address, updates create new inscriptions, and miner fees are paid in BTC.
                        </LocalizedText></p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          <LocalizedText>This path is visible for review but disabled until the BAR inscription relay and fee funding flow are ready.
                        </LocalizedText></p>
                      </div>
                    </div>

                    {publishToBar && !BAR_INSCRIPTIONS_UNDER_CONSTRUCTION && (
                      <div className="space-y-3 pl-7">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="bar-signing-method"><LocalizedText>Signing Method</LocalizedText></Label>
                            <Select value={barSigningMethod} onValueChange={(value) => setBarSigningMethod(value as BarSigningMethod)}>
                              <SelectTrigger id="bar-signing-method">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="extension"><LocalizedText>Extension wallet</LocalizedText></SelectItem>
                                <SelectItem value="passkey"><LocalizedText>Passkey relay</LocalizedText></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="bar-fee-rate"><LocalizedText>Fee Rate (sat/vB)</LocalizedText></Label>
                            <Input
                              id="bar-fee-rate"
                              type="number"
                              min="1"
                              step="1"
                              value={barFeeRate}
                              onChange={(e) => setBarFeeRate(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="bar-service-fee"><LocalizedText>Optional App Fee (sats)</LocalizedText></Label>
                          <Input
                            id="bar-service-fee"
                            type="number"
                            min="0"
                            step="1"
                            value={barServiceFee}
                            onChange={(e) => setBarServiceFee(Number(e.target.value))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <LocalizedText>Estimated BAR payload: </LocalizedText>{barPreviewEstimate.payloadBytes} <LocalizedText>bytes, about</LocalizedText>{' '}
                          {barPreviewEstimate.estimatedTotalSats.toLocaleString()} <LocalizedText>sats total at</LocalizedText>{' '}
                          {barPreviewEstimate.feeRate} <LocalizedText>sat/vB.
                        </LocalizedText></p>
                        {barSigningMethod === "passkey" && (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            <LocalizedText>Passkey signing authorizes a server-side inscription relay. Configure BAR_INSCRIPTION_ENDPOINT
                            for this path; extension wallets can inscribe directly.
                          </LocalizedText></p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="publish-to-clarity"
                        checked={publishToClarity}
                        onCheckedChange={(checked) => setPublishToClarity(Boolean(checked))}
                        className="mt-1 cursor-pointer bg-foreground/50"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="publish-to-clarity" className="font-semibold">
                          <LocalizedText>Clarity contract on Stacks
                        </LocalizedText></Label>
                        <p className="text-xs text-muted-foreground">
                          <LocalizedText>Calls the BBOX registry contract on Stacks with the IPFS metadata CID. The contract keeps compact
                          app state, charges the listing fee in sBTC, and uses STX for transaction gas.
                        </LocalizedText></p>
                      </div>
                    </div>
                    {publishToClarity && (
                      <p className="pl-7 text-xs text-muted-foreground">
                        <LocalizedText>Listing fee: </LocalizedText>{listingFeeDisplay}{isFallbackListingFee ? " estimate" : ''}<LocalizedText>. Network: </LocalizedText>{network || "loading"}.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission Signature */}
            <div className="rounded-lg border border-dashed p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <LocalizedText>Submission Signature
              </LocalizedText></div>
              <p className="text-xs text-muted-foreground">
                <LocalizedText>Sign a short message with your connected wallet before publishing. This verifies that the submission
                originated from </LocalizedText>{currentAddress ? "your wallet address." : "a verified wallet once connected."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSignSubmission}
                  disabled={!currentAddress || signatureStatus === "signing" || isSubmitting}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  {signatureStatus === "signing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <LocalizedText>Requesting signature...
                    </LocalizedText></>
                  ) : signatureStatus === "signed" ? (
                    "Re-sign submission"
                  ) : (
                    "Sign submission"
                  )}
                </Button>
                <div className="text-xs flex-1">
                  {signatureStatus === "signed" && signatureResult ? (
                    <p className="text-green-600">
                      <LocalizedText>Signed with </LocalizedText>{signatureResult.walletType} • {signatureResult.signature.slice(0, 10)}…
                    </p>
                  ) : signatureStatus === 'error' && signatureError ? (
                    <p className="text-red-500">{signatureError}</p>
                  ) : signatureStatus === "signing" ? (
                    <p className="text-muted-foreground"><LocalizedText>Awaiting wallet confirmation…</LocalizedText></p>
                  ) : (
                    <p className="text-muted-foreground"><LocalizedText>Status: Not signed</LocalizedText></p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  APP_SUBMISSIONS_UNDER_CONSTRUCTION ||
                  isSubmitting ||
                  !currentAddress ||
                  iconUploadStatus === "uploading" ||
                  signatureStatus === "signing"
                }
              >
                {APP_SUBMISSIONS_UNDER_CONSTRUCTION ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <LocalizedText>Under Construction
                  </LocalizedText></>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {submitStatus === "metadata" && "Uploading metadata..."}
                    {submitStatus === "bar" && "Inscribing BAR..."}
                    {submitStatus === "contract" && "Awaiting wallet..."}
                    {submitStatus === "uploading" && "Submitting..."}
                    {submitStatus === "email" && "Sending emails..."}
                    {submitStatus === 'success' && "Success!"}
                    {(submitStatus === 'idle' || submitStatus === 'error') && "Publishing..."}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    <LocalizedText>Submit Project for Review
                  </LocalizedText></>
                )}
              </Button>
              {APP_SUBMISSIONS_UNDER_CONSTRUCTION && (
                <p className="text-center text-xs text-amber-700 dark:text-amber-300">
                  <LocalizedText>App submissions are temporarily disabled while the on-chain publishing flow is being finished.
                </LocalizedText></p>
              )}
            </div>

          {/* Network Warning */}
          {network && network !== 'mainnet' && (
            <Card className="mb-3 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
              <CardContent className="px-2">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-yellow-600" />
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-200 font-semibold">
                      <LocalizedText>Testing Mode: </LocalizedText>{network.charAt(0).toUpperCase() + network.slice(1)}
                    </span>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      <LocalizedText>You&apos;re submitting to the test network. This won&apos;t appear on mainnet.
                    </LocalizedText></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </form>
        </div>
      </div>
    </div>
  );
}
