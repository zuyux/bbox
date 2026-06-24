'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import GetInModal from '@/components/GetInModal';
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
import { AlertTriangle, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';

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
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [signatureStatus, setSignatureStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle');
  const [showGetInModal, setShowGetInModal] = useState(false);

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
    setFormData(prev => ({ ...prev, [field]: value }));
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error submitting app.';
      setStatus('error');
      setStatusMessage(message);
      setSignatureStatus('error');
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
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
          <Card className="mb-6 border border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">Unauthorized Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700">
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    value={formData.website_url}
                    onChange={event => handleFieldChange('website_url', event.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="github_url" className='mb-2'>GitHub URL</Label>
                  <Input
                    id="github_url"
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
                    value={formData.publisher_name}
                    onChange={event => handleFieldChange('publisher_name', event.target.value)}
                    placeholder="Publisher or team name"
                  />
                </div>
                <div>
                  <Label htmlFor="publisher_email" className='mb-2'>Publisher Email</Label>
                  <Input
                    id="publisher_email"
                    type="email"
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
                    value={formData.tags}
                    onChange={event => handleFieldChange('tags', event.target.value)}
                    placeholder="wallet, lightning, funding"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate tags with commas.
                  </p>
                </div>
                <div>
                  <Label htmlFor="icon_cid" className='mb-2'  >Icon CID</Label>
                  <Input
                    id="icon_cid"
                    value={formData.icon_cid}
                    onChange={event => handleFieldChange('icon_cid', event.target.value)}
                    placeholder="Qm..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {(errors.length > 0 || statusMessage) && (
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
                {statusMessage && !errors.length && (
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
