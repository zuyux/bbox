'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import IPFSImage from '@/components/IPFSImage';
import { extractIPFSHash } from '@/lib/ipfs-utils';
import type { BitcoinApp } from '@/lib/appsUtils';
import { getCategoryStats } from '@/lib/appsUtils';
import { 
  Search, 
  Star, 
  Download, 
  Shield, 
  Zap, 
  Coins, 
  Code, 
  Globe,
  ArrowRight
} from 'lucide-react';

const categoryIcons: { [key: string]: typeof Shield } = {
  'Wallet': Shield,
  'Lightning': Zap,
  'DeFi': Coins,
  'Mining': Code,
  'Payment': Coins,
  'Explorer': Globe,
  'Social': Globe,
  'Networking': Globe,
  'Identity': Shield,
  'Infrastructure': Code,
  'Developer': Code,
  'Creator': Code,
  'Nostr': Globe
};

const CHUNK_SIZE = 10;
const DEFAULT_APP_IMAGE = '/bbox.png';

const AppLogo = ({ name, imgCID }: { name: string; imgCID?: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasValidHash = Boolean(imgCID && extractIPFSHash(imgCID));
  const showRemoteImage = hasValidHash && !imageFailed;

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#111] to-[#222] rounded-2xl text-white text-xl sm:text-2xl font-bold shadow-sm overflow-hidden flex items-center justify-center">
      {showRemoteImage && imgCID ? (
        <IPFSImage
          src={imgCID}
          alt={`${name} logo`}
          className="object-cover"
          fill
          sizes="80px"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Image
          src={DEFAULT_APP_IMAGE}
          alt={`Default logo for ${name}`}
          fill
          sizes="80px"
          className="object-cover"
        />
      )}
    </div>
  );
};

export default function AppsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [apps, setApps] = useState<BitcoinApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  const categoryStats = useMemo(() => getCategoryStats(apps), [apps]);
  const categories = useMemo(() => Object.keys(categoryStats), [categoryStats]);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setAppsLoading(true);
        setAppsError(null);

        const response = await fetch('/api/bbox-apps', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok || !result?.apps) {
          throw new Error(result?.error || 'Unable to load apps');
        }

        setApps(result.apps);
      } catch (error) {
        console.error('Failed to load apps', error);
        setAppsError(error instanceof Error ? error.message : 'Unable to load apps');
      } finally {
        setAppsLoading(false);
      }
    };

    fetchApps();
  }, []);

  const updateCategorySelection = useCallback((nextCategory: string) => {
    setSelectedCategory(nextCategory);

    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);
  
  const filteredApps = useMemo(() => {
    const normalizedSearchQuery = searchQuery.toLowerCase();
    const categoryFiltered = selectedCategory === 'all'
      ? apps
      : apps.filter(app => app.category.toLowerCase() === selectedCategory.toLowerCase());

    return categoryFiltered.filter(app =>
      app.name.toLowerCase().includes(normalizedSearchQuery) ||
      app.description.toLowerCase().includes(normalizedSearchQuery) ||
      app.tags.some(tag => tag.toLowerCase().includes(normalizedSearchQuery))
    );
  }, [apps, selectedCategory, searchQuery]);

  const visibleApps = filteredApps.slice(0, visibleCount);
  const hasMoreApps = visibleCount < filteredApps.length;

  useEffect(() => {
    setVisibleCount(CHUNK_SIZE);
  }, [searchQuery, selectedCategory]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + CHUNK_SIZE, filteredApps.length));
  }, [filteredApps.length]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');

    if (!categoryParam) {
      if (selectedCategory !== 'all') {
        setSelectedCategory('all');
      }
      return;
    }

    const normalizedParam = categoryParam.toLowerCase();

    if (normalizedParam === 'all') {
      if (selectedCategory !== 'all') {
        setSelectedCategory('all');
      }
      return;
    }

    const matchedCategory = categories.find(
      category => category.toLowerCase() === normalizedParam
    );

    if (matchedCategory && matchedCategory !== selectedCategory) {
      setSelectedCategory(matchedCategory);
    }
    if (!matchedCategory && selectedCategory !== 'all') {
      setSelectedCategory('all');
    }
  }, [searchParams, categories, selectedCategory]);

  useEffect(() => {
    if (!hasMoreApps) {
      return;
    }

    const target = sentinelRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [hasMoreApps, handleLoadMore]);

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-4xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search open-source apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl bg-muted/50 border-0 placeholder:text-foreground/50"
            />
          </div>
        </div>

        {appsLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading apps...</div>
        )}

        {appsError && (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-6">
            {appsError}
          </div>
        )}

        {/* Category Pills - 2 Rows */}
        <div className="mb-8 w-full mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateCategorySelection('all')}
              className={`rounded-full whitespace-nowrap text-xs cursor-pointer border border-green-500 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-green-500 text-white hover:bg-green-600 hover:text-foreground'
                  : 'text-green-600 hover:bg-green-500 hover:text-foreground'
              }`}
            >
              All Apps
            </Button>
            {categories.map(category => {
              const Icon = categoryIcons[category] || Code;
              return (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  onClick={() => updateCategorySelection(category)}
                  className={`rounded-md whitespace-nowrap flex items-center justify-center gap-1 text-xs cursor-pointer border border-green-500 transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-500 text-white hover:bg-green-600 hover:text-foreground'
                      : 'text-green-600 hover:bg-green-500 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{category}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Apps List */}
        <div className="space-y-4">
          {visibleApps.map((app, index) => (
            <Link key={app.id} href={`/apps/${app.id}`}>
              <div className="flex gap-4 p-4 rounded-md hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                {/* App Icon */}
                <div className="flex-shrink-0">
                  <AppLogo name={app.name} imgCID={app.imgCID} />
                </div>
                
                {/* App Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-stretch justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg break-words line-clamp-1">{app.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 break-words mb-2">
                        {app.description}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600 text-white rounded-md px-3 flex-shrink-0 cursor-pointer self-stretch flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{app.rating}</span>
                    </div>
                    <span>•</span>
                    <span>{app.category}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{app.downloads}</span>
                    </div>
                    {app.verified && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1 text-green-600">
                          <Shield className="w-3 h-3" />
                          <span className="font-medium">Verified</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {app.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {app.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        +{app.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {index < visibleApps.length - 1 && (
                <div className="h-px bg-border ml-24" />
              )}
            </Link>
          ))}
        </div>

        {/* Sentinel triggers more loading when it enters view */}
        <div ref={sentinelRef} className="h-1" />
        
        {filteredApps.length === 0 && (
          <div className="text-center py-16">
            <div className="text-muted-foreground text-lg mb-2">No apps found</div>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
