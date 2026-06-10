import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-5xl space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-14 w-3/5 max-w-lg bg-white/10" />
          <Skeleton className="h-6 w-1/2 max-w-sm bg-white/10" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
              <Skeleton className="h-48 w-full bg-white/10" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-5 w-4/5 bg-white/10" />
                <Skeleton className="h-4 w-2/3 bg-white/10" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Skeleton className="h-10 w-1/2 bg-white/10" />
                <Skeleton className="h-10 w-1/3 bg-white/10" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex items-center gap-4">
            <LoaderCircle className="animate-spin text-primary" size={28} />
            <div>
              <p className="text-sm text-muted-foreground">Loading content...</p>
              <p className="text-xs text-muted-foreground">If this takes longer than a few seconds, please refresh the page.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
