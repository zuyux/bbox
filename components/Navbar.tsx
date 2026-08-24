'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NavbarSearch } from './NavbarSearch';
import { useI18n } from './I18nProvider';

export const Navbar = () => {
  const { messages } = useI18n();
  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 select-none" aria-label={messages.nav.primary}>
      <div className="mx-auto px-3 md:px-5">
        <div className="grid grid-cols-3 items-center py-5 md:py-0">
          <div className="flex justify-start">
            <Link href="/" className="flex items-center gap-2 no-underline hover:no-underline" aria-label={messages.nav.home}>
              <Image
                src="/bbox-xs.png"
                alt="BBOXX"
                width={27}
                height={27}
                className="object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
              <span className="title mt-1 ml-1 text-3xl text-accent dark:text-white">BBOXX</span>
              <span className="mt-1 rounded-full border border-foreground/20 bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                Beta
              </span>
            </Link>
          </div>
          <NavbarSearch />
          <div aria-hidden="true" />
        </div>
      </div>
    </nav>
  );
};
