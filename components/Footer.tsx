import Link from 'next/link';
import { ModeToggle } from './modeToggle';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-black/70 text-white text-xs z-50 py-1 backdrop-blur-md border-t border-white/10">
      <div className="mx-auto h-full px-3 sm:px-4">
        <div className="flex justify-between items-center h-full">
          <Link href="/about" className='flex items-center gap-1'>
            <span className="open-sans text-left truncate">
              BBOX <span className="hidden sm:inline hover:text-[#fff]/70 text-[#555] ml-2">Our Open App Store</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/documentation" className="hover:text-[#fff] text-[#777]">Learn</Link>
            <Link href="/build" className="hover:text-[#fff] text-[#777]">Build</Link>
            <Link href="/privacy-policy" className="hidden md:inline hover:text-[#fff] text-[#777]">Privacy</Link>
            <Link href="/terms-of-service" className="hidden md:inline hover:text-[#fff] text-[#777]">Terms</Link>
          </div>
          <div className="flex items-center gap-0 h-full">
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
