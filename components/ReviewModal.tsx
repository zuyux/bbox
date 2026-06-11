'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CardContent, CardTitle } from '@/components/ui/card';

interface ReviewComment {
  id: number | string;
  app_id: number;
  address: string;
  message: string;
  wallet_type?: string | null;
  created_at?: string | null;
}

interface ReviewModalProps {
  open: boolean;
  appId: string;
  appName: string;
  onClose: () => void;
}

const formatAddress = (address: string) => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'just now';

  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function ReviewModal({ open, appId, appName, onClose }: ReviewModalProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const numericAppId = useMemo(() => {
    const parsed = Number(appId);
    return Number.isNaN(parsed) ? null : parsed;
  }, [appId]);

  useEffect(() => {
    if (!open) return;
    if (numericAppId === null) {
      setComments([]);
      setError('Review details are unavailable for this demo app.');
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const loadComments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/comments?appId=${numericAppId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Unable to load reviews');
        }

        const payload = await response.json();
        if (!isCancelled) {
          setComments(payload.comments || []);
        }
      } catch (err) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load reviews';
          setError(message);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadComments();
    return () => {
      isCancelled = true;
    };
  }, [open, numericAppId]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
          <div>
            <CardTitle className="text-lg">Reviews for {appName}</CardTitle>
            <p className="text-sm text-muted-foreground">See the latest signed review notes for this app.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
            aria-label="Close reviews"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CardContent className="space-y-4 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reviews…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-700/70 bg-transparent p-4 text-sm text-red-700">
              {error}
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted p-6 text-sm text-muted-foreground text-center space-y-3">
              <p>No reviews have been published for this app yet.</p>
              <p className="text-xs text-muted-foreground/80">
                If you are reviewing this app, open the app preview and leave a signed review note.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-foreground">{formatAddress(comment.address)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
