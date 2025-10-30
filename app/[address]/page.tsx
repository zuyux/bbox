'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getProfile, Profile } from '@/lib/profileApi';
import { User, MapPin, Calendar, Briefcase, Globe, Pen, LoaderCircle, Code, Download, Star } from 'lucide-react';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from '@/components/SafariOptimizedImage';

interface BitcoinApp {
  id: string;
  name: string;
  description: string;
  category: string;
  downloads: string;
  rating: number;
  repository?: string;
}

function ProfileDisplay({ profile, isOwnProfile }: {
  profile: Profile | null;
  isOwnProfile: boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-background/95 p-4 md:p-6 rounded-lg border border-border">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url || profile?.avatar_cid ? (
              !imageError ? (
                <SafariOptimizedImage
                  src={profile.avatar_cid ? getIPFSUrl(profile.avatar_cid) : profile.avatar_url!}
                  alt={profile.display_name || profile.username || 'Profile'}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <User size={48} className="text-white" />
              )
            ) : (
              <User size={48} className="text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
              {profile?.display_name || profile?.username || 'Bitcoin Developer'}
            </h1>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border-border text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors"
              >
                <Pen size={14} />
                Edit
              </Link>
            )}
          </div>

          {profile?.username && (
            <p className="text-muted-foreground mb-3">@{profile.username}</p>
          )}

          {profile?.tagline && (
            <p className="text-foreground/80 mb-4">{profile.tagline}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            {profile?.location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{profile.location}</span>
              </div>
            )}
            {profile?.occupation && (
              <div className="flex items-center gap-2">
                <Briefcase size={16} />
                <span>{profile.occupation}</span>
              </div>
            )}
            {profile?.website && (
              <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>Joined {new Date(profile?.created_at || '').toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BitcoinAppsSection({ apps }: { apps: BitcoinApp[] }) {
  return (
    <div className="bg-background/95 p-4 md:p-6 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Code className="text-orange-500" size={20} />
        <h2 className="text-lg font-semibold text-foreground">Bitcoin Apps</h2>
        <span className="text-sm text-muted-foreground">({apps.length})</span>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-8">
          <Code className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">No Bitcoin apps published yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <div key={app.id} className="p-4 bg-background border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded flex-shrink-0 flex items-center justify-center">
                  <Code size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{app.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{app.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Download size={10} />
                    {app.downloads}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                    {app.rating}
                  </div>
                </div>
                <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded text-xs">
                  {app.category}
                </span>
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

  const [bitcoinApps] = useState<BitcoinApp[]>([
    {
      id: '1',
      name: 'Lightning Wallet',
      description: 'Fast and secure Lightning Network payments',
      category: 'Wallet',
      downloads: '10K+',
      rating: 4.8,
      repository: 'https://github.com/example/lightning-wallet'
    },
    {
      id: '2',
      name: 'Bitcoin Explorer',
      description: 'Explore Bitcoin transactions and blocks',
      category: 'Explorer',
      downloads: '5K+',
      rating: 4.6,
      repository: 'https://github.com/example/btc-explorer'
    }
  ]);

  const isOwnProfile = currentAddress === address;

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

    if (address) {
      fetchProfile();
    }
  }, [address]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
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
      />
      
      <BitcoinAppsSection apps={bitcoinApps} />
    </div>
  );
}
