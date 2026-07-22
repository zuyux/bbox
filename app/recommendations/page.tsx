'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, Star } from 'lucide-react';

import IPFSImage from '@/components/IPFSImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BitcoinApp } from '@/lib/appsUtils';
import { extractIPFSHash } from '@/lib/ipfs-utils';

const DEFAULT_APP_IMAGE = '/bbox.png';

function AppLogo({ app }: { app: BitcoinApp }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showRemoteImage = Boolean(app.imgCID && extractIPFSHash(app.imgCID) && !imageFailed);

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#111] to-[#222] sm:h-20 sm:w-20">
      {showRemoteImage ? (
        <IPFSImage
          src={app.imgCID}
          alt={`${app.name} logo`}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Image src={DEFAULT_APP_IMAGE} alt={`Default logo for ${app.name}`} fill sizes="80px" className="object-cover" />
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  const [apps, setApps] = useState<BitcoinApp[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/interests', { cache: 'no-store' }),
      fetch('/api/bbox-apps', { cache: 'no-store' }),
    ])
      .then(async ([interestResponse, appResponse]) => {
        const [interestPayload, appPayload] = await Promise.all([
          interestResponse.json(),
          appResponse.json(),
        ]);

        if (!interestResponse.ok) throw new Error(interestPayload?.error || 'Unable to load your interests');
        if (!appResponse.ok) throw new Error(appPayload?.error || 'Unable to load apps');

        if (!cancelled) {
          setInterests(Array.isArray(interestPayload.tags) ? interestPayload.tags : []);
          setApps(Array.isArray(appPayload.apps) ? appPayload.apps : []);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load recommendations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const recommendations = useMemo(() => {
    const normalizedInterests = new Set(interests.map((interest) => interest.toLowerCase()));

    return apps
      .filter((app) => normalizedInterests.has(app.category.toLowerCase()))
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating || b.reviewCount - a.reviewCount);
  }, [apps, interests]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 pb-12 pt-24">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to interests
        </Link>

        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.24em] text-orange-500">Picked for you</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Recommended apps</h1>
          {!loading && interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest) => <Badge key={interest} variant="secondary">{interest}</Badge>)}
            </div>
          )}
        </div>

        {loading && <div className="py-12 text-center text-sm text-muted-foreground">Finding apps for you...</div>}

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && interests.length === 0 && (
          <div className="rounded-2xl border border-border p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold">Choose your interests first</h2>
            <p className="mb-5 text-sm text-muted-foreground">Select one or more categories on the home page to get personalized recommendations.</p>
            <Button asChild><Link href="/">Choose interests</Link></Button>
          </div>
        )}

        {!loading && !error && interests.length > 0 && recommendations.length === 0 && (
          <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            No matching apps are available yet. Try choosing another interest.
          </div>
        )}

        <div className="space-y-3">
          {recommendations.map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`} className="flex gap-4 rounded-xl border border-transparent p-4 transition hover:border-border hover:bg-muted/50">
              <AppLogo app={app} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{app.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{app.description}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-500 text-white">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary">{app.category}</Badge>
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{app.rating.toFixed(1)}</span>
                  {app.verified && <span className="flex items-center gap-1 text-green-600"><Shield className="h-3.5 w-3.5" />Verified</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
