'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import GetInModal from '@/components/GetInModal';
import IPFSImage from '@/components/IPFSImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useWallet } from '@/components/WalletProvider';
import { signStacksMessage } from '@/lib/commentSigning';
import { ADMIN_ADDRESS } from '@/lib/admin';
import { AlertTriangle, ArrowLeft, CheckCircle, ExternalLink, Upload } from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Wallet',
  'Lightning',
  'DeFi',
  'Infrastructure',
  'Explorer',
  'Identity',
  'Social',
  'Developer',
  'Creator',
  'Gaming',
  'Other',
];

const initialFormState = {
  name: '',
  description: '',
  category: '',
  website_url: '',
  github_url: '',
  documentation_url: '',
  publisher_name: '',
  publisher_email: '',
  tags: '',
  icon_cid: '',
};

export default function AdminSubmitPage() {
  const currentAddress = useCurrentAddress();
  const { walletType } = useWallet();
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [signatureStatus, setSignatureStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle');
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [iconUploadStatus, setIconUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [iconUploadMessage, setIconUploadMessage] = useState('');
  const [iconPreviewUrl, setIconPreviewUrl] = useState('');

  useEffect(() => {
    setShowGetInModal(!currentAddress);
  }, [currentAddress]);

  const isAuthorizedAdmin = currentAddress === ADMIN_ADDRESS;

  const tagList = useMemo(
    () => formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    [formData.tags]
  );

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setSignatureStatus('idle');
    setStatus('idle');
    setStatusMessage('');
    setErrors([]);
    if (field === 'icon_cid') {
      setIconUploadStatus(value.trim() ? 'success' : 'idle');
      setIconUploadMessage(value.trim() ? 'CID ready for submission.' : '');
      setIconPreviewUrl('');
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setErrors([]);
    setStatus('idle');
    setStatusMessage('');
    setSignatureStatus('idle');

    if (!currentAddress) {
      setErrors(['Connect a wallet before uploading an image.']);
      return;
    }

    if (!isAuthorizedAdmin) {
      setErrors([`You must be signed in as the admin address ${ADMIN_ADDRESS}.`]);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setIconUploadStatus('error');
      setIconUploadMessage('Upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setIconUploadStatus('error');
      setIconUploadMessage('Image must be 10MB or smaller.');
      return;
    }

    try {
      setIconUploadStatus('uploading');
      setIconUploadMessage('Uploading image to Pinata...');

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('address', currentAddress);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Image upload failed.');
      }

      setFormData(prev => ({ ...prev, icon_cid: result.cid }));
      setIconPreviewUrl(result.url || '');
      setIconUploadStatus('success');
      setIconUploadMessage(`Uploaded to IPFS: ${result.cid}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error uploading image.';
      setIconUploadStatus('error');
      setIconUploadMessage(message);
    }
  };

  const validateForm = () => {
    const validationErrors: string[] = [];
    if (!formData.name.trim()) validationErrors.push('App name is required.');
    if (!formData.description.trim()) validationErrors.push('Description is required.');
    if (!formData.category.trim()) validationErrors.push('Category is required.');
    if (!formData.website_url.trim()) validationErrors.push('Website URL is required.');
    if (!formData.publisher_name.trim()) validationErrors.push('Publisher name is required.');
    if (!formData.publisher_email.trim()) validationErrors.push('Publisher email is required.');
    return validationErrors;
  };

  const buildSignaturePayload = () => {
    return JSON.stringify({
      action: 'bbox_admin_app_submission',
      address: currentAddress,
      timestamp: new Date().toISOString(),
      app: {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        website_url: formData.website_url,
        github_url: formData.github_url,
        documentation_url: formData.documentation_url,
        publisher_name: formData.publisher_name,
        publisher_email: formData.publisher_email,
        tags: tagList,
        icon_cid: formData.icon_cid,
      },
    });
  };

  const requestSignature = async () => {
    setSignatureStatus('signing');
    const payload = buildSignaturePayload();
    const signature = await signStacksMessage(payload, walletType);
    setSignatureStatus('signed');
    return signature;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);
    setStatusMessage('');

    if (!currentAddress) {
      setErrors(['Connect a wallet to continue.']);
      return;
    }

    if (!isAuthorizedAdmin) {
      setErrors([`You must be signed in as the admin address ${ADMIN_ADDRESS}.`]);
      return;
    }

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setStatus('signing');
      const submissionSignature = await requestSignature();

      if (!submissionSignature?.signature) {
        throw new Error('Signature was not returned from wallet.');
      }

      setStatus('submitting');
      const response = await fetch('/api/submit-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category.trim(),
          website_url: formData.website_url.trim(),
          github_url: formData.github_url.trim(),
          documentation_url: formData.documentation_url.trim(),
          icon_cid: formData.icon_cid.trim(),
          publisher_name: formData.publisher_name.trim(),
          publisher_email: formData.publisher_email.trim(),
          publisher_address: currentAddress,
          tags: tagList,
          signature: submissionSignature.signature,
          signature_payload: submissionSignature.signedPayload,
          signature_wallet_type: submissionSignature.walletType,
          signature_public_key: submissionSignature.publicKey,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Submission failed.');
      }

      setStatus('success');
      setStatusMessage('App submission successful. The app is now pending review.');
      setFormData(initialFormState);
      setSignatureStatus('idle');
      setIconUploadStatus('idle');
      setIconUploadMessage('');
      setIconPreviewUrl('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error submitting app.';
      setStatus('error');
      setStatusMessage(message);
      setSignatureStatus('error');
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin App Submission</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Only the authorized admin address can submit a new app here.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/apps">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Apps
            </Link>
          </Button>
        </div>

        {!currentAddress && (
          <Card className="mb-6 border">
            <CardHeader>
              <CardTitle>Connect a wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Connect a Stacks-compatible wallet and make sure the connected address matches the admin address.
              </p>
              <Button onClick={() => setShowGetInModal(true)}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {currentAddress && !isAuthorizedAdmin && (
          <Card className="mb-6 border border-destructive/50 bg-transparent">
            <CardHeader>
              <CardTitle className="text-destructive">Unauthorized Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">
                Your connected wallet address is not authorized for admin submission.
              </p>
              <p className="text-sm text-muted-foreground mt-2 break-words">
                Connected: <Badge variant="outline">{currentAddress}</Badge>
              </p>
              <p className="text-sm text-muted-foreground mt-2 break-words">
                Required: <Badge variant="secondary">{ADMIN_ADDRESS}</Badge>
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg">App details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className='mb-2'>App Name</Label>
                  <Input
                    id="name"
                    name="bbox-admin-app-name"
                    autoComplete="off"
                    value={formData.name}
                    onChange={event => handleFieldChange('name', event.target.value)}
                    placeholder="Example App"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className='mb-2'>Category</Label>
                  <Select
                    onValueChange={value => handleFieldChange('category', value)}
                    value={formData.category}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className='mb-2'>Description</Label>
                <Textarea
                  id="description"
                  name="bbox-admin-app-description"
                  autoComplete="off"
                  value={formData.description}
                  onChange={event => handleFieldChange('description', event.target.value)}
                  placeholder="Describe the app in a few sentences"
                  rows={5}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="website_url" className='mb-2'>Website URL</Label>
                  <Input
                    id="website_url"
                    name="bbox-admin-website-url"
                    autoComplete="off"
                    value={formData.website_url}
                    onChange={event => handleFieldChange('website_url', event.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="github_url" className='mb-2'>GitHub URL</Label>
                  <Input
                    id="github_url"
                    name="bbox-admin-github-url"
                    autoComplete="off"
                    value={formData.github_url}
                    onChange={event => handleFieldChange('github_url', event.target.value)}
                    placeholder="https://github.com/your-repo"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="documentation_url" className='mb-2'>Documentation URL</Label>
                <Input
                  id="documentation_url"
                  name="bbox-admin-documentation-url"
                  autoComplete="off"
                  value={formData.documentation_url}
                  onChange={event => handleFieldChange('documentation_url', event.target.value)}
                  placeholder="https://docs.example.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="publisher_name" className='mb-2'>Publisher Name</Label>
                  <Input
                    id="publisher_name"
                    name="bbox-admin-publisher-name"
                    autoComplete="off"
                    value={formData.publisher_name}
                    onChange={event => handleFieldChange('publisher_name', event.target.value)}
                    placeholder="Publisher or team name"
                  />
                </div>
                <div>
                  <Label htmlFor="publisher_email" className='mb-2'>Publisher Email</Label>
                  <Input
                    id="publisher_email"
                    name="bbox-admin-publisher-email"
                    type="email"
                    autoComplete="off"
                    value={formData.publisher_email}
                    onChange={event => handleFieldChange('publisher_email', event.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tags" className='mb-2'>Tags</Label>
                  <Input
                    id="tags"
                    name="bbox-admin-tags"
                    autoComplete="off"
                    value={formData.tags}
                    onChange={event => handleFieldChange('tags', event.target.value)}
                    placeholder="wallet, lightning, funding"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate tags with commas.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="icon_file" className='mb-2'>Upload Icon Image</Label>
                    <div className="flex gap-2">
                      <Input
                        id="icon_file"
                        ref={iconFileInputRef}
                        name="bbox-admin-icon-file"
                        type="file"
                        autoComplete="off"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleIconUpload}
                        disabled={!currentAddress || !isAuthorizedAdmin || iconUploadStatus === 'uploading'}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => iconFileInputRef.current?.click()}
                        disabled={!currentAddress || !isAuthorizedAdmin || iconUploadStatus === 'uploading'}
                        aria-label="Upload image to IPFS"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {iconUploadMessage && (
                      <p
                        className={`text-xs mt-1 break-all ${
                          iconUploadStatus === 'error' ? 'text-red-700' : 'text-muted-foreground'
                        }`}
                      >
                        {iconUploadMessage}
                      </p>
                    )}
                    {iconPreviewUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <IPFSImage
                          src={iconPreviewUrl}
                          alt={`${formData.name || 'App'} icon preview`}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-md border object-cover"
                        />
                        <a
                          href={iconPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          View IPFS image
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="icon_cid" className='mb-2'>Icon CID</Label>
                    <Input
                      id="icon_cid"
                      name="bbox-admin-icon-cid"
                      autoComplete="off"
                      value={formData.icon_cid}
                      onChange={event => handleFieldChange('icon_cid', event.target.value)}
                      placeholder="Qm..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Filled automatically after upload, or paste an existing IPFS CID.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(errors.length > 0 || (statusMessage && status !== 'success')) && (
            <Card className="border border-red-200 bg-red-50 text-red-800">
              <CardContent>
                {errors.length > 0 && (
                  <div className="space-y-2">
                    {errors.map(error => (
                      <div key={error} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}
                {statusMessage && status !== 'success' && !errors.length && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {status === 'success' && (
            <Card className="border border-green-200 bg-green-50 text-green-800">
              <CardContent className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Admin wallet: <Badge variant="secondary">{ADMIN_ADDRESS}</Badge>
              </p>
              {currentAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  Connected wallet: <Badge variant="outline">{currentAddress}</Badge>
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                !currentAddress || !isAuthorizedAdmin || status === 'signing' || status === 'submitting'
              }
            >
              {status === 'signing'
                ? 'Signing…'
                : status === 'submitting'
                ? 'Submitting…'
                : 'Sign & Submit App'}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Submission details</h2>
              <p className="text-sm text-muted-foreground">
                This form sends a signed admin submission payload and publishes the app to the review queue.
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Signature status</p>
              <p className="mt-1 font-semibold">{signatureStatus}</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Wallet source</p>
              <p className="mt-1 font-semibold">{walletType ?? 'auto-detect on sign'}</p>
            </div>
          </div>
        </div>
      </div>

      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
    </div>
  );
}
