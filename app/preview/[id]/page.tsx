
import { LocalizedText } from "@/components/LocalizedText";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Github,
  Globe,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { SubmissionComments } from "@/components/SubmissionComments";
import FundPublisherButton from "@/components/FundPublisherButton";

const statusMeta: Record<
  string,
  { label: string; helper: string; tone: string; border: string }
> = {
  pending: {
    label: "Pending Review",
    helper: "Awaiting curator approval",
    tone: "text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/60",
  },
  approved: {
    label: "Approved",
    helper: "Cleared to publish",
    tone: "text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900/60",
  },
  rejected: {
    label: "Needs Changes",
    helper: "Requires updates before launch",
    tone: "text-red-700 bg-red-50 dark:text-red-200 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/60",
  },
  draft: {
    label: "Draft",
    helper: "Not yet submitted",
    tone: "text-slate-700 bg-slate-50 dark:text-slate-200 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const textOrDash = (value?: string | null) => (value && value.trim() ? value : "—");

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PreviewAppPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const appId = Number(id);
  if (Number.isNaN(appId)) {
    notFound();
  }

  const { data: app, error } = await supabaseAdmin
    .from("apps")
    .select("*")
    .eq("id", appId)
    .single();

  if (!app || error) {
    console.error("Unable to load app", error);
    notFound();
  }

  const status = statusMeta[app.status] || statusMeta.pending;
  const tags: string[] = Array.isArray(app.tags) ? app.tags : [];
  const platforms: string[] = Array.isArray(app.platforms) ? app.platforms : [];
  const networks: string[] = Array.isArray(app.supported_networks) ? app.supported_networks : [];

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <Button variant="ghost" asChild className="w-fit px-0 text-muted-foreground hover:text-foreground">
            <Link href="/submit/review" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <LocalizedText>Back to submissions
            </LocalizedText></Link>
          </Button>
          {app.website_url && (
            <Button asChild variant="outline" className="cursor-pointer">
              <a href={app.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <LocalizedText>Open live site
              </LocalizedText></a>
            </Button>
          )}
        </div>

        <Card className={`mb-6 ${status.border}`}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                <div>
                <CardTitle className="mb-2 text-3xl font-bold">{app.name}</CardTitle>
                <p className="text-muted-foreground mt-2">{app.description}</p>
                <p className={`inline-flex items-center gap-2 rounded-full mt-2 px-3 py-1 text-xs font-semibold ${status.tone}`}>
                  <ShieldCheck className="h-4 w-4" />
                  {status.label}
                </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <p><LocalizedText>Submitted &nbsp; </LocalizedText>{formatDate(app.created_at)}</p>
                <p><LocalizedText>Updated &nbsp; </LocalizedText>{formatDate(app.updated_at)}</p>
                <p>V. {textOrDash(app.version)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{textOrDash(app.category)}</Badge>
              {app.open_source && <Badge variant="outline"><LocalizedText>Open source</LocalizedText></Badge>}
              {app.accepts_lightning && <Badge variant="outline"><LocalizedText>Lightning enabled</LocalizedText></Badge>}
              {app.verified && <Badge variant="outline"><LocalizedText>Verified</LocalizedText></Badge>}
              {app.featured && <Badge variant="outline"><LocalizedText>Featured</LocalizedText></Badge>}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Pricing</LocalizedText></p>
                <p className="text-lg font-semibold">
                  {app.pricing_model === "free" || app.price_usd === 0
                    ? "Free"
                    : `$${app.price_usd?.toLocaleString()}`}
                </p>
                {app.pricing_model !== "free" && (
                  <p className="text-sm text-muted-foreground"><LocalizedText>Model: </LocalizedText>{textOrDash(app.pricing_model)}</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Lightning</LocalizedText></p>
                {app.accepts_lightning ? (
                  <p className="flex items-center gap-2 text-foreground">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {textOrDash(app.lightning_address)}
                  </p>
                ) : (
                  <p className="text-muted-foreground"><LocalizedText>No Lightning payments yet</LocalizedText></p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl"><LocalizedText>Product Surface</LocalizedText></CardTitle>
            <p className="text-sm text-muted-foreground"><LocalizedText>Networks, platforms, and public links to verify</LocalizedText></p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Platforms</LocalizedText></p>
                <p className="text-sm text-foreground">{platforms.length ? platforms.join(", ") : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Networks</LocalizedText></p>
                <p className="text-sm text-foreground">{networks.length ? networks.join(", ") : "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {app.website_url && (
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <a href={app.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <LocalizedText>Website
                  </LocalizedText></a>
                </Button>
              )}
              {app.github_url && (
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <a href={app.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <LocalizedText>GitHub
                  </LocalizedText></a>
                </Button>
              )}
              {app.documentation_url && (
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <a href={app.documentation_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <LocalizedText>Docs
                  </LocalizedText></a>
                </Button>
              )}
              {app.privacy_policy_url && (
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <a href={app.privacy_policy_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <LocalizedText>Privacy
                  </LocalizedText></a>
                </Button>
              )}
              {app.terms_of_service_url && (
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <a href={app.terms_of_service_url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <LocalizedText>Terms
                  </LocalizedText></a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl"><LocalizedText>Publisher & Review Trail</LocalizedText></CardTitle>
            <p className="text-sm text-muted-foreground"><LocalizedText>Contact data and timestamps for audit trail</LocalizedText></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Publisher</LocalizedText></p>
                <p className="text-lg font-semibold">{textOrDash(app.publisher_name)}</p>
                <p className="text-sm text-muted-foreground break-all">{textOrDash(app.publisher_address)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Contact</LocalizedText></p>
                <p className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${app.publisher_email}`} className="text-primary hover:underline">
                    {app.publisher_email}
                  </a>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold"><LocalizedText>Support this app</LocalizedText></p>
                  <p className="text-xs text-muted-foreground">
                    <LocalizedText>Send sBTC directly to support </LocalizedText>{app.publisher_name || app.name}.
                  </p>
                </div>
                <FundPublisherButton
                  appName={app.name}
                  publisherName={app.publisher_name}
                  publisherAddress={app.publisher_address || ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Status</LocalizedText></p>
                <p className="font-semibold">{status.label}</p>
                <p className="text-sm text-muted-foreground">{status.helper}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Created</LocalizedText></p>
                <p>{formatDate(app.created_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1"><LocalizedText>Updated</LocalizedText></p>
                <p>{formatDate(app.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl"><LocalizedText>Data & Compliance Notes</LocalizedText></CardTitle>
            <p className="text-sm text-muted-foreground"><LocalizedText>Everything the submitter disclosed for reviewers</LocalizedText></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground mb-1"><LocalizedText>Data collection summary</LocalizedText></p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{textOrDash(app.data_collection_summary)}</p>
            </div>
          </CardContent>
        </Card>

        <SubmissionComments appId={app.id} appName={app.name} />
      </div>
    </div>
  );
}
