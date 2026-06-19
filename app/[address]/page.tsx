'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import { getProfile, Profile } from '@/lib/profileApi';
import { User, MapPin, Calendar, Briefcase, Globe, Pen, Code, Download, Star, LoaderCircle } from 'lucide-react';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from '@/components/SafariOptimizedImage';
import Image from 'next/image';

interface SubmittedApp {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon_cid?: string | null;
  platforms: string[];
  supported_networks: string[];
  pricing_model: string;
  price_usd: number;
  accepts_lightning: boolean;
  lightning_address?: string;
  website_url?: string;
  github_url?: string;
  status: string;
  created_at?: string;
}

function ProfileDisplay({ profile, isOwnProfile, nostrPublicKey }: {
  profile: Profile | null;
  isOwnProfile: boolean;
  nostrPublicKey?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl bg-background/95 p-6 mt-16 md:p-10 rounded-2xl border border-border text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center overflow-hidden">
          {profile?.avatar_cid ? (
            <SafariOptimizedImage
              src={getIPFSUrl(profile.avatar_cid)}
              alt={profile.display_name || profile.username || 'Profile'}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              filename="user-avatar.jpg"
            />
          ) : profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || profile.username || 'Profile'}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={48} className="text-white" />
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {profile?.display_name || profile?.username || 'anon'}
          </h1>
          {profile?.username && (
            <p className="text-muted-foreground">@{profile.username}</p>
          )}
          {profile?.tagline && (
            <p className="text-foreground/80 max-w-2xl">{profile.tagline}</p>
          )}
          {isOwnProfile && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-border text-foreground rounded-full transition-colors hover:bg-accent hover:text-background"
            >
              <Pen size={14} />
              Edit Profile
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 w-full text-sm text-muted-foreground">
          {profile?.location && (
            <div className="flex items-center justify-center gap-2">
              <MapPin size={16} />
              <span>{profile.location}</span>
            </div>
          )}
          {profile?.occupation && (
            <div className="flex items-center justify-center gap-2">
              <Briefcase size={16} />
              <span>{profile.occupation}</span>
            </div>
          )}
          {profile?.website && (
            <div className="flex items-center justify-center gap-2">
              <Globe size={16} />
              <a 
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {isOwnProfile && nostrPublicKey && (
            <div className="flex items-center justify-center gap-2 max-w-full truncate">
              <span className="truncate">{nostrPublicKey}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 col-span-1 sm:col-span-2">
            <Calendar size={16} />
            <span>Joined {new Date(profile?.created_at || '').toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BitcoinAppsSection({ apps, loading }: { apps: SubmittedApp[]; loading: boolean }) {
  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter(app => app.status === 'pending').length;
    const approved = apps.filter(app => app.status === 'approved').length;
    return { total, pending, approved };
  }, [apps]);

  return (
    <div className="mx-auto max-w-4xl bg-background/95 p-4 md:p-6 rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Code className="text-orange-500" size={20} />
          <h2 className="text-lg font-semibold text-foreground">Apps</h2>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Total: <strong>{stats.total}</strong></span>
          <span>Pending: <strong className="text-amber-600">{stats.pending}</strong></span>
          <span>Approved: <strong className="text-emerald-600">{stats.approved}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading apps...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-8">
          <Code className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">No open-source apps published yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <div key={app.id} className="p-4 bg-background border border-border rounded-lg hover:bg-accent/50 transition-colors flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-lg border border-dashed flex-shrink-0 bg-muted/60 flex items-center justify-center p-1">
                  {app.icon_cid ? (
                    <Image
                      src={`https://ipfs.io/ipfs/${app.icon_cid}`}
                      alt={`${app.name} icon`}
                      width={44}
                      height={44}
                      className="object-contain rounded"
                      unoptimized
                    />
                  ) : (
                    <Code size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{app.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{app.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border">
                  <Download size={10} />
                  {app.pricing_model === 'free' ? 'Free' : `$${app.price_usd || 0}`}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border">
                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  {app.category}
                </span>
                {app.accepts_lightning && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300 text-amber-600">
                    ⚡ Lightning
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {app.platforms?.slice(0, 2).map((platform) => (
                  <span key={platform} className="px-2 py-0.5 bg-muted rounded">
                    {platform}
                  </span>
                ))}
                {app.platforms?.length > 2 && (
                  <span className="px-2 py-0.5 bg-muted rounded">
                    +{app.platforms.length - 2} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{new Date(app.created_at || '').toLocaleDateString()}</span>
                <Link href={`/preview/${app.id}`} className="text-primary hover:underline text-[11px]">
                  View details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddressPage() {
  const params = useParams();
  const address = params?.address as string;
  const currentAddress = useCurrentAddress();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<SubmittedApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);

  const isOwnProfile = currentAddress === address;
  const { currentWallet } = useEncryptedWallet();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfile(address);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchApps = async () => {
      try {
        setAppsLoading(true);
        setAppsError(null);
        const response = await fetch(`/api/apps?publisher=${address}`);
        if (!response.ok) {
          throw new Error('Failed to load apps');
        }
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load apps');
        }
        setApps(result.apps || []);
      } catch (err) {
        console.error('Error fetching apps:', err);
        setAppsError('Failed to load submitted apps');
      } finally {
        setAppsLoading(false);
      }
    };

    if (address) {
      fetchProfile();
      fetchApps();
    }
  }, [address]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 mt-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card/80 p-10 text-center">
          <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-semibold text-foreground">Loading profile...</p>
          <p className="mt-2 text-sm text-muted-foreground">Please wait while we load this profile.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <ProfileDisplay 
        profile={profile} 
        isOwnProfile={isOwnProfile} 
        nostrPublicKey={currentWallet?.nostrPublicKey}
      />
      
      {appsError && (
        <div className="mx-auto max-w-4xl bg-destructive/10 text-destructive border border-destructive/30 rounded-lg p-4">
          {appsError}
        </div>
      )}
      <BitcoinAppsSection apps={apps} loading={appsLoading} />
    </div>
  );
}
