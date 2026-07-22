"use client";



import { LocalizedText } from "@/components/LocalizedText";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCcw,
  Shield,
  Triangle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SubmittedApp = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon_cid?: string | null;
  version: string;
  website_url?: string;
  github_url?: string;
  documentation_url?: string;
  platforms: string[];
  supported_networks: string[];
  license: string;
  pricing_model: string;
  price_usd: number;
  accepts_lightning: boolean;
  lightning_address?: string;
  privacy_policy_url?: string;
  terms_of_service_url?: string;
  data_collection_summary?: string;
  open_source: boolean;
  publisher_address: string;
  publisher_name?: string;
  publisher_email: string;
  status: string;
  verified: boolean;
  featured: boolean;
  downloads: number;
  rating: number;
  created_at?: string;
  updated_at?: string;
};

const statusLabels: Record<string, { label: string; description: string }> = {
  pending: {
    label: "Pending Review",
    description: "Awaiting curator review",
  },
  approved: {
    label: "Approved",
    description: "Ready to publish",
  },
  rejected: {
    label: "Needs Changes",
    description: "Requires updates before approval",
  },
  draft: {
    label: "Draft",
    description: "Saved but not submitted",
  },
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  draft: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Needs Changes" },
];

const formatDate = (iso?: string | null) => {
  if (!iso) return "Unknown";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch (err) {
    console.warn("Unable to format date", err);
    return iso;
  }
};

