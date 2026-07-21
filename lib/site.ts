const fallbackSiteUrl = 'https://bbox.lol';

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall through to the canonical production URL.
    }
  }

  return fallbackSiteUrl;
}
