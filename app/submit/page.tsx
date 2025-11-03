'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';

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
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [newTag, setNewTag] = useState('');

  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    description: '',
    category: '',
    tags: [],
    version: '1.0.0',
    website_url: '',
    github_url: '',
    documentation_url: '',
    platforms: [],
    supported_networks: [],
    license: 'MIT',
    pricing_model: 'free',
    price_usd: 0,
    accepts_lightning: false,
    lightning_address: '',
    privacy_policy_url: '',
    terms_of_service_url: '',
    data_collection_summary: '',
    open_source: true,
    publisher_name: '',
    publisher_email: ''
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
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const appData = {
        ...formData,
        publisher_address: currentAddress,
        status: 'pending'
      };

      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish app');
      }

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/apps');
      }, 2000);

    } catch (error: unknown) {
      console.error('Error publishing app:', error);
      const message = error instanceof Error ? error.message : 'Failed to publish app. Please try again.';
      setErrorMessage(message);
      setSubmitStatus('error');
    } finally {
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
              Submit your application to the Bitcoin app store. All submissions are reviewed before going live.
            </p>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 dark:text-green-200">
                    App submitted successfully! Redirecting to apps page...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {submitStatus === 'error' && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 dark:text-red-200">
                    {errorMessage}
                  </span>
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
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="A secure, self-custodial Bitcoin wallet with Lightning Network support..."
                    rows={4}
                    required
                  />
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
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
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
                className="bg-orange-500 hover:bg-orange-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish App'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}