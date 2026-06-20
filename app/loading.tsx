import { LoaderCircle } from 'lucide-react';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
        <LoaderCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
