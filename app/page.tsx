'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import GetInModal from '@/components/GetInModal';
import { Button } from '@/components/ui/button';
import { H1, Lead } from '@/components/ui/typography';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Blocks, Code2, Coins, Compass, Github, Layers3, ShieldCheck, Sparkles, Store, Users } from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import type { BitcoinApp } from '@/lib/appsUtils';
import { getCategoryStats, getAppStats } from '@/lib/appsUtils';
import { getIPFSUrl } from '@/lib/pinataUpload';
import { isDeveloperModeEnabled } from '@/lib/developerMode';

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

const bboxHighlights = [
  {
    title: 'Discover sovereign software',
    description: 'Browse Bitcoin apps, privacy tools, safe AI projects, and off-chain open-source systems in one verified index.',
    icon: Compass,
  },
  {
    title: 'Fund visible progress',
    description: 'Support open-source teams through milestone-based funding, public roadmaps, and transparent delivery signals.',
    icon: Coins,
  },
  {
    title: 'Choose with confidence',
    description: 'Compare source links, reviews, app metadata, and public history before you install, fund, or recommend an app.',
    icon: ShieldCheck,
  },
];

const ecosystemPillars = [
  {
    label: 'Universal registry',
    detail: 'Publisher-controlled metadata for open-source apps across Bitcoin, other chains, and independent off-chain software.',
    icon: Store,
  },
  {
    label: 'App profiles',
    detail: 'Readable listings with media, reviews, source links, and the details users need before trying something new.',
    icon: Code2,
  },
  {
    label: 'Funding layer',
    detail: 'Milestones and funding context make grants, research, and public-goods support easier to inspect before money moves.',
    icon: Layers3,
  },
  {
    label: 'Open-source commons',
    detail: 'A neutral surface where users, contributors, communities, and DAOs can coordinate around high-integrity software.',
    icon: Users,
  },
];

const calculateCategories = (apps: BitcoinApp[]) => {
  const categoryCount = getCategoryStats(apps);

  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    iconSrc: categoryIcons[name] || defaultCategoryIcon,
    count
  }));
};

