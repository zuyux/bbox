'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from './I18nProvider';

const SearchModal = dynamic(() => import('./SearchModal').then((mod) => mod.SearchModal), {
  ssr: false,
});

export function NavbarSearch() {
  const { messages } = useI18n();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const showSearch = !pathname.startsWith('/settings') && !pathname.startsWith('/wallet');

  if (!showSearch) {
    return <div className="my-5 h-9" aria-hidden="true" />;
  }

  return (
    <div className="flex justify-center">
      <div className="relative my-5 md:w-full">
        <Search
          className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <button
          type="button"
          aria-label={messages.nav.search}
          className="title-jersey-light w-full rounded-md border border-foreground/10 bg-background/50 py-2 pl-10 pr-4 text-left text-xs text-foreground/20 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          onClick={() => setSearchOpen(true)}
        >
          <span className="hidden text-muted-foreground md:inline">{messages.nav.searchPlaceholder}</span>
          <span className="sr-only md:hidden">{messages.nav.openSearch}</span>
        </button>
      </div>
      {searchOpen && <SearchModal open onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
