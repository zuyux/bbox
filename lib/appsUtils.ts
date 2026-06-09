import appsData from '@/db/apps.json';

export interface BitcoinApp {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  downloads: string;
  rating: number;
  verified: boolean;
  link: string;
  imgCID: string;
}

export const allApps: BitcoinApp[] = appsData;

// Get apps by category
export const getAppsByCategory = (category: string): BitcoinApp[] => {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory === 'nostr') {
    return allApps.filter(app => {
      const matchesCategory = app.category.toLowerCase() === 'nostr';
      const matchesTags = app.tags.some(tag => tag.toLowerCase() === 'nostr');
      return matchesCategory || matchesTags;
    });
  }

  return allApps.filter(app => app.category.toLowerCase() === normalizedCategory);
};

// Get featured apps (top rated and verified)
export const getFeaturedApps = (limit: number = 8): BitcoinApp[] => {
  return allApps
    .sort((a, b) => {
      // Prioritize verified apps, then by rating
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      return b.rating - a.rating;
    })
    .slice(0, limit);
};

// Search apps
export const searchApps = (query: string, limit?: number): BitcoinApp[] => {
  if (!query.trim()) {
    return limit ? allApps.slice(0, limit) : allApps;
  }

  const searchTerm = query.toLowerCase();
  const results = allApps
    .filter(app => 
      app.name.toLowerCase().includes(searchTerm) ||
      app.description.toLowerCase().includes(searchTerm) ||
      app.category.toLowerCase().includes(searchTerm) ||
      app.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  
  return limit ? results.slice(0, limit) : results;
};

// Get category statistics
export const getCategoryStats = () => {
  const categoryCount: { [key: string]: number } = {};
  allApps.forEach(app => {
    categoryCount[app.category] = (categoryCount[app.category] || 0) + 1;
  });

  const nostrCount = allApps.filter(app => {
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
export const getAppStats = () => {
  const totalApps = allApps.length;
  const verifiedApps = allApps.filter(app => app.verified).length;
  const categories = Object.keys(getCategoryStats()).length;
  
  // Calculate estimated total downloads
  const totalDownloads = allApps.reduce((sum, app) => {
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
    averageRating: allApps.reduce((sum, app) => sum + app.rating, 0) / totalApps
  };
};