export default function HomePage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimestampRef = useRef<number | null>(null);
  const pointerStateRef = useRef({ pointerId: null as number | null, startX: 0, startPosition: 0, hasCapture: false });
  const pointerCaptureTargetRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef(0);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const currentAddress = useCurrentAddress();
  const [apps, setApps] = useState<BitcoinApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const markImageLoaded = useCallback((appId: string) => {
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

  useEffect(() => {
    const syncDeveloperMode = () => setDeveloperMode(isDeveloperModeEnabled());
    syncDeveloperMode();
    window.addEventListener('storage', syncDeveloperMode);
    window.addEventListener('bbox-developer-mode-change', syncDeveloperMode);

    return () => {
      window.removeEventListener('storage', syncDeveloperMode);
      window.removeEventListener('bbox-developer-mode-change', syncDeveloperMode);
    };
  }, []);

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

  const categories = useMemo(() => calculateCategories(apps), [apps]);
  const duplicatedCategories = useMemo(() => [...categories, ...categories], [categories]);
  const appStats = useMemo(() => getAppStats(apps), [apps]);
  const featuredAppsByCategory = useMemo(() =>
    Object.entries(
      apps.reduce<Record<string, BitcoinApp[]>>((acc, app) => {
        acc[app.category] = acc[app.category] || [];
        acc[app.category].push(app);
        return acc;
      }, {})
    )
      .map(([category, categoryApps]) => ({
        category,
        apps: categoryApps
          .slice()
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 6),
        total: categoryApps.length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    [apps]
  );

  return (
    <div className="bg-background l-dotted-grid-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <section className="mb-16 grid min-h-[64vh] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">
              <Blocks className="h-4 w-4" />
              HUMANS SANDBOX
            </div>
            <H1 className="title mb-6 max-w-4xl text-left text-5xl leading-[0.95] md:text-7xl lg:text-8xl">
              BBOX is the universal registry for verified open-source apps.
            </H1>
            <Lead className="mb-8 max-w-2xl text-left text-base text-muted-foreground md:text-xl">
              Discover sovereign software, compare trusted app details, and support useful public goods through transparent milestones instead of opaque gatekeepers.
            </Lead>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" asChild>
                <Link href="/apps">
                  Explore Apps
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button> 
              {developerMode && (
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/submit">
                    Submit Your App
                  </Link>
                </Button>
              )}
              <Button size="lg" variant="ghost" asChild>
                <Link href="https://github.com/zuyux/bbox" target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  Source
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-lg border border-orange-500/20 bg-orange-500/5 translate-x-3 translate-y-3" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-lg border border-border bg-card/95 shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-border px-5">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  <p className="font-mono text-xs pt-2">Open App Registry</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">{appStats.totalApps}+</p>
                  <p className="mb-0 text-sm text-muted-foreground">listed apps</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">{categories.length || 13}</p>
                  <p className="mb-0 text-sm text-muted-foreground">categories</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">BAR</p>
                  <p className="mb-0 text-sm text-muted-foreground">Bitcoin anchored</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">OSS</p>
                  <p className="mb-0 text-sm text-muted-foreground">public goods</p>
                </div>
              </div>
              <div className="space-y-3 p-5">
                {bboxHighlights.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="flex gap-3 rounded-md border border-border bg-background/70 p-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
                      <p className="mb-0 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {appsError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-8">
            {appsError}
          </div>
        )}

        {appsLoading && (
          <div className="rounded-lg border border-border/50 bg-muted/10 p-5 text-center text-sm text-muted-foreground mb-8">
            Loading apps from the public app database...
          </div>
        )}

        <section className="mb-20">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-orange-500">What BBOX does</p>
              <h2 className="title text-3xl font-bold md:text-4xl">Discovery, coordination, and funding in one place.</h2>
            </div>
            <p className="mb-0 max-w-xl text-sm leading-6 text-muted-foreground">
              BBOX maps high-integrity open-source software with app profiles, reviews, grants, and milestone accountability anchored by the Bitcoin App Registry.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ecosystemPillars.map(({ label, detail, icon: Icon }) => (
              <article key={label} className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-lg">
                <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-base font-semibold">{label}</h3>
                <p className="mb-0 text-sm leading-6 text-muted-foreground">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Categories */}
        <div className="mb-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-orange-500">Explore the map</p>
              <h2 className="title text-3xl font-bold">Browse by Category</h2>
            </div>
            <p className="mb-0 max-w-md text-sm text-muted-foreground">Drag the rail, pick a category, and jump straight into projects building useful sovereign software.</p>
          </div>
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
                aria-label="Open-source app categories"
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
                      <div className="w-28 h-28 mx-auto mb-3 flex items-center justify-center rounded-md">
                        <Image
                          src={category.iconSrc}
                          alt={`${category.name} icon`}
                          width={63}
                          height={63}
                          className="object-contain invert dark:invert-0 transition-[filter] duration-200"
                        />
                      </div>
                      <h3 className="font-medium text-sm mb-1">{category.name}</h3>
                      <p className="text-xs text-muted-foreground mb-0">{category.count} apps</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Apps */}
        <div className="my-12">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="title text-2xl font-bold">Featured Apps</h2>
              <p className="text-sm text-muted-foreground mt-1">Top-rated apps grouped by category for quick discovery.</p>
            </div>
            <Button variant="link" asChild>
              <Link href="/apps">
                Browse all apps
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <TooltipProvider delayDuration={150}>
            <div className="space-y-10">
              {featuredAppsByCategory.map((group) => (
                <div key={group.category} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{group.category}</p>
                      <h3 className="text-lg font-semibold">Top {group.category} apps</h3>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/apps?category=${encodeURIComponent(group.category)}`} className="inline-flex items-center gap-1">
                        Explore more
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {group.apps.map((app) => {
                      const isLoaded = loadedImages[app.id];
                      const imageSrc = app.imgCID ? getIPFSUrl(app.imgCID) : '/bbox.png';

                      return (
                        <Tooltip key={`${group.category}-${app.id}`}>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/apps/${app.id}`}
                              aria-label={`View ${app.name}`}
                              className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                              <div className="relative w-24 h-24 mb-4 overflow-hidden rounded-lg bg-muted/10 transition-transform duration-200 hover:scale-105">
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
                              <p className="text-sm font-medium text-foreground truncate mb-0">{app.name}</p>                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={8} className="bg-background text-foreground max-w-xs text-center border border-foreground/10">
                            <p className="text-xs text-foreground leading-snug mt-1">
                              {app.description}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* Stats Section */}
        <div className="bg-card/85 rounded-lg border border-border p-8 mb-12 my-24 shadow-sm">
          <div className="title grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{appStats.totalApps}+</div>
              <div className="text-sm text-muted-foreground">Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">1M+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">3</div>
              <div className="text-sm text-muted-foreground">Submitted Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">10+</div>
              <div className="text-sm text-muted-foreground">Contributors</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-background/10 text-foreground">
          <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.28em] text-orange-300">Explore the sovereign software commons</p>
              <h3 className="title mb-4 text-4xl font-bold md:text-5xl">Find and support verified open-source software.</h3>
              <p className="mb-0 max-w-2xl text-sm leading-6 text-foreground md:text-base">
                Use BBOX to move from scattered links to readable app profiles: metadata, source code, milestones, reviews, and funding context together.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button size="lg" variant="outline" className="cursor-pointer" asChild>
                <Link href="/documentation">
                  Learn
                </Link>
              </Button>
              {developerMode && (
                <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 cursor-pointer" onClick={handleStartBuilding}>
                  Build
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {showGetInModal && <GetInModal onClose={handleGetInModalClose} />}
    </div>
  );
}
