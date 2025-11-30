'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowRight, Star, Download } from 'lucide-react';
import { getFeaturedApps, getCategoryStats, getAppStats, BitcoinApp } from '@/lib/appsUtils';

// Get featured apps using the utility function
const featuredApps = getFeaturedApps(8);

// Calculate actual categories from the data
const calculateCategories = () => {
  const categoryCount = getCategoryStats();

  const categoryIcons: Record<string, string> = {
    Wallet: '/icons/wallet.svg',
    Lightning: '/icons/lightning.svg',
    Payment: '/icons/payment.svg',
    Explorer: '/icons/explore.svg',
    Infrastructure: '/icons/infra.svg',
    Mining: '/icons/mining.svg',
    DeFi: '/icons/defi.svg',
    Social: '/icons/social.svg',
    Networking: '/icons/network.svg',
    Identity: '/icons/id.svg',
    Developer: '/icons/dev.svg',
    Creator: '/icons/creator.svg',
    Nostr: '/icons/network.svg'
  };
  const defaultCategoryIcon = '/icons/explore.svg';

  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    iconSrc: categoryIcons[name] || defaultCategoryIcon,
    count
  }));
};

const categories = calculateCategories();
const appStats = getAppStats();
const duplicatedCategories = [...categories, ...categories];

function AppCard({ app }: { app: BitcoinApp }) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg">{app.name}</CardTitle>
              {app.verified && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {app.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="flex-1 min-h-[60px]">
          <div className="flex flex-wrap gap-1 mb-3">
            {app.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span className="text-xs">{app.downloads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{app.rating}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/apps/${app.id}`}>
              View App
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="bg-background l-dotted-grid-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center mb-16 h-[80vh]">
          <h1 className="title text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent select-text">
            Our Open App Store
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-1xl mx-auto select-text">
            Discover, evaluate, and fund open-source applications through transparent milestones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600" asChild>
              <Link href="/apps" className='text-white'>
                Explore
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link href="/submit" className="text-sm underline">
              <Button size="lg" variant="outline" className='cursor-pointer'>
                Submit Your App
              </Button>
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="title text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" aria-hidden="true" />
            <div className="category-slider-mask">
              <div className="category-slider-track" role="list" aria-label="Bitcoin app categories">
                {duplicatedCategories.map((category, index) => (
                  <Card
                    key={`${category.name}-${index}`}
                    role="listitem"
                    tabIndex={0}
                    className="category-card">
                    <CardContent className="p-4 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-full bg-muted/30">
                        <Image
                          src={category.iconSrc}
                          alt={`${category.name} icon`}
                          width={63}
                          height={63}
                          className="object-contain invert dark:invert-0 transition-[filter] duration-200"
                        />
                      </div>
                      <h3 className="font-medium text-sm mb-1">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.count} apps</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Apps */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="title text-2xl font-bold">Featured Apps</h2>
            <Button variant="ghost" asChild>
              <Link href="/apps">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredApps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-background/50 rounded-lg border border-border p-8 mb-12 my-24">
          <div className="title grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{appStats.totalApps}+</div>
              <div className="text-sm text-muted-foreground">Bitcoin Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{Math.floor(appStats.totalDownloads / 1000000)}M+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">3</div>
              <div className="text-sm text-muted-foreground">Funded Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">10+</div>
              <div className="text-sm text-muted-foreground">Developers</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <h3 className="title text-5xl font-bold mb-8">Build the Bitcoin Economy</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of developers building open-source applications for Bitcoin and its Layer-2 ecosystems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" className='cursor-pointer'>
              Developer Guide
            </Button>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-[#fff] cursor-pointer">
              Start Building
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}