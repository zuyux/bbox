import type { ReactNode } from 'react';
import Image from 'next/image';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsSource } from '@/lib/docs-source';

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={docsSource.getPageTree()}
      nav={{
        title: (
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/bbox-xs.png" alt="" width={20} height={20} aria-hidden="true" />
            BBOX Docs
          </span>
        ),
        url: '/documentation',
      }}
      containerProps={{ className: 'bbox-docs-theme [--fd-layout-width:100vw]' }}
      sidebar={{ defaultOpenLevel: 1 }}
      themeSwitch={{ enabled: false }}
    >
      {children}
    </DocsLayout>
  );
}
