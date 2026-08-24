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
            <Link
              href="https://x.com/bboxxapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BBOXX on X"
              title="BBOXX on X"
              className="shrink-0 text-white opacity-60 transition-opacity hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                focusable="false"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
              </svg>
            </Link>
            <Link
              href="https://github.com/zuyux/bbox"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BBOXX on GitHub"
              title="BBOXX on GitHub"
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <Image src="/github.svg" width={18} height={18} alt="" className="invert" />
            </Link>
            <Link
              href="https://github.com/zuyux/bboxx/issues"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Report a bug"
              title="Report a bug"
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <Image src="/bug.svg" width={18} height={18} alt="Report a bug" />
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
