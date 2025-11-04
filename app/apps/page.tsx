'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Star, 
  Download, 
  Shield, 
  Zap, 
  Coins, 
  Code, 
  Globe
} from 'lucide-react';
import { getAppsByCategory, getCategoryStats, searchApps } from '@/lib/appsUtils';

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
      
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-4xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search Bitcoin Apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl bg-muted/50 border-0 placeholder:text-foreground/50"
            />
          </div>
        </div>

        {/* Category Pills - 2 Rows */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full whitespace-nowrap text-xs cursor-pointer"
            >
              All Apps
            </Button>
            {categories.map(category => {
              const Icon = categoryIcons[category] || Code;
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full whitespace-nowrap flex items-center justify-center gap-1 text-xs cursor-pointer"
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{category}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Apps List */}
        <div className="space-y-4">
          {filteredApps.map((app, index) => (
            <Link key={app.id} href={`/apps/${app.id}`}>
              <div className="flex gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                {/* App Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-sm">
                    {app.name.charAt(0)}
                  </div>
                </div>
                
                {/* App Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg break-words line-clamp-1">{app.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 break-words mb-2">
                        {app.description}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full px-6 flex-shrink-0"
                    >
                      GET
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{app.rating}</span>
                    </div>
                    <span>•</span>
                    <span>{app.category}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{app.downloads}</span>
                    </div>
                    {app.verified && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1 text-green-600">
                          <Shield className="w-3 h-3" />
                          <span className="font-medium">Verified</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {app.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {app.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        +{app.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {index < filteredApps.length - 1 && (
                <div className="h-px bg-border ml-24" />
              )}
            </Link>
          ))}
        </div>
        
        {filteredApps.length === 0 && (
          <div className="text-center py-16">
            <div className="text-muted-foreground text-lg mb-2">No apps found</div>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}