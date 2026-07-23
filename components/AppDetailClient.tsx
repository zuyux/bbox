'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IPFSImage from '@/components/IPFSImage';
import ReviewModal from '@/components/ReviewModal';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useWallet } from '@/components/WalletProvider';
import { signStacksMessage } from '@/lib/commentSigning';
import { ADMIN_ADDRESS } from '@/lib/admin';
import {
  Star,
  ArrowLeft,
  ArrowRight,
  Github,
  Loader2,
  X
} from 'lucide-react';
import type { BitcoinApp } from '@/lib/appsUtils';

interface AppDetailClientProps {
  app: BitcoinApp;
  relatedApps: BitcoinApp[];
}

const CATEGORY_OPTIONS = [
  'Wallet',
  'Lightning',
  'DeFi',
  'Infrastructure',
  'Explorer',
  'Identity',
  'Social',
  'Nostr',
  'AI',
  'Developer',
  'Creator',
  'Gaming',
  'Other',
];

const PLATFORM_OPTIONS = ['Desktop', 'Android', 'iOS', 'Browser', 'Extension'];

export default function AppDetailClient({ app, relatedApps }: AppDetailClientProps) {
  const currentAddress = useCurrentAddress();
  const { walletType } = useWallet();
  const isAdmin = currentAddress === ADMIN_ADDRESS;
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [claimMessage, setClaimMessage] = useState('');
  const [editStatus, setEditStatus] = useState<'idle' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [editMessage, setEditMessage] = useState('');
  const [appState, setAppState] = useState(app);
  const [claimData, setClaimData] = useState({
    name: '',
    email: '',
    walletAddress: currentAddress || '',
    proof: '',
  });
  const [editData, setEditData] = useState({
    name: app.name,
    description: app.description,
    category: app.category,
    link: app.link,
    githubUrl: app.githubUrl,
    imgCID: app.imgCID,
    tags: app.tags.join(', '),
    platforms: app.platforms,
    documentationUrl: app.documentationUrl,
    publisherName: app.publisherName,
    publisherEmail: app.publisherEmail,
  });

  const displayApp = appState;
  const displayRating = displayApp.rating.toFixed(1);
  const reviewCountLabel = `${displayApp.reviewCount} review${displayApp.reviewCount === 1 ? '' : 's'}`;

  const handleRatingChange = useCallback((ratingSummary: { rating: number; reviewCount: number }) => {
    setAppState((prev) => ({
      ...prev,
      rating: ratingSummary.rating,
      reviewCount: ratingSummary.reviewCount,
    }));
  }, []);

  const updateField = (field: keyof typeof editData, value: string) => {
    setEditStatus('idle');
    setEditMessage('');
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const updateClaimField = (field: keyof typeof claimData, value: string) => {
    setClaimStatus('idle');
    setClaimMessage('');
    setClaimData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlatform = (platform: string, checked: boolean) => {
    setEditStatus('idle');
    setEditMessage('');
    setEditData((prev) => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, platform]
        : prev.platforms.filter((option) => option !== platform),
    }));
  };

  const closeOwnershipModal = () => {
    setShowOwnershipModal(false);
    setClaimStatus('idle');
    setClaimMessage('');
  };

  const buildEditSignaturePayload = () =>
    JSON.stringify({
      action: 'bbox_admin_app_edit',
      address: currentAddress,
      timestamp: new Date().toISOString(),
      appId: displayApp.id,
      app: {
        name: editData.name,
        description: editData.description,
        category: editData.category,
        link: editData.link,
        githubUrl: editData.githubUrl,
        imgCID: editData.imgCID,
        tags: editData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        platforms: editData.platforms,
        documentationUrl: editData.documentationUrl,
        publisherName: editData.publisherName,
        publisherEmail: editData.publisherEmail,
      },
    });

  const requestAdminSignature = async () => {
    if (!walletType) {
      throw new Error('No connected Stacks wallet found. Please connect Leather, Hiro, or Xverse.');
    }
    const payload = buildEditSignaturePayload();
    return await signStacksMessage(payload, walletType);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      setEditStatus('error');
      setEditMessage('Only the admin can save app changes.');
      return;
    }

    setEditStatus('signing');
    try {
      const signatureResult = await requestAdminSignature();
      if (!signatureResult.signature) {
        throw new Error('Admin signature was not returned by the wallet.');
      }

      setEditStatus('submitting');
      const response = await fetch(`/api/update-app/${displayApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name.trim(),
          description: editData.description.trim(),
          category: editData.category.trim(),
          link: editData.link.trim(),
          github_url: editData.githubUrl.trim(),
          imgcid: editData.imgCID.trim(),
          tags: editData.tags,
          platforms: editData.platforms,
          documentation_url: editData.documentationUrl.trim(),
          publisher_name: editData.publisherName.trim(),
          publisher_email: editData.publisherEmail.trim(),
          publisher_address: currentAddress,
          signature: signatureResult.signature,
          signature_payload: signatureResult.signedPayload,
          signature_wallet_type: signatureResult.walletType,
          signature_public_key: signatureResult.publicKey,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update app details.');
      }

      setAppState((prev) => ({
        ...prev,
        name: result.app.name ?? prev.name,
        description: result.app.description ?? prev.description,
        category: result.app.category ?? prev.category,
        link: result.app.link ?? prev.link,
        githubUrl: result.app.github_url ?? prev.githubUrl,
        imgCID: result.app.imgcid ?? prev.imgCID,
        tags: Array.isArray(result.app.tags) ? result.app.tags.map(String) : prev.tags,
        platforms: Array.isArray(result.app.platforms) ? result.app.platforms.map(String) : prev.platforms,
        documentationUrl: result.app.documentation_url ?? prev.documentationUrl,
        publisherName: result.app.publisher_name ?? prev.publisherName,
        publisherEmail: result.app.publisher_email ?? prev.publisherEmail,
      }));
      setEditStatus('success');
      setEditMessage('App details updated successfully.');
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save app changes.';
      setEditStatus('error');
      setEditMessage(message);
    }
  };

  const handleOwnershipClaim = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!claimData.name.trim() || !claimData.email.trim() || !claimData.walletAddress.trim() || !claimData.proof.trim()) {
      setClaimStatus('error');
      setClaimMessage('Please fill in every field before sending your claim.');
      return;
    }

    setClaimStatus('submitting');
    setClaimMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ownership-claim',
          data: {
            appId: displayApp.id,
            appName: displayApp.name,
            appUrl: typeof window !== 'undefined' ? window.location.href : '',
            websiteUrl: displayApp.link,
            claimantName: claimData.name.trim(),
            claimantEmail: claimData.email.trim(),
            walletAddress: claimData.walletAddress.trim(),
            proof: claimData.proof.trim(),
          },
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to send ownership claim.');
      }

      setClaimStatus('success');
      setClaimMessage('Ownership claim sent. We will review the details and follow up by email.');
      setClaimData({
        name: '',
        email: '',
        walletAddress: currentAddress || '',
        proof: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send ownership claim.';
      setClaimStatus('error');
      setClaimMessage(message);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Back Button */}
        <Button variant="link" className="mb-4" asChild>
          <Link href="/apps">
            <ArrowLeft className="-ml-3 mr-2 h-4 w-4" />
          </Link>
        </Button>

        {/* App Header - Compact Design */}
        <div className="mb-6">
          <div className="flex gap-4 items-start mb-4">
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-transparent rounded-2xl sm:rounded-3xl flex items-center justify-center text-foreground text-2xl sm:text-3xl font-bold overflow-hidden">
                {displayApp.imgCID ? (
                  <IPFSImage
                    src={displayApp.imgCID}
                    alt={`${displayApp.name} logo`}
                    className="object-contain"
                    fill
                    sizes="96px"
                  />
                ) : (
                  displayApp.name.charAt(0)
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold break-words">{displayApp.name}</h1>
                {displayApp.verified && (
                  <Badge className="bg-transparent text-foreground hover:bg-green-600 flex-shrink-0 text-xs">
                    <Image src="/verified.svg" height={21} width={21} alt="Verified" />
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-2 break-words line-clamp-2">
                {displayApp.description}
              </p>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <span className="break-words">{displayApp.link.replace(/^https?:\/\//, '')}</span>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{displayRating}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {displayApp.category}
                </Badge>
                <Button
                  className="h-6 px-4 py-1 bg-green-500 hover:bg-green-600 text-white text-xs"
                  asChild
                >
                  <a href={displayApp.link} target="_blank" rel="noopener noreferrer" className="hover:underline-offset-3">
                    VISIT
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {displayApp.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {displayApp.platforms.map((platform) => (
              <Badge key={`platform-${platform}`} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3">Ratings & Reviews</h3>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-5xl font-bold">{displayRating}</div>
            <div>
              <div className="flex items-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= Math.floor(displayApp.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Average from {reviewCountLabel}</p>
            </div>
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600"
            onClick={() => setShowReviewModal(true)}
          >
            See all reviews / Add your review
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3">Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Category</span>
                <div className="font-medium">{displayApp.category}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Rating</span>
                <div className="font-medium">{displayRating} / 5.0 ({reviewCountLabel})</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Platforms</span>
                <div className="font-medium">
                  {displayApp.platforms.length > 0 ? displayApp.platforms.join(', ') : 'Not specified'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Verified</span>
                <div className="font-medium">{displayApp.verified ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <span className="text-muted-foreground text-xs">Website</span>
                <div className="font-medium text-sm break-all">
                  <a
                    href={displayApp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    {displayApp.link}
                  </a>
                </div>
              </div>
              {displayApp.githubUrl && (
                <div>
                  <span className="text-muted-foreground text-xs">Source Code</span>
                  <div className="font-medium text-sm break-all">
                    <a
                      href={displayApp.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <Github className="h-4 w-4 flex-shrink-0" />
                      {displayApp.githubUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedApps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">More {displayApp.category} Apps</h3>
              <Button variant="link" asChild className="text-sm text-blue-500 hover:text-blue-600 p-0 h-auto">
                <Link href="/apps">
                  See All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedApps.map(relatedApp => (
                <Link key={relatedApp.id} href={`/apps/${relatedApp.id}`} className="group">
                  <div className="h-full rounded-2xl border border-border/50 p-4 hover:border-border transition-colors">
                    <div className="relative mb-3 aspect-square rounded-2xl bg-transparent flex items-center justify-center text-foreground text-2xl font-bold overflow-hidden">
                      {relatedApp.imgCID ? (
                        <IPFSImage
                          src={relatedApp.imgCID}
                          alt={`${relatedApp.name} logo`}
                          className="object-contain"
                          fill
                          sizes="96px"
                        />
                      ) : (
                        relatedApp.name.charAt(0)
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-0.5 break-words line-clamp-1">{relatedApp.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{relatedApp.category}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="font-medium">{relatedApp.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end text-right gap-x-4 gap-y-2 mt-8 text-xs">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-white/30 hover:text-white/70"
                onClick={() => {
                  setClaimData((prev) => ({
                    ...prev,
                    walletAddress: prev.walletAddress || currentAddress || '',
                  }));
                  setShowOwnershipModal(true);
                }}
              >
                Claim ownership
              </Button>
              <Button
                variant="link"
                asChild
                className="h-auto p-0 text-white/30 hover:text-white/70"
              >
                <a href="https://github.com/zuyux/bbox/issues" target="_blank" rel="noopener noreferrer">
                  Report Issue
                </a>
              </Button>
            </div>

        {isAdmin && (
          <div className="mt-10 rounded-2xl border border-border/50 bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-semibold">Admin edit</h3>
                <p className="text-sm text-muted-foreground">
                  Only the admin wallet can update these app page fields.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  setEditStatus('idle');
                  setEditMessage('');
                }}
              >
                {isEditing ? 'Close editor' : 'Edit details'}
              </Button>
            </div>

            {isEditing && (
              <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-border/50 bg-background p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editData.name}
                      onChange={(event) => updateField('name', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editData.category}
                      onValueChange={(value) => updateField('category', value)}
                    >
                      <SelectTrigger id="edit-category" className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editData.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-link">Website URL</Label>
                    <Input
                      id="edit-link"
                      value={editData.link}
                      onChange={(event) => updateField('link', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-github-url">GitHub Repository</Label>
                    <Input
                      id="edit-github-url"
                      value={editData.githubUrl}
                      onChange={(event) => updateField('githubUrl', event.target.value)}
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-documentation-url">Documentation URL</Label>
                  <Input
                    id="edit-documentation-url"
                    value={editData.documentationUrl}
                    onChange={(event) => updateField('documentationUrl', event.target.value)}
                    placeholder="https://docs.example.com"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-publisher-name">Publisher Name</Label>
                    <Input
                      id="edit-publisher-name"
                      value={editData.publisherName}
                      onChange={(event) => updateField('publisherName', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-publisher-email">Publisher Email</Label>
                    <Input
                      id="edit-publisher-email"
                      type="email"
                      value={editData.publisherEmail}
                      onChange={(event) => updateField('publisherEmail', event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-imgcid">Image CID</Label>
                  <Input
                    id="edit-imgcid"
                    value={editData.imgCID}
                    onChange={(event) => updateField('imgCID', event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tags">Tags</Label>
                  <Input
                    id="edit-tags"
                    value={editData.tags}
                    onChange={(event) => updateField('tags', event.target.value)}
                    placeholder="Bitcoin, Wallet, Lightning"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate tags with commas.
                  </p>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Platforms</legend>
                  <div className="flex flex-wrap gap-4">
                    {PLATFORM_OPTIONS.map((platform) => (
                      <label key={platform} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={editData.platforms.includes(platform)}
                          onCheckedChange={(checked) => updatePlatform(platform, checked === true)}
                        />
                        {platform}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={editStatus === 'signing' || editStatus === 'submitting'}>
                    {editStatus === 'signing'
                      ? 'Signing...'
                      : editStatus === 'submitting'
                      ? 'Saving...'
                      : 'Save changes'}
                  </Button>
                  {editStatus === 'success' && (
                    <p className="text-sm text-green-600">{editMessage}</p>
                  )}
                  {editStatus === 'error' && (
                    <p className="text-sm text-red-600">{editMessage}</p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {showReviewModal && (
        <ReviewModal
          open={showReviewModal}
          appId={displayApp.id}
          appName={displayApp.name}
          onRatingChange={handleRatingChange}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {showOwnershipModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
              <div>
                <h3 className="text-lg font-semibold">Claim ownership</h3>
                <p className="text-sm text-muted-foreground">Send verification details for {displayApp.name}.</p>
              </div>
              <button
                type="button"
                onClick={closeOwnershipModal}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                aria-label="Close ownership claim"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOwnershipClaim} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="claim-name" className='hidden'>Name</Label>
                  <Input
                    id="claim-name"
                    value={claimData.name}
                    onChange={(event) => updateClaimField('name', event.target.value)}
                    autoComplete="name"
                    placeholder='Name'
                  />
                </div>
                <div>
                  <Label htmlFor="claim-email" className='hidden'>Email</Label>
                  <Input
                    id="claim-email"
                    type="email"
                    value={claimData.email}
                    onChange={(event) => updateClaimField('email', event.target.value)}
                    autoComplete="email"
                    placeholder='Email'
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="claim-wallet" className='pl-1 mb-2'>Wallet or publisher address</Label>
                <Input
                  id="claim-wallet"
                  value={claimData.walletAddress}
                  onChange={(event) => updateClaimField('walletAddress', event.target.value)}
                  placeholder="Stacks, Bitcoin, or relevant publisher address"
                />
              </div>

              <div>
                <Label htmlFor="claim-proof">Ownership proof</Label>
                <Textarea
                  id="claim-proof"
                  value={claimData.proof}
                  onChange={(event) => updateClaimField('proof', event.target.value)}
                  placeholder="Share repo links, domain email, signed message, listing references, or any details that prove ownership."
                  rows={5}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={claimStatus === 'submitting'}>
                  {claimStatus === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {claimStatus === 'submitting' ? 'Sending...' : 'Send claim'}
                </Button>
                {claimMessage && (
                  <p className={`text-sm ${claimStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {claimMessage}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
