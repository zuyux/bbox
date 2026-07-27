import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { docsSource } from '@/lib/docs-source';

type DocumentationPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DocumentationPage({ params }: DocumentationPageProps) {
  const { slug } = await params;
  const page = docsSource.getPage(slug);

  if (!page) notFound();

  const Content = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      breadcrumb={{ includeRoot: true, includePage: true }}
      tableOfContent={{ style: 'clerk' }}
    >
      {!slug?.length && (
        <div className="relative mb-4 aspect-[1672/941] w-full overflow-hidden rounded-xl border border-fd-border">
          <Image
            src="/bbox-docs-cover.png"
            alt="BBOX Docs"
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
  return docsSource.generateParams();
}

export async function generateMetadata({ params }: DocumentationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = docsSource.getPage(slug);

  if (!page) notFound();

  return {
    title: `${page.data.title} | BBOX Docs`,
    description: page.data.description,
  };
}
