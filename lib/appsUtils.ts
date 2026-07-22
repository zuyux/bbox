export interface BitcoinApp {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  downloads: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  link: string;
  githubUrl: string;
  imgCID: string;
  platforms: string[];
  documentationUrl: string;
  publisherName: string;
  publisherEmail: string;
}

export type SupabaseAppRow = Record<string, unknown>;

export const normalizeAppRow = (row: SupabaseAppRow): BitcoinApp => ({
  id: String(row.id ?? ''),
  name: String(row.name ?? ''),
  description: String(row.description ?? ''),
  category: String(row.category ?? 'Uncategorized'),
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  downloads: String(row.downloads ?? '0'),
  rating: typeof row.rating === 'number' ? row.rating : Number(row.rating) || 0,
  reviewCount: typeof row.reviewCount === 'number' ? row.reviewCount : Number(row.review_count) || 0,
  verified: Boolean(row.verified),
  link: String(row.link ?? ''),
  githubUrl: String(row.github_url ?? row.githubUrl ?? row.repository ?? row.repo ?? ''),
  imgCID: typeof row.imgcid === 'string' ? row.imgcid : String(row.imgCID ?? ''),
  platforms: Array.isArray(row.platforms) ? row.platforms.map(String) : [],
  documentationUrl: String(row.documentation_url ?? row.documentationUrl ?? ''),
  publisherName: String(row.publisher_name ?? row.publisherName ?? ''),
  publisherEmail: String(row.publisher_email ?? row.publisherEmail ?? ''),
});

export const allApps: BitcoinApp[] = [];

// Get apps by category
export const getAppsByCategory = (category: string, apps: BitcoinApp[] = allApps): BitcoinApp[] => {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory === 'nostr') {
    return apps.filter(app => {
      const matchesCategory = app.category.toLowerCase() === 'nostr';
      const matchesTags = app.tags.some(tag => tag.toLowerCase() === 'nostr');
      return matchesCategory || matchesTags;
    });
  }

  return apps.filter(app => app.category.toLowerCase() === normalizedCategory);
};

// Get featured apps (top rated and verified)
export const getFeaturedApps = (limit: number = 8, apps: BitcoinApp[] = allApps): BitcoinApp[] => {
  return apps
    .slice()
    .sort((a, b) => {
      // Prioritize verified apps, then by rating
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return b.rating - a.rating;
    })
    .slice(0, limit);
};

// Search apps
export const searchApps = (query: string, apps: BitcoinApp[] = allApps, limit?: number): BitcoinApp[] => {
  if (!query.trim()) {
    return limit ? apps.slice(0, limit) : apps;
  }

  const searchTerm = query.toLowerCase();
  const results = apps
    .filter(app => 
      app.name.toLowerCase().includes(searchTerm) ||
      app.description.toLowerCase().includes(searchTerm) ||
      app.category.toLowerCase().includes(searchTerm) ||
      app.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  
  return limit ? results.slice(0, limit) : results;
};

// Get category statistics
export const getCategoryStats = (apps: BitcoinApp[] = allApps) => {
  const categoryCount: { [key: string]: number } = {};
  apps.forEach(app => {
    categoryCount[app.category] = (categoryCount[app.category] || 0) + 1;
  });

  const nostrCount = apps.filter(app => {
    const appCategory = app.category.toLowerCase() === 'nostr';
    const tagMatch = app.tags.some(tag => tag.toLowerCase() === 'nostr');
    return appCategory || tagMatch;
  }).length;

  if (nostrCount > 0) {
    const existingCount = categoryCount['Nostr'] || 0;
    categoryCount['Nostr'] = Math.max(existingCount, nostrCount);
  }
  
  return categoryCount;
};

// Get app statistics
export const getAppStats = (apps: BitcoinApp[] = allApps) => {
  const totalApps = apps.length;
  const verifiedApps = apps.filter(app => app.verified).length;
  const categories = Object.keys(getCategoryStats(apps)).length;
  
  // Calculate estimated total downloads
  const totalDownloads = apps.reduce((sum, app) => {
    const downloadStr = app.downloads.toLowerCase();
    if (downloadStr.includes('k')) {
      return sum + parseInt(downloadStr) * 1000;
    } else if (downloadStr.includes('m')) {
      return sum + parseInt(downloadStr) * 1000000;
    } else if (downloadStr === 'n/a') {
      return sum + 1000; // Estimate for N/A
    }
    return sum + parseInt(downloadStr) || 1000;
  }, 0);

  return {
    totalApps,
    verifiedApps,
    categories,
    totalDownloads,
    averageRating: totalApps === 0 ? 0 : apps.reduce((sum, app) => sum + app.rating, 0) / totalApps
  };
};
