'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Download, 
  ArrowLeft,
  Smartphone,
  Monitor,
  Globe,
  Lock,
  ArrowRight
} from 'lucide-react';
import { allApps } from '@/lib/appsUtils';

export default function AppDetailPage() {
  const params = useParams();
  const appId = parseInt(params.id as string);
  
  const app = allApps.find(a => a.id === appId);
  
  if (!app) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 pb-12">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">App Not Found</h1>
            <p className="text-muted-foreground mb-6">The app you&apos;re looking for doesn&apos;t exist.</p>
            <Button asChild>
              <Link href="/apps">
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get related apps from the same category
  const relatedApps = allApps
    .filter(a => a.category === app.category && a.id !== app.id)
    .slice(0, 4);

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/apps">
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Link>
        </Button>

        {/* App Header - Compact Design */}
        <div className="mb-6">
          <div className="flex gap-4 items-start mb-4">
            {/* App Icon */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md">
                {app.name.charAt(0)}
              </div>
            </div>
            
            {/* App Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold break-words">{app.name}</h1>
                {app.verified && (
                  <Badge className="bg-green-500 text-white hover:bg-green-600 flex-shrink-0 text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2 break-words line-clamp-2">
                {app.description}
              </p>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <span className="break-words">{app.link.replace(/^https?:\/\//, '')}</span>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{app.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{app.downloads}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {app.category}
                </Badge>
              </div>

              <Button 
                size="sm" 
                className="bg-green-500 hover:bg-green-600 text-white font-medium"
                asChild
              >
                <a href={app.link} target="_blank" rel="noopener noreferrer">
                  GET
                </a>
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {app.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Screenshots */}
        <div className="mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
            <div className="w-56 sm:w-64 h-40 sm:h-48 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 border">
              <Smartphone className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="w-56 sm:w-64 h-40 sm:h-48 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 border">
              <Monitor className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="w-56 sm:w-64 h-40 sm:h-48 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 border">
              <Globe className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            The Bitcoin.com Wallet: Your Self-Custody Bitcoin & Crypto DeFi Wallet
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            The most secure, easy-to-use multichain crypto wallet that gives you full control of your assets.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Buy, sell, send, receive, and swap major cryptocurrencies:
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bitcoin (BTC), Bitcoin Cash (BCH), Ethereum (ETH), Avalanche (AVAX), Polygon (MATIC), BNB Smart...
          </p>
          <Button variant="link" className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600">
            more
          </Button>
        </div>

        {/* App Privacy Section */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            App Privacy
          </h3>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>• No data is sent outside the network</p>
            <p>• Data exchange does not depend on external servers</p>
            <p>• Open-source Bitcoin application</p>
          </div>
          <Button variant="link" className="p-0 h-auto mt-2 text-sm text-blue-500 hover:text-blue-600">
            See Details
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Ratings & Reviews */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3">Ratings & Reviews</h3>
          <div className="flex items-center gap-6 mb-3">
            <div className="text-5xl font-bold">{app.rating}</div>
            <div>
              <div className="flex items-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star 
                    key={i} 
                    className={`w-3.5 h-3.5 ${i <= Math.floor(app.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Based on user ratings</p>
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600">
            See All Reviews
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Information Section */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3">Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Category</span>
                <div className="font-medium">{app.category}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Downloads</span>
                <div className="font-medium">{app.downloads}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Rating</span>
                <div className="font-medium">{app.rating} / 5.0</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Verified</span>
                <div className="font-medium">{app.verified ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Website</span>
              <div className="font-medium text-sm break-all">
                <a 
                  href={app.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline"
                >
                  {app.link}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Apps */}
        {relatedApps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">More {app.category} Apps</h3>
              <Button variant="link" asChild className="text-sm text-blue-500 hover:text-blue-600 p-0 h-auto">
                <Link href="/apps">
                  See All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            
            {/* Horizontal Scrolling Slider */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scroll-smooth snap-x snap-mandatory">
              {relatedApps.map(relatedApp => (
                <Link key={relatedApp.id} href={`/apps/${relatedApp.id}`} className="flex-shrink-0 snap-start">
                  <div className="hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-28 sm:w-32 h-28 sm:h-32 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-2 shadow-sm">
                      {relatedApp.name.charAt(0)}
                    </div>
                    <div className="w-28 sm:w-32">
                      <h4 className="font-medium text-xs mb-0.5 break-words line-clamp-1">{relatedApp.name}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{relatedApp.category}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium">{relatedApp.rating}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
