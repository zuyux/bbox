
'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';

import { useState } from 'react';
const SearchModal = dynamic(() => import('./SearchModal').then((mod) => mod.SearchModal), {
  ssr: false,
});
import GetInModal from './GetInModal';

export const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [getInOpen, setGetInOpen] = useState(false);
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full z-50 select-none">
        <div className="mx-auto px-3 md:px-5">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Logo */}
            <div className="flex justify-start">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/bbox.png" alt="bbox Logo" width={27} height={27} className="object-contain"/>
                <span className="title text-3xl mt-1 ml-1 ">BBOX</span>
              </Link>
            </div>
            
            {/* Center: Search Input */}
            <div className="flex justify-center">
              <div className="relative md:w-full my-5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-100" />
                <input
                  type="text"
                  placeholder="SEARCH APPS..."
                  className="title-jersey-light w-full pl-10 pr-4 py-2 bg-background/50 border border-foreground/10 rounded-md text-xs text-foreground/20 placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all mobile-hide-placeholder"
                  onClick={() => setSearchOpen(true)}
                  readOnly
                />
              </div>
            </div>
            
            {/* Right: Additional items can go here */}
            <div className="flex justify-end">
              {/* Reserved for future items */}
            </div>
          </div>
        </div>
      </nav>
      {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}
      {getInOpen && <GetInModal onClose={() => setGetInOpen(false)} />}
      
      <style jsx>{`
        .mobile-hide-placeholder::placeholder {
          color: transparent;
        }
        
        @media (min-width: 768px) {
          .mobile-hide-placeholder::placeholder {
            color: hsl(var(--muted-foreground));
          }
        }
      `}</style>
    </>
  );
};