const formatPrice = (price: number, model: string) => {
  if (model === "free" || price === 0) return "Free";
  if (!Number.isFinite(price)) return model;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export default function SubmittedAppsPage() {
  const [apps, setApps] = useState<SubmittedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/apps${params.size ? `?${params.toString()}` : ""}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load submissions (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Unexpected API response");
      }

      setApps(result.apps || []);
    } catch (err) {
      console.error("Failed to fetch apps", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const query = search.toLowerCase();
    return apps.filter((app) =>
      [
        app.name,
        app.category,
        app.publisher_name,
        app.publisher_email,
        app.publisher_address,
        ...(app.tags || []),
      ]
        .filter(Boolean)
        .some((field) => field!.toString().toLowerCase().includes(query))
    );
  }, [apps, search]);

  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((app) => app.status === "pending").length;
    const approved = apps.filter((app) => app.status === "approved").length;
    const rejected = apps.filter((app) => app.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [apps]);

  const getStatusBadge = (status: string) => {
    const style = statusColors[status] || "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100";
    const label = statusLabels[status]?.label || status;
    return <Badge className={`${style} font-medium`}>{label}</Badge>;
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-6xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2"><LocalizedText>Review Desk</LocalizedText></p>
            <h1 className="text-3xl font-bold"><LocalizedText>Submitted Apps</LocalizedText></h1>
            <p className="text-muted-foreground"><LocalizedText>Monitor every submission, track its review phase, and jump into a focused preview.</LocalizedText></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchApps} disabled={loading} className="cursor-pointer">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              <LocalizedText>Refresh
            </LocalizedText></Button>
            <Button asChild className="bg-foreground hover:bg-foreground cursor-pointer">
              <Link href="/submit" className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <LocalizedText>New Submission
              </LocalizedText></Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground"><LocalizedText>Total submissions</LocalizedText></CardTitle>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                <Triangle className="h-4 w-4 text-amber-500" /> <LocalizedText>Pending
              </LocalizedText></CardTitle>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> <LocalizedText>Approved
              </LocalizedText></CardTitle>
              <p className="text-3xl font-bold text-emerald-600">{stats.approved}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-4 w-4 text-red-500" /> <LocalizedText>Needs changes
              </LocalizedText></CardTitle>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1 w-full">
              <Input
                placeholder={"Search by app, publisher, address, or tag"}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-background text-foreground h-11"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 cursor-pointer">
                  <SelectValue placeholder={"Filter by status"} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-4 border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-red-700 dark:text-red-200"><LocalizedText>Unable to load submissions</LocalizedText></p>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
              <Button onClick={fetchApps} variant="outline" className="cursor-pointer"><LocalizedText>Retry</LocalizedText></Button>
            </CardContent>
          </Card>
        )}

        {loading && !apps.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p><LocalizedText>Fetching submissions…</LocalizedText></p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-24">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2"><LocalizedText>No submissions match your filters</LocalizedText></h3>
            <p className="text-muted-foreground mb-4">
              <LocalizedText>Adjust the search term or status filter to see other apps.
            </LocalizedText></p>
            <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="cursor-pointer">
              <LocalizedText>Reset filters
            </LocalizedText></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => (
              <Card key={app.id} className="border-border/60">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    {app.icon_cid && (
                      <div className="h-16 w-16 rounded-lg border border-dashed flex-shrink-0 bg-muted/60 flex items-center justify-center p-1">
                        <Image
                          src={`https://ipfs.io/ipfs/${app.icon_cid}`}
                          alt={`${app.name} icon`}
                          width={56}
                          height={56}
                          className="object-contain rounded-md"
                          unoptimized
                        />
                      </div>
                    )}
                    <CardTitle className="text-2xl font-semibold mb-1">{app.name}</CardTitle>
                    <p className="text-muted-foreground max-w-3xl">{app.description}</p>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {getStatusBadge(app.status)}
                      <Badge variant="secondary">{app.category}</Badge>
                      {app.open_source && (
                        <Badge variant="outline" className="text-green-600 border-green-200 dark:border-green-900 dark:text-green-300"><LocalizedText>Open Source</LocalizedText></Badge>
                      )}
                      {app.accepts_lightning && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-900 dark:text-amber-300">
                          <LocalizedText>Lightning-ready
                        </LocalizedText></Badge>
                      )}
                      {app.verified && (
                        <Badge variant="outline" className="text-sky-600 border-sky-200 dark:border-sky-900 dark:text-sky-300">
                          <LocalizedText>Verified
                        </LocalizedText></Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-right text-muted-foreground">
                    <p><LocalizedText>Submitted </LocalizedText>{formatDate(app.created_at)}</p>
                    <p><LocalizedText>Version </LocalizedText>{app.version}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1"><LocalizedText>Publisher</LocalizedText></p>
                      <p className="font-medium">{app.publisher_name || "—"}</p>
                      <p className="text-sm text-muted-foreground break-words">{app.publisher_email}</p>
                      <p className="text-sm text-muted-foreground break-all">{app.publisher_address}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1"><LocalizedText>Review notes</LocalizedText></p>
                      <p className="text-sm text-muted-foreground">
                        {statusLabels[app.status]?.description || "Status updated"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1"><LocalizedText>Last update </LocalizedText>{formatDate(app.updated_at)}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1"><LocalizedText>Pricing</LocalizedText></p>
                      <p className="font-medium">{formatPrice(app.price_usd, app.pricing_model)}</p>
                      {app.pricing_model !== "free" && (
                        <p className="text-sm text-muted-foreground"><LocalizedText>Model: </LocalizedText>{app.pricing_model}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1"><LocalizedText>Platforms</LocalizedText></p>
                      <p className="text-sm text-muted-foreground">{app.platforms?.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1"><LocalizedText>Networks</LocalizedText></p>
                      <p className="text-sm text-muted-foreground">{app.supported_networks?.join(", ") || "—"}</p>
                    </div>
                  </div>

                  {app.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {app.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="capitalize">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {app.lightning_address && (
                        <p><LocalizedText>⚡ Lightning address: </LocalizedText><span className="text-foreground font-medium">{app.lightning_address}</span></p>
                      )}
                      {app.website_url && (
                        <p><LocalizedText>🔗 Website: </LocalizedText><a href={app.website_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{app.website_url}</a></p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="cursor-pointer">
                        <Link href={`/preview/${app.id}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <LocalizedText>Preview / Review
                        </LocalizedText></Link>
                      </Button>
                      {app.website_url && (
                        <Button asChild variant="ghost" className="cursor-pointer">
                          <a href={app.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            <LocalizedText>Live site
                          </LocalizedText></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
