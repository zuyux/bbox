'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react';

import { useWallet } from '@/components/WalletProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getProfile, upsertProfile } from '@/lib/profileApi';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: ShieldCheck,
    title: 'Welcome to BBOX',
    body: 'BBOX is a universal registry for verified software. Discover open-source apps with clearer metadata, links, reviews, and trust signals in one place.',
  },
  {
    icon: Boxes,
    title: 'Build Better App Profiles',
    body: 'Each profile can bring together screenshots, source code, funding context, milestones, and community feedback so people can understand what is real.',
  },
  {
    icon: Sparkles,
    title: 'Connect, Review, Fund',
    body: 'Use your wallet identity to explore apps, submit projects, review work, and follow software that matters across the Bitcoin ecosystem.',
  },
] as const;

export default function WelcomeModal() {
  const { address } = useWallet();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [profileCheckedForAddress, setProfileCheckedForAddress] = useState<string | null>(null);

  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;
  const isLastSlide = activeSlide === slides.length - 1;

  const localStorageKey = useMemo(() => {
    return address ? `bbox-welcome-modal-seen:${address.toLowerCase()}` : null;
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    async function loadWelcomePreference() {
      if (!address || profileCheckedForAddress?.toLowerCase() === address.toLowerCase()) {
        return;
      }

      setLoading(true);

      try {
        const profile = await getProfile(address);

        if (cancelled) return;

        const locallyDismissed = localStorageKey ? localStorage.getItem(localStorageKey) === 'true' : false;
        setVisible(profile?.hide_welcome_modal !== true && !locallyDismissed);
        setProfileCheckedForAddress(address);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWelcomePreference();

    return () => {
      cancelled = true;
    };
  }, [address, localStorageKey, profileCheckedForAddress]);

  useEffect(() => {
    if (!address) {
      setVisible(false);
      setActiveSlide(0);
      setProfileCheckedForAddress(null);
    }
  }, [address]);

  const dismiss = async () => {
    if (!address) {
      setVisible(false);
      return;
    }

    setVisible(false);

    if (dontShowAgain) {
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, 'true');
      }

      try {
        await upsertProfile({
          address,
          hide_welcome_modal: true,
        });
      } catch (error) {
        console.warn('Unable to save welcome modal preference:', error);
      }
    }
  };

  const handlePrimaryAction = () => {
    if (!isLastSlide) {
      setActiveSlide((currentSlide) => currentSlide + 1);
      return;
    }

    dismiss();
  };

  if (!address || loading || !visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <section
        aria-labelledby="bbox-welcome-title"
        aria-modal="true"
        role="dialog"
        className="relative flex min-h-[460px] w-full max-w-[576px] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#09051f] px-6 py-8 text-white shadow-2xl sm:px-12 sm:py-10"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Close welcome modal"
        >
          <X className="size-4" />
        </button>

        <div className="flex justify-center">
          <div className="relative flex h-24 w-40 items-center justify-center">
            <div className="absolute bottom-2 h-2 w-28 rounded-full bg-cyan-300/30 blur-sm" />
            <div className="relative flex h-20 w-28 items-center justify-center rounded-md border border-cyan-200/70 bg-slate-100 shadow-[0_0_24px_rgba(45,212,191,0.25)]">
              <Image
                src="/bbox.png"
                alt=""
                width={58}
                height={58}
                className="h-14 w-14 object-contain"
                priority
              />
              <div className="absolute -right-4 -top-3 flex size-8 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="absolute left-0 top-4 rounded-full bg-white px-2 py-1 text-[#09051f] shadow-md">
              <SlideIcon className="size-4" />
            </div>
            <div className="absolute right-0 top-7 h-4 w-7 rounded-full bg-white" />
          </div>
        </div>

        <div className="mt-6 min-h-[150px]">
          <h2 id="bbox-welcome-title" className="text-2xl font-bold leading-tight text-white sm:text-[26px]">
            {slide.title}
          </h2>
          <p className="mt-4 max-w-[460px] text-base leading-7 text-white/78">
            {slide.body}
          </p>
        </div>

        <div className="mt-auto flex justify-center gap-2 py-7" aria-label="Welcome progress">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={cn(
                'size-2 rounded-full transition',
                index === activeSlide ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
              )}
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === activeSlide}
            />
          ))}
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={dismiss}
            className="h-11 justify-center px-0 text-white hover:bg-white/10 hover:text-white sm:justify-start"
          >
            Skip
          </Button>

          <label className="flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-white/86 sm:ml-auto">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="border-white/35 bg-white/15 text-white data-[state=checked]:border-violet-300 data-[state=checked]:bg-violet-400"
              aria-label="Do not show this welcome modal again"
            />
            Don&apos;t show this again
          </label>

          <Button
            type="button"
            onClick={handlePrimaryAction}
            className="h-11 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-700 px-6 text-white hover:from-violet-400 hover:to-fuchsia-600"
          >
            {isLastSlide ? 'Start' : 'Next'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
