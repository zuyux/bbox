import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
      <div className="rounded-3xl border border-border bg-card/80 p-10 text-center shadow-sm">
        <LoaderCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Loading</h2>
        <p className="text-sm text-muted-foreground">
          Please wait while we load the page.
        </p>
      </div>
    </div>
  );
}
