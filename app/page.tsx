'use client';

import { useI18n } from '@/components/I18nProvider';


import { LocalizedText } from '@/components/LocalizedText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import GetInModal from '@/components/GetInModal';
import { Button } from '@/components/ui/button';
import { H1, Lead } from '@/components/ui/typography';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Blocks, ChevronDown, Code2, Coins, Compass, Layers3, ShieldCheck, Sparkles, Store, Users } from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import type { BitcoinApp } from '@/lib/appsUtils';
import { getCategoryStats, getAppStats } from '@/lib/appsUtils';
import { getIPFSUrl } from '@/lib/pinataUpload';
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from '@/lib/developerMode';
import { getProfileDeveloperMode } from '@/lib/profileApi';
import { InterestBar } from '@/components/InterestBar';
import AppLoader from '@/components/AppLoader';
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
  Nostr: '/icons/nostr.svg',
  Gaming: '/game.svg'
};

const defaultCategoryIcon = '/icons/explore.svg';

const bboxHighlights = [
  {
    title: 'Discover sovereign software',
    description: 'Browse Bitcoin apps, privacy tools, safe AI projects, and open-source systems in one verified index.',
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

const ecosystemPillarIcons = [Store, Code2, Layers3, Users];

const calculateCategories = (apps: BitcoinApp[]) => {
  const categoryCount = getCategoryStats(apps);

  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    iconSrc: categoryIcons[name] || defaultCategoryIcon,
    count
  }));
};

