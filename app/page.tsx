'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import GetInModal from '@/components/GetInModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight } from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { allApps, getCategoryStats, getAppStats } from '@/lib/appsUtils';
import { getIPFSUrl } from '@/lib/pinataUpload';

// Calculate actual categories from the data
const calculateCategories = () => {
  const categoryCount = getCategoryStats();

  const categoryIcons: Record<string, string> = {
    Wallet: '/icons/wallet.svg',
    Lightning: '/icons/lightning.svg',
    Payment: '/icons/payment.svg',
    Explorer: '/icons/explore.svg',
    Infrastructure: '/icons/infra.svg',
    Mining: '/icons/mining.svg',
    DeFi: '/icons/defi.svg',
    Social: '/icons/social.svg',
    Networking: '/icons/network.svg',
    Identity: '/icons/id.svg',
    Developer: '/icons/dev.svg',
    Creator: '/icons/creator.svg',
    Nostr: '/icons/nostr.svg'
  };
  const defaultCategoryIcon = '/icons/explore.svg';

  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    iconSrc: categoryIcons[name] || defaultCategoryIcon,
    count
  }));
};

const categories = calculateCategories();
const appStats = getAppStats();
const duplicatedCategories = [...categories, ...categories];

export default function HomePage() {
  const router = useRouter();
  const INITIAL_VISIBLE = 24;
  const LOAD_STEP = 24;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [showGetInModal, setShowGetInModal] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimestampRef = useRef<number | null>(null);
  const pointerStateRef = useRef({ pointerId: null as number | null, startX: 0, startPosition: 0, hasCapture: false });
  const pointerCaptureTargetRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef(0);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef(false);
  const currentAddress = useCurrentAddress();
  const sortedApps = useMemo(() => {
    return [...allApps].sort((a, b) => b.rating - a.rating);
  }, [allApps]);
  const totalAppsCount = sortedApps.length;
  const visibleApps = sortedApps.slice(0, visibleCount);
  const canLoadMore = visibleCount < totalAppsCount;
  const markImageLoaded = useCallback((appId: number) => {
    setLoadedImages(prev => {
      if (prev[appId]) {
        return prev;
      }
      return { ...prev, [appId]: true };
    });
  }, []);

  const applyWrappedPosition = useCallback((value: number) => {
    const track = sliderTrackRef.current;
    if (!track) {
      positionRef.current = value;
      return value;
    }

    const limit = track.scrollWidth / 2;
    let nextValue = value;

    if (limit > 0) {
      while (nextValue <= -limit) {
        nextValue += limit;
      }

      while (nextValue > 0) {
        nextValue -= limit;
      }
    }

    track.style.transform = `translate3d(${nextValue}px, 0, 0)`;
    positionRef.current = nextValue;
    return nextValue;
  }, []);

  const getAutoScrollSpeed = useCallback(() => {
    const track = sliderTrackRef.current;
    if (!track) {
      return 40;
    }

    const limit = track.scrollWidth / 2;
    if (!limit) {
      return 40;
    }

    return limit / 28;
  }, []);

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    const { pointerId } = pointerStateRef.current;
    const captureTarget = pointerCaptureTargetRef.current;

    if (pointerId !== null && captureTarget && captureTarget.hasPointerCapture(pointerId)) {
      captureTarget.releasePointerCapture(pointerId);
    }

    pointerStateRef.current.pointerId = null;
    pointerCaptureTargetRef.current = null;
    pointerStateRef.current.startPosition = positionRef.current;
    pointerStateRef.current.hasCapture = false;
    lastTimestampRef.current = null;

    if (suppressClickRef.current) {
      requestAnimationFrame(() => {
        suppressClickRef.current = false;
      });
    }
  }, []);

  useEffect(() => {
    applyWrappedPosition(positionRef.current);
  }, [applyWrappedPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      applyWrappedPosition(positionRef.current);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [applyWrappedPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const previousTimestamp = lastTimestampRef.current ?? timestamp;
      const delta = timestamp - previousTimestamp;
      lastTimestampRef.current = timestamp;

      if (!isDraggingRef.current && !prefersReducedMotionRef.current) {
        const speed = getAutoScrollSpeed();
        const distance = (delta / 1000) * speed;
        applyWrappedPosition(positionRef.current - distance);
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimestampRef.current = null;
    };
  }, [applyWrappedPosition, getAutoScrollSpeed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePointerEnd = () => {
      stopDragging();
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [stopDragging]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + LOAD_STEP, totalAppsCount));
  }, [totalAppsCount]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !canLoadMore) {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          handleLoadMore();
        }
      });
    }, { rootMargin: '200px 0px 0px 0px' });

    observer.observe(sentinel);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [canLoadMore, handleLoadMore]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => {
        mediaQuery.removeEventListener('change', updatePreference);
      };
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updatePreference);
      return () => {
        mediaQuery.removeListener(updatePreference);
      };
    }
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: positionRef.current,
      hasCapture: false
    };

    pointerCaptureTargetRef.current = event.currentTarget;

    isDraggingRef.current = true;
    suppressClickRef.current = false;
    setIsDragging(true);
    lastTimestampRef.current = null;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    event.preventDefault();
    const delta = event.clientX - pointerStateRef.current.startX;
    const hasReachedDragThreshold = Math.abs(delta) > 8;

    if (hasReachedDragThreshold && !pointerStateRef.current.hasCapture) {
      const captureTarget = pointerCaptureTargetRef.current;
      const activePointerId = pointerStateRef.current.pointerId ?? event.pointerId;

      if (captureTarget?.setPointerCapture) {
        try {
          captureTarget.setPointerCapture(activePointerId);
          pointerStateRef.current.hasCapture = true;
        } catch {
          pointerStateRef.current.hasCapture = false;
        }
      }
    }

    if (!suppressClickRef.current && hasReachedDragThreshold) {
      suppressClickRef.current = true;
    }

    applyWrappedPosition(pointerStateRef.current.startPosition + delta);
  };

  useEffect(() => {
    loadingMoreRef.current = false;
  }, []);

  useEffect(() => {
    loadingMoreRef.current = false;
  }, [visibleCount]);

  const handleCategoryClick = useCallback((categoryName: string) => {
    router.push(`/apps?category=${encodeURIComponent(categoryName)}`);
  }, [router]);

  const handleCategoryKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, categoryName: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCategoryClick(categoryName);
    }
  }, [handleCategoryClick]);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleStartBuilding = useCallback(() => {
    if (currentAddress) {
      router.push('/build');
      return;
    }
    setShowGetInModal(true);
  }, [currentAddress, router]);

  const handleGetInModalClose = useCallback(() => {
    setShowGetInModal(false);
  }, []);
  return (
    <div className="bg-background l-dotted-grid-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center mb-16 h-[36vh]">
          <h1 className="title text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent select-text">
            Our Open App Store
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-1xl mx-auto select-text">
            Discover, evaluate, and fund open-source applications through transparent milestones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600" asChild>
              <Link href="/apps" className='text-white'>
                Explore
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link href="/submit" className="text-sm underline">
              <Button size="lg" variant="secondary" className='cursor-pointer'>
                Submit Your App
              </Button>
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="title text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" aria-hidden="true" />
            <div
              className={`category-slider-mask${isDragging ? ' category-slider-mask--dragging' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onClickCapture={handleClickCapture}
            >
              <div
                ref={sliderTrackRef}
                className="category-slider-track"
                role="list"
                aria-label="Bitcoin app categories"
              >
                {duplicatedCategories.map((category, index) => (
                  <Card
                    key={`${category.name}-${index}`}
                    role="listitem"
                    tabIndex={0}
                    className="category-card"
                    onClick={() => handleCategoryClick(category.name)}
                    onKeyDown={(event) => handleCategoryKeyDown(event, category.name)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-36 h-36 mx-auto mb-3 flex items-center justify-center rounded-full bg-muted/30">
                        <Image
                          src={category.iconSrc}
                          alt={`${category.name} icon`}
                          width={63}
                          height={63}
                          className="object-contain invert dark:invert-0 transition-[filter] duration-200"
                        />
                      </div>
                      <h3 className="font-medium text-sm mb-1">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.count} apps</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Apps */}
        <div className="my-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="title text-2xl font-bold">Featured Apps</h2>
            <Button variant="link" asChild>
              <Link href="/apps">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleApps.map(app => {
                const isLoaded = loadedImages[app.id];
                const imageSrc = app.imgCID ? getIPFSUrl(app.imgCID) : '/bbox.png';

                return (
                  <Tooltip key={app.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/apps/${app.id}`}
                        aria-label={`View ${app.name}`}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <div className="relative w-24 h-24 my-8 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-transparent transition-transform duration-200 hover:scale-105">
                          {!isLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                              <span className="h-6 w-6 border-2 border-muted-foreground/30 border-t-orange-500 rounded-full animate-spin" aria-hidden="true" />
                            </div>
                          )}
                          <Image
                            src={imageSrc}
                            alt={`${app.name} logo`}
                            width={112}
                            height={112}
                            loading="lazy"
                            onLoadingComplete={() => markImageLoaded(app.id)}
                            className={`object-cover w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground max-w-[8rem] truncate">{app.name}</p>
                        <p className="text-xs text-foreground/50 max-w-[8rem] truncate">{app.category}</p>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="bg-background text-foreground max-w-xs text-center border-1 border-foreground/20">
                      <p className="text-xs text-foreground leading-snug mt-1">
                        {app.description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div ref={loadMoreRef} aria-hidden="true" className="h-8 w-full" />
          </TooltipProvider>
        </div>

        {/* Stats Section */}
        <div className="bg-background/50 rounded-lg border border-border p-8 mb-12 my-24">
          <div className="title grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{appStats.totalApps}+</div>
              <div className="text-sm text-muted-foreground">Bitcoin Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{Math.floor(appStats.totalDownloads / 1000000)}M+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">3</div>
              <div className="text-sm text-muted-foreground">Funded Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">10+</div>
              <div className="text-sm text-muted-foreground">Developers</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <h3 className="title text-5xl font-bold mb-8">Build the Bitcoin Economy</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of developers building open-source applications for Bitcoin and its Layer-2 ecosystems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" className='cursor-pointer' asChild>
              <Link href="/documentation">
                Developer Guide
              </Link>
            </Button>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-[#fff] cursor-pointer" onClick={handleStartBuilding}>
              Start Building
            </Button>
          </div>
        </div>
      </div>
      {showGetInModal && <GetInModal onClose={handleGetInModalClose} />}
    </div>
  );
}