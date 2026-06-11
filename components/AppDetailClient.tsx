'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import IPFSImage from '@/components/IPFSImage';
import ReviewModal from '@/components/ReviewModal';
import {
  Star,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import type { BitcoinApp } from '@/lib/appsUtils';

interface AppDetailClientProps {
  app: BitcoinApp;
  relatedApps: BitcoinApp[];
}

export default function AppDetailClient({ app, relatedApps }: AppDetailClientProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Back Button */}
        <Button variant="link" className="mb-4" asChild>
          <Link href="/apps">
            <ArrowLeft className="-ml-3 mr-2 h-4 w-4" />
          </Link>
        </Button>

        {/* App Header - Compact Design */}
        <div className="mb-6">
          <div className="flex gap-4 items-start mb-4">
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#fff] to-[#f1f1f1] rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md overflow-hidden">
                {app.imgCID ? (
                  <IPFSImage
                    src={app.imgCID}
                    alt={`${app.name} logo`}
                    className="object-cover"
                    fill
                    sizes="96px"
                  />
                ) : (
                  app.name.charAt(0)
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold break-words">{app.name}</h1>
                {app.verified && (
                  <Badge className="bg-transparent text-foreground hover:bg-green-600 flex-shrink-0 text-xs">
                    <Image src="/verified.svg" height={21} width={21} alt="Verified" />
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
                <Badge variant="secondary" className="text-xs">
                  {app.category}
                </Badge>
                <Button
                  className="h-6 px-4 py-1 bg-green-500 hover:bg-green-600 text-white text-xs"
                  asChild
                >
                  <a href={app.link} target="_blank" rel="noopener noreferrer" className="hover:underline-offset-3">
                    VISIT
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {app.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

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
          <Button
            variant="link"
            className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600"
            onClick={() => setShowReviewModal(true)}
          >
            See All Reviews
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        <div className="mb-6 pb-6 border-b">
          <h3 className="text-base font-semibold mb-3">Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Category</span>
                <div className="font-medium">{app.category}</div>
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedApps.map(relatedApp => (
                <Link key={relatedApp.id} href={`/apps/${relatedApp.id}`} className="group">
                  <div className="h-full rounded-2xl border border-border/50 p-4 hover:border-border transition-colors">
                    <div className="relative mb-3 aspect-square rounded-2xl bg-background flex items-center justify-center text-white text-2xl font-bold shadow-sm overflow-hidden">
                      {relatedApp.imgCID ? (
                        <IPFSImage
                          src={relatedApp.imgCID}
                          alt={`${relatedApp.name} logo`}
                          className="object-cover"
                          fill
                          sizes="96px"
                        />
                      ) : (
                        relatedApp.name.charAt(0)
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-0.5 break-words line-clamp-1">{relatedApp.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{relatedApp.category}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="font-medium">{relatedApp.rating}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showReviewModal && (
        <ReviewModal
          open={showReviewModal}
          appId={app.id}
          appName={app.name}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
