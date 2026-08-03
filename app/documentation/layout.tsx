import type { ReactNode } from 'react';
import Image from 'next/image';
import { headers } from 'next/headers';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsSource } from '@/lib/docs-source';
import { defaultLocale, isLocale } from '@/lib/i18n';

export default async function DocumentationLayout({ children }: { children: ReactNode }) {
  const requestedLocale = (await headers()).get('x-bbox-locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <DocsLayout
      tree={docsSource.getPageTree(locale)}
      nav={{
        enabled: false,
        title: (
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/bbox-xs.png" alt="" width={20} height={20} aria-hidden="true" />
            BBOX Docs
          </span>
        ),
        url: '/documentation',
      }}
      containerProps={{ className: 'bbox-docs-theme [--fd-layout-width:100vw]' }}
      slots={{ languageSelect: false }}
      sidebar={{ defaultOpenLevel: 1 }}
      themeSwitch={{ enabled: false }}
    >
      {children}
    </DocsLayout>
  );
}
