'use client';



import { LocalizedText } from '@/components/LocalizedText';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/components/WalletProvider';
import { signAppReview } from '@/lib/commentSigning';

interface ReviewComment {
  id: number | string;
  app_id: string;
  rating: number;
  reviewer_address: string;
  review_text: string;
  wallet_type?: string | null;
  created_at?: string | null;
}

type ReviewRatingSummary = {
  rating: number;
  reviewCount: number;
};

interface ReviewModalProps {
  open: boolean;
  appId: string;
  appName: string;
  onRatingChange?: (ratingSummary: ReviewRatingSummary) => void;
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

export default function ReviewModal({ open, appId, appName, onRatingChange, onClose }: ReviewModalProps) {
  const { address, walletType } = useWallet();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const reviewAppId = useMemo(() => appId.trim(), [appId]);

  const loadComments = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!reviewAppId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/app-reviews?appId=${encodeURIComponent(reviewAppId)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to load reviews');
      }

      const payload = await response.json();
      if (!signal?.cancelled) {
        setComments(payload.reviews || []);
        if (payload.ratingSummary) {
          onRatingChange?.(payload.ratingSummary);
        }
      }
    } catch (err) {
      if (!signal?.cancelled) {
        const message = err instanceof Error ? err.message : 'Unable to load reviews';
        setError(message);
      }
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [onRatingChange, reviewAppId]);

  useEffect(() => {
    if (!open) return;
    if (!reviewAppId) {
      setComments([]);
      setError("Review details are unavailable for this demo app.");
      setLoading(false);
      return;
    }

    const cancelToken = { cancelled: false };
    loadComments(cancelToken);
    return () => {
      cancelToken.cancelled = true;
    };
  }, [open, reviewAppId, loadComments]);

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

  const handleSubmit = async () => {
    if (!reviewAppId) {
      setSubmitError('Review details are unavailable for this app.');
      return;
    }
    if (!address || !walletType) {
      setSubmitError('Connect a Stacks browser wallet to leave a signed review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setSubmitError('Choose a rating between 1 and 5 stars.');
      return;
    }
    if (!reviewText.trim()) {
      setSubmitError('Write a short review before submitting.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const signature = await signAppReview({
        appId: reviewAppId,
        rating,
        reviewText: reviewText.trim(),
        address,
        walletType,
      });

      const response = await fetch('/api/app-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: reviewAppId,
          reviewerAddress: address,
          rating,
          reviewText: reviewText.trim(),
          walletType: signature.walletType,
          signature: signature.signature,
          signedPayload: signature.signedPayload,
          publicKey: signature.publicKey,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to submit review');
      }

      const payload = await response.json();
      if (payload.ratingSummary) {
        onRatingChange?.(payload.ratingSummary);
      }

      setRating(0);
      setReviewText('');
      await loadComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit review';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
          <div>
            <CardTitle className="text-lg"><LocalizedText>Reviews for </LocalizedText>{appName}</CardTitle>
            <p className="text-sm text-muted-foreground"><LocalizedText>See the latest signed review notes for this app.</LocalizedText></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
            aria-label={"Close reviews"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="rounded-3xl border border-border/70 bg-muted/50 p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-rating" className="text-sm font-semibold">
                <LocalizedText>Your rating
              </LocalizedText></Label>
              <div className="flex items-center gap-2" id="review-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`rounded-full p-2 transition ${star <= rating ? 'bg-yellow-500/15' : 'bg-surface hover:bg-muted'}`}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Image
                      src={star <= rating ? '/review-star.svg' : '/review-star-0.svg'}
                      alt=""
                      width={40}
                      height={40}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-text" className="text-sm font-semibold">
                <LocalizedText>Your review
              </LocalizedText></Label>
              <Textarea
                id="review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder={"Share your experience with this app..."}
                rows={4}
              />
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-700/70 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                <LocalizedText>Reviews are signed with your connected wallet to verify authenticity.
              </LocalizedText></p>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting review…" : "Sign & submit review"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> <LocalizedText>Loading reviews…
            </LocalizedText></div>
          ) : error ? (
            <div className="rounded-xl border border-red-700/70 bg-transparent p-4 text-sm text-red-700">
              {error}
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted p-6 text-sm text-muted-foreground text-center space-y-3">
              <p><LocalizedText>No reviews have been published for this app yet.</LocalizedText></p>
              <p className="text-xs text-muted-foreground/80">
                <LocalizedText>Leave the first signed review using the form above.
              </LocalizedText></p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Image
                            key={star}
                            src={star <= comment.rating ? '/review-star.svg' : '/review-star-0.svg'}
                            alt=""
                            width={28}
                            height={28}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1">{formatAddress(comment.reviewer_address)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{comment.review_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