export default function HomePage() {
  const { messages } = useI18n();
  const copy = messages.home;
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const appDiscoveryRef = useRef<HTMLDivElement | null>(null);
  const [showInterestBar, setShowInterestBar] = useState(false);
  const [hadInterestsOnEntry, setHadInterestsOnEntry] = useState<boolean | null>(null);
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
  const [visitorInterests, setVisitorInterests] = useState<string[]>([]);
  const handleInterestsChange = useCallback((interests: string[]) => {
    setVisitorInterests(interests);
  }, []);
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
    if (hadInterestsOnEntry !== false) return;
    const target = appDiscoveryRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShowInterestBar(true);
    }, { threshold: 0.15 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [appsLoading, hadInterestsOnEntry]);

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
    let cancelled = false;

    const syncDeveloperMode = async () => {
      if (!currentAddress) {
        setDeveloperMode(isDeveloperModeEnabled());
        return;
      }

      try {
        const savedDeveloperMode = await getProfileDeveloperMode(currentAddress);
        if (cancelled) return;
        setDeveloperMode(savedDeveloperMode);
        setDeveloperModeEnabled(savedDeveloperMode);
      } catch (error) {
        console.warn('Unable to load Developer Mode from profile:', error);
        if (!cancelled) {
          setDeveloperMode(isDeveloperModeEnabled());
        }
      }
    };

    syncDeveloperMode();
    window.addEventListener('storage', syncDeveloperMode);
    window.addEventListener('bbox-developer-mode-change', syncDeveloperMode);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncDeveloperMode);
      window.removeEventListener('bbox-developer-mode-change', syncDeveloperMode);
    };
  }, [currentAddress]);

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

  useEffect(() => {
    let cancelled = false;

    fetch('/api/interests', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Unable to load interests');
        if (!cancelled) {
          const savedInterests = Array.isArray(result.tags) ? result.tags : [];
          setVisitorInterests(savedInterests);
          setHadInterestsOnEntry(savedInterests.length > 0);
        }
      })
      .catch((error) => {
        console.warn('Unable to load personalized recommendations:', error);
        if (!cancelled) setHadInterestsOnEntry(false);
      });

    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => calculateCategories(apps), [apps]);
  const popularInterestCategories = useMemo(() => categories
    .slice()
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((category) => category.name), [categories]);
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
  const recommendedApps = useMemo(() => {
    const normalizedInterests = new Set(visitorInterests.map((interest) => interest.toLowerCase()));

    return apps
      .filter((app) => normalizedInterests.has(app.category.toLowerCase()))
      .slice()
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 6);
  }, [apps, visitorInterests]);

  if (appsLoading) {
    return <AppLoader isLoading />;
  }

  return (
    <div className="bg-background l-dotted-grid-background min-h-screen">
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <section className="mb-16 grid min-h-[64vh] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">
              <Blocks className="h-4 w-4" />
              {copy.badge}
            </div>
            <H1 className="title mb-6 max-w-4xl text-left text-5xl leading-[0.95] md:text-7xl lg:text-8xl">
              {copy.title}
            </H1>
            <Lead className="mb-8 max-w-2xl text-left text-base text-muted-foreground md:text-xl">
              {copy.lead}
            </Lead>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" asChild>
                <Link href="/apps">
                  {copy.exploreApps}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button> 
              <Button size="lg" variant="secondary" asChild>
                <Link href="/funding">
                  {copy.applyFunding}
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-lg border border-orange-500/20 bg-orange-500/5 translate-x-3 translate-y-3" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-lg border border-border bg-card/95 shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-border px-5">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  <p className="font-mono text-xs pt-2">{copy.protocol}</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">{appStats.totalApps}+</p>
                  <p className="mb-0 text-sm text-muted-foreground">{copy.listedApps}</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500">{categories.length || 13}</p>
                  <p className="mb-0 text-sm text-muted-foreground">{copy.categories}</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500"><LocalizedText>BAR</LocalizedText></p>
                  <p className="mb-0 text-sm text-muted-foreground">{copy.anchored}</p>
                </div>
                <div className="bg-card p-5">
                  <p className="title text-4xl text-orange-500"><LocalizedText>OSS</LocalizedText></p>
                  <p className="mb-0 text-sm text-muted-foreground">{copy.publicGoods}</p>
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

        <section className="mb-20">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-orange-500">{copy.what}</p>
              <h2 className="title text-3xl font-bold md:text-4xl">{copy.whatTitle}</h2>
            </div>
            <p className="mb-0 max-w-xl text-sm leading-6 text-muted-foreground">
              {copy.whatLead}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.ecosystemPillars.map(({ label, detail }, index) => {
              const Icon = ecosystemPillarIcons[index];

              return (
              <article key={label} className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-lg">
                <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-base font-semibold">{label}</h3>
                <p className="mb-0 text-sm leading-6 text-muted-foreground">{detail}</p>
              </article>
              );
            })}
          </div>
        </section>

        {/* Categories */}
        <div ref={appDiscoveryRef} className="mb-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-orange-500">{copy.map}</p>
              <h2 className="title text-3xl font-bold">{copy.browseCategory}</h2>
            </div>
            <p className="mb-0 max-w-md text-sm text-muted-foreground">{copy.categoryLead}</p>
          </div>
          <div className="relative overflow-visible">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" aria-hidden="true" />
            <div
              className={`category-slider-mask${isDragging ? " category-slider-mask--dragging" : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onClickCapture={handleClickCapture}
            >
              <div
                ref={sliderTrackRef}
                className="category-slider-track"
                role="list"
                aria-label={copy.categoriesLabel}
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
                      <p className="text-xs text-muted-foreground mb-0">{category.count} {copy.apps}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {visitorInterests.length > 0 && (
          <section className="my-12" aria-labelledby="recommended-apps-heading">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-sm uppercase tracking-[0.28em] text-orange-500">Picked for you</p>
                <h2 id="recommended-apps-heading" className="title text-3xl font-bold">Recommended apps</h2>
                <p className="mb-0 mt-2 text-sm text-muted-foreground">Based on {visitorInterests.join(', ')}</p>
              </div>
              <Button variant="link" asChild>
                <Link href="/recommendations">
                  See all recommendations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {recommendedApps.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {recommendedApps.map((app) => {
                  const isLoaded = loadedImages[app.id];
                  const imageSrc = app.imgCID ? getIPFSUrl(app.imgCID) : '/bbox.png';

                  return (
                    <Link
                      key={`recommended-${app.id}`}
                      href={`/apps/${app.id}`}
                      className="group rounded-lg border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-lg"
                    >
                      <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-lg bg-muted/10">
                        {!isLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-orange-500" aria-hidden="true" />
                          </div>
                        )}
                        <Image
                          src={imageSrc}
                          alt={`${app.name} logo`}
                          width={80}
                          height={80}
                          onLoad={() => markImageLoaded(app.id)}
                          className={`h-full w-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                        />
                      </div>
                      <h3 className="truncate text-sm font-semibold group-hover:text-orange-500">{app.name}</h3>
                      <p className="mb-0 mt-1 truncate text-xs text-muted-foreground">{app.category}</p>
                    </Link>
                  );
                })}
              </div>
            ) : !appsLoading && (
              <div className="rounded-lg border border-border bg-card/70 p-6 text-sm text-muted-foreground">
                No matching apps are available for these interests yet.
              </div>
            )}
          </section>
        )}

        {/* Featured Apps */}
        <div className="my-12">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="title text-2xl font-bold">{copy.featured}</h2>
              <p className="text-sm text-muted-foreground mt-1">{copy.featuredLead}</p>
            </div>
            <Button variant="link" asChild>
              <Link href="/apps">
                {copy.browseAll}
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
                      <h3 className="text-lg font-semibold">
                        {copy.topCategoryApps.replace('{category}', group.category)}
                      </h3>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/apps?category=${encodeURIComponent(group.category)}`} className="inline-flex items-center gap-1">
                        {copy.exploreMore}
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
                              className="flex flex-col items-center justify-center bg-background p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
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
                                  onLoad={() => markImageLoaded(app.id)}
                                  className={`object-cover w-full h-full transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
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
          <div className="title grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{appStats.totalApps}+</div>
              <div className="text-sm text-muted-foreground">{copy.apps}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">3</div>
              <div className="text-sm text-muted-foreground">{copy.submitted}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">10+</div>
              <div className="text-sm text-muted-foreground">{copy.contributors}</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="my-24" aria-labelledby="faq-heading">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-md border border-orange-500/25 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">
              {copy.faqBadge}
            </div>
            <h2 id="faq-heading" className="title mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
              {copy.faqTitle}
            </h2>
            <p className="mx-auto mb-0 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              {copy.faqLead}
            </p>
          </div>

          <div className="mx-auto max-w-5xl space-y-3">
            {copy.faqItems.map(({ question, answer }) => (
              <details
                key={question}
                className="group rounded-lg border border-border bg-card/80 shadow-sm transition hover:border-orange-500/40 open:border-orange-500/50 open:bg-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground marker:hidden md:px-6 [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-orange-500" aria-hidden="true" />
                </summary>
                <div className="px-5 pb-5 pt-0 md:px-6">
                  <p className="mb-0 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                    {answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <div className="mt-8 overflow-hidden rounded-lg border border-orange-300/40 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/20">
          <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.28em] text-orange-100">{copy.ctaEyebrow}</p>
              <h3 className="title mb-4 text-4xl font-bold md:text-5xl">{copy.ctaTitle}</h3>
              <p className="mb-0 max-w-2xl text-sm leading-6 text-orange-50 md:text-base">
                {copy.ctaLead}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button size="lg" variant="outline" className="cursor-pointer border-white/60 bg-white/10 text-white hover:bg-white hover:text-orange-600" asChild>
                <Link href="/documentation">
                  {messages.common.learn}
                </Link>
              </Button>
              {developerMode && (
                <Button size="lg" className="cursor-pointer bg-white text-orange-600 hover:bg-orange-50" onClick={handleStartBuilding}>
                  {messages.common.build}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {showGetInModal && <GetInModal onClose={handleGetInModalClose} />}
      <InterestBar
        categories={popularInterestCategories}
        visible={hadInterestsOnEntry === false && showInterestBar}
        onInterestsChange={handleInterestsChange}
      />
    </div>
  );
}
