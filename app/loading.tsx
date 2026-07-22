import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
      <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}
