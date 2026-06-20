'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Coins,
  ExternalLink,
  Loader2,
  Send,
  ThumbsUp,
  CheckCircle2,
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import {
  approveAppOnChain,
  getAdminAddress,
  getBboxContractAddress,
  sendSbtcDonation,
  voteOnApp,
  satsToBTC,
} from '@/lib/bbox-contract';
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from '@/lib/developerMode';
import { getProfileDeveloperMode } from '@/lib/profileApi';

interface FundingApp {
  id: number;
  contractAppId: number | null;
  contractNetwork: string | null;
  contractTxId: string | null;
  status: string;
  featured: boolean;
  verified: boolean;
  publisherAddress: string;
  publisherName: string;
  publisherEmail: string;
  metadataCid: string | null;
  name: string;
  description: string;
  category: string;
  tags: string[];
  websiteUrl?: string | null;
  lightningAddress?: string | null;
  acceptsLightning?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

type RawSupabaseApp = Record<string, unknown> & {
  [key: string]: unknown;
};

export default function FundingDashboardPage() {
  const currentAddress = useCurrentAddress();
  const [apps, setApps] = useState<FundingApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [donatingId, setDonatingId] = useState<number | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [donationInputs, setDonationInputs] = useState<Record<number, string>>({});
  const [donationNotes, setDonationNotes] = useState<Record<number, string>>({});
  const [developerMode, setDeveloperMode] = useState(false);

  const [contractId] = useState(() => getBboxContractAddress());
  const normalizedCurrentAddress = currentAddress?.toLowerCase() ?? null;
  const normalizedAdminAddress = adminAddress?.toLowerCase() ?? null;
  const isAdmin = Boolean(
    normalizedCurrentAddress && normalizedAdminAddress && normalizedCurrentAddress === normalizedAdminAddress
  );

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/apps', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Unable to load submissions');
      }

      const payload = await response.json();
      const supabaseApps: FundingApp[] = (payload.apps ?? []).map((app: RawSupabaseApp) => {
        const tags = Array.isArray(app.tags) ? (app.tags as string[]) : [];
        return {
          id: Number(app.id) || 0,
          contractAppId: typeof app.contract_app_id === 'number' ? app.contract_app_id : null,
          contractNetwork: typeof app.contract_network === 'string' ? app.contract_network : null,
          contractTxId: typeof app.contract_txid === 'string' ? app.contract_txid : null,
          status: String(app.status || 'pending'),
          featured: Boolean(app.featured),
          verified: Boolean(app.verified),
          publisherAddress: String(app.publisher_address || ''),
          publisherName: String(app.publisher_name || ''),
          publisherEmail: String(app.publisher_email || ''),
          metadataCid: typeof app.metadata_cid === 'string' ? app.metadata_cid : null,
          name: String(app.name || 'Untitled submission'),
          description: String(app.description || 'Description pending review'),
          category: String(app.category || 'Uncategorized'),
          tags,
          websiteUrl: typeof app.website_url === 'string' ? app.website_url : null,
          lightningAddress: typeof app.lightning_address === 'string' ? app.lightning_address : null,
          acceptsLightning: Boolean(app.accepts_lightning),
          createdAt: typeof app.created_at === 'string' ? app.created_at : null,
          updatedAt: typeof app.updated_at === 'string' ? app.updated_at : null,
        } satisfies FundingApp;
      });

      supabaseApps.sort((a, b) => {
        const left = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const right = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return right - left;
      });
      setApps(supabaseApps);
    } catch (err) {
      console.error('Error loading apps from Supabase', err);
      setError(err instanceof Error ? err.message : 'Unable to load apps from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  useEffect(() => {
    let cancelled = false;

    const syncDeveloperMode = async () => {
      if (!currentAddress) {
        setDeveloperMode(isDeveloperModeEnabled());
        return;
      }

      try {
        const savedDeveloperMode = await getProfileDeveloperMode(currentAddress);
        if (cancelled) return;
        setDeveloperMode(savedDeveloperMode);
        setDeveloperModeEnabled(savedDeveloperMode);
      } catch (error) {
        console.warn('Unable to load Developer Mode from profile:', error);
        if (!cancelled) {
          setDeveloperMode(isDeveloperModeEnabled());
        }
      }
    };

    syncDeveloperMode();
    window.addEventListener('storage', syncDeveloperMode);
    window.addEventListener('bbox-developer-mode-change', syncDeveloperMode);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncDeveloperMode);
      window.removeEventListener('bbox-developer-mode-change', syncDeveloperMode);
    };
  }, [currentAddress]);

  useEffect(() => {
    getAdminAddress().then(setAdminAddress).catch((err) => {
      console.warn('Unable to fetch admin address', err);
    });
  }, []);

  const pendingApps = useMemo(
    () => apps.filter((app) => app.status?.toLowerCase() === 'pending'),
    [apps]
  );

  const publishedApps = useMemo(
    () =>
      apps.filter((app) => {
        const status = app.status?.toLowerCase();
        return status === 'active' || status === 'approved' || status === 'published';
      }),
    [apps]
  );

  const featuredApps = useMemo(
    () => publishedApps.filter((app) => app.featured),
    [publishedApps]
  );

  const fundableApps = useMemo(
    () => publishedApps.filter((app) => !app.featured),
    [publishedApps]
  );

  const stats = useMemo(
    () => ({
      total: apps.length,
      pending: pendingApps.length,
      published: publishedApps.length,
      featured: featuredApps.length,
    }),
    [apps.length, pendingApps.length, publishedApps.length, featuredApps.length]
  );

  const formatTimestamp = (value?: string | null) => {
    if (!value) {
      return 'Timestamp pending';
    }
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      return value;
    }
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(time));
  };

  const handleApprove = async (app: FundingApp) => {
    if (!isAdmin) {
      setError('Only the contract admin can approve apps on-chain');
      return;
    }
    if (app.contractAppId === null) {
      setError('This submission is not yet linked to an on-chain app ID');
      return;
    }
    setApprovingId(app.contractAppId);
    try {
      await approveAppOnChain(app.contractAppId, () => {
        fetchApps();
      });
    } catch (err) {
      console.error('Approve on-chain failed', err);
      setError(err instanceof Error ? err.message : 'Failed to approve app');
    } finally {
      setApprovingId(null);
    }
  };

  const handleVote = async (app: FundingApp) => {
    if (!currentAddress) {
      setError('Connect your wallet to vote');
      return;
    }
    if (app.contractAppId === null) {
      setError('Voting is only available once the submission is on-chain');
      return;
    }
    setVotingId(app.contractAppId);
    try {
      await voteOnApp(app.contractAppId, 'upvote', () => {
      });
    } catch (err) {
      console.error('Vote failed', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleDonate = async (app: FundingApp) => {
    if (!currentAddress) {
      setError('Connect your wallet to fund apps');
      return;
    }
    const rawAmount = donationInputs[app.id]?.trim();
    if (!rawAmount || !/^\d+$/.test(rawAmount)) {
      setError('Enter a valid sBTC amount in satoshis');
      return;
    }
    const amount = BigInt(rawAmount);
    if (amount <= 0) {
      setError('Donation amount must be greater than zero');
      return;
    }
    setDonatingId(app.id);
    try {
      await sendSbtcDonation({
        amount,
        senderAddress: currentAddress,
        recipientAddress: app.publisherAddress,
        memo: donationNotes[app.id]?.trim() || `bbox-funding-${app.contractAppId ?? app.id}`,
        onFinish: () => {
        },
      });
    } catch (err) {
      console.error('Donation failed', err);
      setError(err instanceof Error ? err.message : 'Failed to send donation');
    } finally {
      setDonatingId(null);
    }
  };

  const renderAppCard = (app: FundingApp, showAdminActions = false) => {
    const name = app.name || `App #${app.contractAppId ?? app.id}`;
    const description = app.description || 'Metadata pending review';
    const category = app.category || 'Uncategorized';
    const publisherName = app.publisherName || 'Unknown publisher';
    const publisherEmail = app.publisherEmail || 'Not provided';
    const websiteUrl = app.websiteUrl;
    const tags = app.tags ?? [];
    const contractReady = app.contractAppId !== null;
    const isVoting = contractReady && votingId === app.contractAppId;
    const isApproving = contractReady && approvingId === app.contractAppId;

    return (
      <Card key={`${app.id}-${app.contractAppId ?? 'offchain'}`} className="border-border/70">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold flex items-center gap-3">
            {name}
            <Badge variant="secondary" className="capitalize">{category}</Badge>
            <Badge variant="outline" className="capitalize">{app.status}</Badge>
            {app.featured && (
              <Badge variant="default" className="bg-purple-600 text-white">Featured</Badge>
            )}
          </CardTitle>
          <p className="text-muted-foreground mt-2 max-w-3xl">{description}</p>
        </div>
        <div className="text-sm text-muted-foreground text-right">
          <p>Publisher: {publisherName}</p>
          <p className="break-words">{app.publisherAddress}</p>
          <p>{formatTimestamp(app.updatedAt)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Contact</p>
            <p className="text-sm break-words">{publisherEmail}</p>
            {websiteUrl && (
              <p className="text-sm text-primary flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  Visit Website
                </a>
              </p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Metadata</p>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 6).map((tag) => (
                <Badge key={tag} variant="outline" className="capitalize">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Coins className="h-4 w-4 text-orange-500" />
            Community Funding
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-foreground">
                Amount
              </label>
              <Input
                type="number"
                min="0"
                value={donationInputs[app.id] ?? ''}
                onChange={(event) =>
                  setDonationInputs((prev) => ({ ...prev, [app.id]: event.target.value }))
                }
                placeholder="e.g. 10000"
                className="bg-background text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                ≈ {satsToBTC(BigInt(donationInputs[app.id] || '0'))} sBTC
              </p>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Note (optional)
              </label>
              <Textarea
                rows={2}
                value={donationNotes[app.id] ?? ''}
                onChange={(event) =>
                  setDonationNotes((prev) => ({ ...prev, [app.id]: event.target.value }))
                }
                placeholder="Optional memo included with your transfer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleDonate(app)}
                disabled={donatingId === app.id || !currentAddress}
                className="bg-foreground hover:bg-foreground cursor-pointer"
              >
                {donatingId === app.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Awaiting wallet…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Donate
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleVote(app)}
                disabled={isVoting || !currentAddress || !contractReady}
                className="cursor-pointer"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Waiting on wallet…
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Upvote on-chain
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {showAdminActions && isAdmin && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/40">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Admin Controls
            </div>
            <Button
              onClick={() => handleApprove(app)}
              disabled={!contractReady || isApproving}
              className="bg-foreground hover:bg-foreground cursor-pointer w-fit"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Confirm in wallet…
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Approve on-chain
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Only the contract admin ({adminAddress ?? 'unknown'}) can successfully approve apps on-chain.
            </p>
            <p className="text-xs text-muted-foreground">
              {contractReady
                ? `On-chain App ID: #${app.contractAppId}`
                : 'Waiting for bbox-v2 transaction to confirm'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Funding Desk</p>
            <h1 className="text-3xl font-bold">Support open-source apps</h1>
            <p className="text-muted-foreground max-w-2xl">
              Support promising verified software directly with sBTC and upvote useful apps on-chain.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Showing Supabase submissions (linked to <span className="font-mono">{contractId}</span> when on-chain)
            </p>
          </div>
          {developerMode && (
            <Button asChild className="bg-foreground hover:bg-foreground cursor-pointer">
              <Link href="/submit" className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Submit new app
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total apps</CardTitle>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                Pending approvals
              </CardTitle>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                Published apps
              </CardTitle>
              <p className="text-3xl font-bold text-emerald-600">{stats.published}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                Featured
              </CardTitle>
              <p className="text-3xl font-bold text-purple-600">{stats.featured}</p>
            </CardHeader>
          </Card>
        </div>

        {error && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20">
            <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-red-700 dark:text-red-200">{error}</p>
                <p className="text-sm text-red-600 dark:text-red-300">Try refreshing or checking your wallet connection.</p>
              </div>
              <Button variant="outline" onClick={fetchApps} className="cursor-pointer">Reload</Button>
            </CardContent>
          </Card>
        )}

        {loading && !apps.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading funding data…</p>
          </div>
        ) : (
          <div className="space-y-6">
            {featuredApps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  Featured Apps
                </div>
                {featuredApps.map((app) => renderAppCard(app))}
              </div>
            )}

            {fundableApps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  Published Apps
                </div>
                {fundableApps.map((app) => renderAppCard(app))}
              </div>
            )}

            {pendingApps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  Pending On-Chain Submissions
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    These apps are still pending review. Admin-only controls appear when connected with the bbox-v2 admin wallet.
                  </p>
                )}
                {pendingApps.map((app) => renderAppCard(app, true))}
              </div>
            )}

            {featuredApps.length === 0 && fundableApps.length === 0 && pendingApps.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No published apps on-chain yet. Check back after the next approval cycle.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
