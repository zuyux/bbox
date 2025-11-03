'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Shield, Code, Coins, Globe, ArrowRight, Star, Download, Github } from 'lucide-react';
import { getFeaturedApps, getCategoryStats, getAppStats, BitcoinApp } from '@/lib/appsUtils';

// Get featured apps using the utility function
const featuredApps = getFeaturedApps(8);

// Calculate actual categories from the data
const calculateCategories = () => {
  const categoryCount = getCategoryStats();
  
  const categoryIcons: { [key: string]: typeof Shield } = {
    'Wallet': Shield,
    'Lightning': Zap,
    'DeFi': Coins,
    'Mining': Code,
    'Payment': Coins,
    'Explorer': Globe,
    'Social': Globe,
    'Networking': Globe,
    'Identity': Shield,
    'Infrastructure': Code,
    'Developer': Code,
    'Creator': Code
  };
  
  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    icon: categoryIcons[name] || Code,
    count
  })).slice(0, 6); // Show top 6 categories
};

const categories = calculateCategories();
const appStats = getAppStats();

function AppCard({ app }: { app: BitcoinApp }) {
  return (
    <Card className="flex flex-col min-h-[340px] h-full hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{app.name}</CardTitle>
              {app.verified && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {app.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap gap-1 mb-3">
            {app.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              {app.downloads}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {app.rating}
            </div>
          </div>
          <Button size="sm" variant="outline">
            View App
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center mb-16 h-[80vh]">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            Our Open Bitcoin App Store
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover, evaluate, and fund open-source Bitcoin applications through transparent milestones and on-chain contracts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600" asChild>
              <Link href="/apps">
                Explore Apps
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className='cursor-pointer'>
              <Github className="mr-2 h-4 w-4" />
              Submit Your App
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(category => {
              const Icon = category.icon;
              return (
                <Card key={category.name} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <h3 className="font-medium text-sm mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">{category.count} apps</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Featured Apps */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Apps</h2>
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
        <div className="bg-background/50 rounded-lg border border-border p-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{appStats.totalApps}+</div>
              <div className="text-sm text-muted-foreground">Bitcoin Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{Math.floor(appStats.totalDownloads / 1000000)}M+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">₿{Math.floor(appStats.totalApps / 4)}</div>
              <div className="text-sm text-muted-foreground">Funded Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">{Math.floor(appStats.totalApps * 0.8)}+</div>
              <div className="text-sm text-muted-foreground">Developers</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Build the Bitcoin Economy</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of developers building open-source applications for Bitcoin and its Layer-2 ecosystems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline">
              Developer Guide
            </Button>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
              Start Building
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}