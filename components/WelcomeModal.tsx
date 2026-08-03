'use client';


import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react';

import {
  consumeQueuedWelcomeModalAddress,
  useWallet,
  WELCOME_MODAL_AFTER_SIGN_IN_EVENT,
} from '@/components/WalletProvider';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/profileApi';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: ShieldCheck,
    title: 'WELCOME ABOARD',
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
  const dontShowAgain = true;
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;
  const isLastSlide = activeSlide === slides.length - 1;

  const localStorageKey = useMemo(() => {
    return address ? `bbox-welcome-modal-seen:${address.toLowerCase()}` : null;
  }, [address]);

  const showForSignedInAddress = useCallback(async (signedInAddress: string, signal?: AbortSignal) => {
    if (!address || signedInAddress.toLowerCase() !== address.toLowerCase()) {
      return;
    }

    setLoading(true);
    setActiveSlide(0);

    try {
      const profile = await getProfile(address);

      if (signal?.aborted) return;

      const locallyDismissed = localStorageKey ? localStorage.getItem(localStorageKey) === 'true' : false;
      setVisible(profile?.hide_welcome_modal !== true && !locallyDismissed);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [address, localStorageKey]);

  useEffect(() => {
    if (!address) return;

    const controller = new AbortController();
    const queuedAddress = consumeQueuedWelcomeModalAddress();

    if (queuedAddress) {
      showForSignedInAddress(queuedAddress, controller.signal);
    }

    const handleWelcomeAfterSignIn = (event: Event) => {
      const signedInAddress = event instanceof CustomEvent && typeof event.detail?.address === 'string'
        ? event.detail.address
        : address;

      showForSignedInAddress(signedInAddress, controller.signal);
    };

    window.addEventListener(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, handleWelcomeAfterSignIn);

    return () => {
      controller.abort();
      window.removeEventListener(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, handleWelcomeAfterSignIn);
    };
  }, [address, showForSignedInAddress]);

  useEffect(() => {
    if (!address) {
      setVisible(false);
      setActiveSlide(0);
    }
  }, [address]);

  const dismiss = async (options: { hideWelcomeModalPreference?: boolean } = {}) => {
    const shouldHideWelcomeModal = options.hideWelcomeModalPreference ?? dontShowAgain;

    if (!address) {
      setVisible(false);
      return;
    }

    setVisible(false);

    if (shouldHideWelcomeModal) {
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, 'true');
      }

      // Keep this preference local. A remote mutation requires an explicit,
      // fresh wallet signature and should not interrupt modal dismissal.
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
        className="relative flex min-h-[460px] w-full max-w-[576px] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#0a0400] px-6 py-8 text-white shadow-2xl sm:px-12 sm:py-10"
      >
        <button
          type="button"
          onClick={() => dismiss({ hideWelcomeModalPreference: false })}
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label={"Close welcome modal"}
        >
          <X className="size-4" />
        </button>

        <div className="flex justify-center">
          <div className="relative flex h-24 w-40 items-center justify-center">
            <div className="absolute bottom-2 h-2 w-28 rounded-full bg-orange-300/30 blur-sm" />
            <div className="relative flex h-20 w-28 items-center justify-center rounded-md border border-orange-200/70 bg-slate-100 shadow-[0_0_24px_rgba(255,106,0,0.25)]">
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
          <h2 id="bbox-welcome-title" className="title text-5xl font-bold leading-tight text-white sm:text-[26px]">
            {slide.title}
          </h2>
          <p className="mt-4 max-w-[460px] text-base leading-7 text-white/78">
            {slide.body}
          </p>
        </div>

        <div className="mt-auto flex justify-center gap-2 py-7" aria-label={"Welcome progress"}>
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

        <div className="flex">
          <Button
            type="button"
            onClick={handlePrimaryAction}
            className="h-11 w-full rounded-md bg-gradient-to-r from-orange-500 to-orange-700 px-6 text-white hover:from-orange-400 hover:to-orange-600"
          >
            {isLastSlide ? "Start" : "Next"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
