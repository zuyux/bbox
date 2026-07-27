import type { Metadata } from 'next';
import Image from 'next/image';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { docsSource } from '@/lib/docs-source';
import { defaultLocale, isLocale } from '@/lib/i18n';

type DocumentationPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DocumentationPage({ params }: DocumentationPageProps) {
  const { slug } = await params;
  const requestedLocale = (await headers()).get('x-bbox-locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const page = docsSource.getPage(slug, locale);

  if (!page) notFound();

  const Content = page.data.body;
  const coverImages: Record<string, string> = {
    'how-it-works': '/bbox-cover-works.png',
    'trust-and-verification': '/bbox-cover-verified.png',
  };
  const coverImage = !slug?.length
    ? '/bbox-docs-cover.png'
    : coverImages[slug.join('/')] ?? null;

  return (
    <DocsPage
      className="pb-20"
      toc={page.data.toc}
      breadcrumb={{ includeRoot: true, includePage: true }}
      tableOfContent={{ style: 'clerk' }}
    >
      {coverImage && (
        <div className="relative mb-4 aspect-[1672/941] w-full overflow-hidden rounded-xl border border-fd-border">
          <Image
            src={coverImage}
            alt={page.data.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover"
          />
        </div>
      )}
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <Content />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return docsSource.getPages('en').map((page) => ({ slug: page.slugs }));
}

export async function generateMetadata({ params }: DocumentationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const requestedLocale = (await headers()).get('x-bbox-locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const page = docsSource.getPage(slug, locale);

  if (!page) notFound();

  return {
    title: `${page.data.title} | BBOX Docs`,
    description: page.data.description,
  };
}
