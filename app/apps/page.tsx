'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Download, 
  Shield, 
  Zap, 
  Coins, 
  Code, 
  Globe, 
  Filter,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Monitor,
  Lock
} from 'lucide-react';
import { allApps, getAppsByCategory, getCategoryStats, searchApps, BitcoinApp } from '@/lib/appsUtils';

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

// Featured app for the hero section (highest rated verified app)
const featuredApp = allApps
  .filter(app => app.verified)
  .sort((a, b) => b.rating - a.rating)[0];

function AppCard({ app, featured = false }: { app: BitcoinApp; featured?: boolean }) {
  if (featured) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* App Icon */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {app.name.charAt(0)}
              </div>
            </div>
            
            {/* App Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-bold">{app.name}</h1>
                {app.verified && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Shield className="w-4 h-4 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                {app.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start">
                {app.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center gap-6 mb-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">{app.rating}</span>
                  <span className="text-muted-foreground">No ratings yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold">{app.downloads}</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {app.category}
                </Badge>
              </div>
              
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8">
                CONNECT
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Screenshots placeholder */}
          <div className="mt-8 flex gap-4 justify-center">
            <div className="w-64 h-48 bg-muted rounded-lg flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="w-64 h-48 bg-muted rounded-lg flex items-center justify-center">
              <Monitor className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="w-64 h-48 bg-muted rounded-lg flex items-center justify-center">
              <Globe className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {app.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg truncate">{app.name}</CardTitle>
              {app.verified && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
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
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-3">
          {app.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {app.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{app.tags.length - 3}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{app.rating}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="w-4 h-4" />
              {app.downloads}
            </div>
          </div>
          <Button size="sm" variant="outline" className="group-hover:bg-orange-500 group-hover:text-white transition-colors">
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const categoryStats = getCategoryStats();
  const categories = Object.keys(categoryStats);
  
  const filteredApps = selectedCategory === 'all' 
    ? searchApps(searchQuery)
    : getAppsByCategory(selectedCategory).filter(app => 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12">
        {/* Featured App Hero */}
        <div className="mb-12">
          <AppCard app={featuredApp} featured={true} />
        </div>

        {/* App Privacy Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              App Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• No data is sent outside the network</p>
              <p>• No data exchange does not depend on external servers</p>
              <p>• This developer has not specified sharing in Finnish</p>
            </div>
            <Button variant="link" className="p-0 h-auto mt-2">
              See Details
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Ratings & Reviews */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ratings & Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-6xl font-bold">0.0</div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-4 h-4 text-gray-300" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">No Ratings yet</p>
              </div>
            </div>
            <Button variant="link" className="p-0 h-auto">
              See All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Information Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Provider:</span>
                <div className="font-medium">SDR Film LLC</div>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <div className="font-medium">294 MB</div>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <div className="font-medium">Finance</div>
              </div>
              <div>
                <span className="text-muted-foreground">Compatibility:</span>
                <div className="font-medium">Age Rating: 4+</div>
              </div>
              <div>
                <span className="text-muted-foreground">Languages:</span>
                <div className="font-medium">English, Dutch, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Polish, Portuguese, Russian, Simplified Chinese, Spanish, Swedish, Thai, Traditional Chinese, Turkish, Vietnamese</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bitcoin apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:grid-cols-8">
            <TabsTrigger value="all">All Apps</TabsTrigger>
            {categories.slice(0, 7).map(category => {
              const Icon = categoryIcons[category] || Code;
              return (
                <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{category}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Apps Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {selectedCategory === 'all' ? 'All Apps' : `${selectedCategory} Apps`}
              <span className="text-lg font-normal text-muted-foreground ml-2">
                ({filteredApps.length})
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
          
          {filteredApps.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No apps found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* More of this developer */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>More of this developer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-32 h-32 bg-muted rounded-lg mx-auto"></div>
          </CardContent>
        </Card>

        {/* You Might Also Like */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">You Might Also Like</h2>
            <Button variant="link">
              See All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allApps.slice(0, 4).map(app => (
              <Card key={app.id} className="h-full">
                <CardContent className="p-4">
                  <div className="w-full h-32 bg-muted rounded-lg mb-4"></div>
                  <h3 className="font-medium text-sm mb-1 truncate">{app.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{app.description}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{app.rating}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}