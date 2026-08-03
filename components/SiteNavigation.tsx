'use client';

import { usePathname } from 'next/navigation';
import { GetInButton } from '@/components/GetIn';
import { Navbar } from '@/components/Navbar';

export function SiteNavigation() {
  const pathname = usePathname();
  const routePath = pathname.replace(/^\/(en|es|pt)(?=\/|$)/, '') || '/';
  const isDocumentation = routePath === '/documentation' || routePath.startsWith('/documentation/');

  if (isDocumentation) return null;

  return (
    <>
      <GetInButton />
      <Navbar />
    </>
  );
}
