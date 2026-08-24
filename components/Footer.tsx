'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ModeToggle } from './modeToggle';
import SubscribeForm from './SubscribeForm';
import { LocaleSwitcher } from './LocaleSwitcher';
import { useI18n } from './I18nProvider';

export default function Footer() {
  const { messages } = useI18n();
  return (
    <footer data-site-footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 py-2 text-xs text-white backdrop-blur-md">
      <div className="mx-auto h-full px-3 sm:px-4">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          <div className="open-sans flex items-center text-left">
            <Link href="/" className="truncate">BBOXX</Link>
            <Link href="/about" className="ml-2 hidden truncate text-[#555] hover:text-[#fff]/70 sm:inline">
              {messages.footer.tagline}
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/documentation" className="hover:text-[#fff] text-[#777]">{messages.common.learn}</Link>
            <Link href="/build" className="hover:text-[#fff] text-[#777]">{messages.common.build}</Link>
            <Link href="/privacy-policy" className="hidden md:inline hover:text-[#fff] text-[#777]">{messages.common.privacy}</Link>
            <Link href="/terms-of-service" className="hidden md:inline hover:text-[#fff] text-[#777]">{messages.common.terms}</Link>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <Link
              href="https://njump.me/npub1q2puy4swyp723h4guxl7ee9qm33t0glnvhd7tquuer5lwvt29euqatvt6k"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BBOXX on Nostr"
              title="BBOXX on Nostr"
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <Image src="/nostr.svg" width={18} height={18} alt="" />
            </Link>
            <SubscribeForm />
            <LocaleSwitcher />
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
