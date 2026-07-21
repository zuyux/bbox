import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import { getSiteUrl } from '@/lib/site';

const publicRoutes = ['', '/apps', '/about', '/documentation', '/build', '/funding', '/privacy-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return publicRoutes.flatMap((route) =>
    locales.map((locale) => {
      const localizedPath = `/${locale}${route}`;
      return {
        url: `${siteUrl}${localizedPath}`,
        lastModified: now,
        changeFrequency: route === '' || route === '/apps' ? 'daily' as const : 'monthly' as const,
        priority: route === '' ? 1 : route === '/apps' ? 0.9 : 0.6,
        alternates: {
          languages: {
            en: `${siteUrl}/en${route}`,
            es: `${siteUrl}/es${route}`,
            pt: `${siteUrl}/pt${route}`,
          },
        },
      };
    })
  );
}
