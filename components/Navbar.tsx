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
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <Link href="/" className="flex items-center gap-2" aria-label={messages.nav.home}>
              <Image
                src="/bbox-xs.png"
                alt="BBOX"
                width={27}
                height={27}
                className="object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
              <span className="title text-3xl mt-1 ml-1">BBOX</span>
            </Link>
          </div>
          <NavbarSearch />
          <div aria-hidden="true" />
        </div>
      </div>
    </nav>
  );
};
