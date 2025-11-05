'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
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
  Info
} from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getListingFee, formatListingFee } from '@/lib/bbox-contract';
import { getPersistedNetwork } from '@/lib/network';

// Extend Window interface for Stacks wallet
declare global {
  interface Window {
    StacksProvider?: unknown;
  }
}

interface AppFormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
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
  'Creator'
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
  'Bitcoin',
  'Lightning Network',
  'Stacks',
  'Liquid Network',
  'RGB Protocol',
  'Ordinals',
  'Runes'
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'uploading' | 'signing' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [newTag, setNewTag] = useState('');
  const [listingFee, setListingFee] = useState<{ token: string; amount: bigint } | null>(null);
  const [network, setNetwork] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch listing fee and network on mount
  useEffect(() => {
    getListingFee().then(setListingFee);
    setNetwork(getPersistedNetwork());
  }, []);

  const [formData, setFormData] = useState<AppFormData>({
    name: 'BBOX',
    description: 'A decentralized app directory and funding layer for Bitcoin and its Layer-2 ecosystems (Stacks, Lightning, Runes, etc.). BBOX helps users discover, evaluate, and fund open-source Bitcoin applications through transparent milestones and smart contracts.',
    category: 'Infrastructure',
    tags: ['bitcoin', 'stacks', 'directory', 'funding', 'open-source', 'dao'],
    version: '0.2.0',
    website_url: 'https://bbox.app',
    github_url: 'https://github.com/zuyux/bbox',
    documentation_url: 'https://github.com/zuyux/bbox#readme',
    platforms: ['Web Application'],
    supported_networks: ['Bitcoin', 'Stacks', 'Lightning Network'],
    license: 'MIT',
    pricing_model: 'free',
    price_usd: 0,
    accepts_lightning: true,
    lightning_address: 'zuyux@getalby.com',
    privacy_policy_url: '',
    terms_of_service_url: '',
    data_collection_summary: 'BBOX collects minimal data: wallet addresses for authentication, IPFS metadata for app listings, and on-chain transaction data for funding milestones. No personal information is required.',
    open_source: true,
    publisher_name: 'Zuyux DAO',
    publisher_email: 'hello@zuyux.xyz'
  });

  const handleInputChange = (field: keyof AppFormData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field: 'platforms' | 'supported_networks' | 'tags', value: string) => {
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
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAddress) {
      setErrorMessage('Please connect your wallet to publish an app');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('uploading');
    setErrorMessage('');
    setValidationErrors([]);

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.category || !formData.publisher_email) {
        setValidationErrors(['Please fill in all required fields (Name, Description, Category, Email)']);
        throw new Error('Please fill in all required fields');
      }

      if (formData.description.length < 50) {
        setValidationErrors(['Description must be at least 50 characters long']);
        throw new Error('Description is too short');
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
        }),
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok || !submitData.success) {
        throw new Error(submitData.error || 'Failed to submit app to database');
      }

      console.log('✅ App submitted to database:', submitData.app.id);

      // Step 2: Send confirmation emails
      setSubmitStatus('signing'); // Reusing this status for "sending emails"
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
        console.log('✅ Confirmation emails sent');
      }

      // Step 3: Success! Redirect to success page
      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/submit/success');
      }, 1000);

    } catch (error: unknown) {
      console.error('❌ Error publishing app:', error);
      const message = error instanceof Error ? error.message : 'Failed to publish app. Please try again.';
      setErrorMessage(message);
      setSubmitStatus('error');
      setIsSubmitting(false);
    }
  };

  if (!currentAddress) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 pb-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Wallet Required</h2>
              <p className="text-muted-foreground mb-4">
                Please connect your Bitcoin or Stacks wallet to publish an app.
              </p>
              <Button onClick={() => router.push('/')} className="w-full">
                Go Back Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Publish Your Bitcoin App</h1>
            <p className="text-muted-foreground">
              Submit your application to the Bitcoin app directory. All submissions are reviewed before going live. You&apos;ll receive a confirmation email once submitted.
            </p>
          </div>

          {/* Status Messages */}
          {submitStatus === 'uploading' && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-800 dark:text-blue-200">
                    Submitting your app...
                  </span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 ml-7">
                  Your app data is being saved to the database
                </p>
              </CardContent>
            </Card>
          )}

          {submitStatus === 'signing' && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  <span className="text-orange-800 dark:text-orange-200">
                    Sending confirmation emails...
                  </span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-2 ml-7">
                  You&apos;ll receive a confirmation shortly
                </p>
              </CardContent>
            </Card>
          )}

          {submitStatus === 'success' && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    App submitted successfully!
                  </span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2 ml-7">
                  Redirecting to success page...
                </p>
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
                        <p className="font-semibold mb-2">💼 Install a Stacks Wallet:</p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <a 
                              href="https://leather.io/install-extension" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-red-900 dark:hover:text-red-100 font-semibold"
                            >
                              → Leather Wallet
                            </a>
                            <span className="ml-2">(Recommended)</span>
                          </div>
                          <div>
                            <a 
                              href="https://www.xverse.app/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-red-900 dark:hover:text-red-100 font-semibold"
                            >
                              → Xverse Wallet
                            </a>
                          </div>
                          <p className="mt-2 italic">After installing, refresh this page and connect your wallet.</p>
                        </div>
                      </div>
                    )}
                    {errorMessage.includes('Contract not') && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded">
                        <p className="font-semibold mb-2">📋 To deploy the contract:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Deploy bbox.clar to your Stacks testnet/mainnet</li>
                          <li>Update the contract address in <code className="bg-red-200 dark:bg-red-800 px-1 rounded">lib/bbox-contract.ts</code></li>
                          <li>Restart your development server</li>
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

          {/* Network Warning */}
          {network && network !== 'mainnet' && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-yellow-600" />
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-200 font-semibold">
                      Testing Mode: {network.charAt(0).toUpperCase() + network.slice(1)}
                    </span>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      You&apos;re submitting to the test network. This won&apos;t appear on mainnet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listing Fee Info Card */}
          {listingFee && submitStatus === 'idle' && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="font-semibold text-orange-900 dark:text-orange-100">
                      Listing Fee: {formatListingFee(listingFee.amount, listingFee.token)}
                    </div>
                    <div className="text-xs text-orange-800 dark:text-orange-200">
                      One-time fee to publish your app on-chain • Paid in {listingFee.token}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">App Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Bitcoin Wallet"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
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
                    <Label htmlFor="description">Description *</Label>
                    <span className={`text-xs ${formData.description.length < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formData.description.length} / 50 min
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="A secure, self-custodial Bitcoin wallet with Lightning Network support..."
                    rows={4}
                    required
                  />
                  {formData.description.length > 0 && formData.description.length < 50 && (
                    <p className="text-xs text-red-500 mt-1">
                      Description must be at least 50 characters
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
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
              </CardContent>
            </Card>

            {/* Links and Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Links and Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder="https://your-app.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="github_url">GitHub Repository</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github_url"
                      type="url"
                      value={formData.github_url}
                      onChange={(e) => handleInputChange('github_url', e.target.value)}
                      placeholder="https://github.com/username/repo"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="documentation_url">Documentation URL</Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="documentation_url"
                      type="url"
                      value={formData.documentation_url}
                      onChange={(e) => handleInputChange('documentation_url', e.target.value)}
                      placeholder="https://docs.your-app.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform and Network Support */}
            <Card>
              <CardHeader>
                <CardTitle>Platform and Network Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Supported Platforms</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {PLATFORMS.map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={() => handleArrayToggle('platforms', platform)}
                        />
                        <Label htmlFor={platform} className="text-sm">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Supported Networks</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {NETWORKS.map(network => (
                      <div key={network} className="flex items-center space-x-2">
                        <Checkbox
                          id={network}
                          checked={formData.supported_networks.includes(network)}
                          onCheckedChange={() => handleArrayToggle('supported_networks', network)}
                        />
                        <Label htmlFor={network} className="text-sm">
                          {network}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="license">License</Label>
                  <Select value={formData.license} onValueChange={(value) => handleInputChange('license', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license" />
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
                <CardTitle>Monetization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pricing_model">Pricing Model</Label>
                  <Select value={formData.pricing_model} onValueChange={(value) => handleInputChange('pricing_model', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="freemium">Freemium</SelectItem>
                      <SelectItem value="donation">Donation-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.pricing_model === 'paid' && (
                  <div>
                    <Label htmlFor="price_usd">Price (USD)</Label>
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
                  />
                  <Label htmlFor="accepts_lightning" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Accepts Lightning Network payments
                  </Label>
                </div>

                {formData.accepts_lightning && (
                  <div>
                    <Label htmlFor="lightning_address">Lightning Address</Label>
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
                <CardTitle>Publisher Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publisher_name">Your Name / Organization</Label>
                    <Input
                      id="publisher_name"
                      value={formData.publisher_name}
                      onChange={(e) => handleInputChange('publisher_name', e.target.value)}
                      placeholder="Your Name or Company"
                    />
                  </div>
                  <div>
                    <Label htmlFor="publisher_email">Contact Email</Label>
                    <Input
                      id="publisher_email"
                      type="email"
                      value={formData.publisher_email}
                      onChange={(e) => handleInputChange('publisher_email', e.target.value)}
                      placeholder="contact@yourapp.com"
                    />
                  </div>
                </div>

                <div>
                  <Label>Connected Wallet Address</Label>
                  <Input
                    value={currentAddress}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This address will be used to verify ownership of the app.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy and Legal */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy and Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="open_source"
                    checked={formData.open_source}
                    onCheckedChange={(checked) => handleInputChange('open_source', checked)}
                  />
                  <Label htmlFor="open_source">
                    This is an open-source project
                  </Label>
                </div>

                <div>
                  <Label htmlFor="data_collection_summary">Data Collection Summary</Label>
                  <Textarea
                    id="data_collection_summary"
                    value={formData.data_collection_summary}
                    onChange={(e) => handleInputChange('data_collection_summary', e.target.value)}
                    placeholder="Describe what data your app collects and how it's used..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
                    <Input
                      id="privacy_policy_url"
                      type="url"
                      value={formData.privacy_policy_url}
                      onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                      placeholder="https://yourapp.com/privacy"
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms_of_service_url">Terms of Service URL</Label>
                    <Input
                      id="terms_of_service_url"
                      type="url"
                      value={formData.terms_of_service_url}
                      onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                      placeholder="https://yourapp.com/terms"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/apps')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
                disabled={isSubmitting || !currentAddress}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {submitStatus === 'uploading' && 'Submitting...'}
                    {submitStatus === 'signing' && 'Sending emails...'}
                    {submitStatus === 'success' && 'Success!'}
                    {(submitStatus === 'idle' || submitStatus === 'error' || submitStatus === 'pending') && 'Publishing...'}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Submit App for Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}