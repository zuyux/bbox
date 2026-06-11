'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useWallet } from '@/components/WalletProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { signSubmissionComment } from '@/lib/commentSigning';

interface SubmissionComment {
  id: number | string;
  app_id: number;
  address: string;
  message: string;
  wallet_type?: string | null;
  created_at?: string | null;
}

interface SubmissionCommentsProps {
  appId: number;
  appName: string;
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

export function SubmissionComments({ appId, appName }: SubmissionCommentsProps) {
  const { address, walletType } = useWallet();
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentValue, setCommentValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'posting'>('idle');

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments?appId=${appId}`);
      if (!response.ok) {
        throw new Error('Unable to load comments');
      }
      const payload = await response.json();
      setComments(payload.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments', error);
      toast.error('Unable to load comments right now.');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const disabled = !address || !commentValue.trim() || status !== 'idle';

  const handleSubmit = async () => {
    if (!address) {
      toast.error('Connect a wallet to leave reviewer notes.');
      return;
    }

    const message = commentValue.trim();
    if (!message) {
      toast.error('Add a comment before submitting.');
      return;
    }

    try {
      setStatus('signing');
      const signature = await signSubmissionComment({
        appId,
        message,
        address,
        walletType: walletType ?? null,
      });

      setStatus('posting');
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          address,
          message,
          walletType: signature.walletType,
          signature: signature.signature,
          signedPayload: signature.signedPayload,
          publicKey: signature.publicKey,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to save comment');
      }

      setCommentValue('');
      toast.success('Comment added');
      await fetchComments();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign comment';
      toast.error(errorMessage);
    } finally {
      setStatus('idle');
    }
  };

  const infoBanner = useMemo(() => {
    if (!address) {
      return 'Connect a Stacks browser wallet to sign your review.';
    }
    if (walletType === 'xverse') {
      return 'Posting will trigger an Xverse signing prompt for this review.';
    }
    return 'Posting will open a Stacks signature prompt to attest this review.';
  }, [address, walletType]);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Review Notes
          </CardTitle>
          <p className="text-sm text-muted-foreground">Signed review comments for {appName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchComments} className="cursor-pointer" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-xs text-muted-foreground">
          {infoBanner}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted p-4 text-sm text-muted-foreground">
            No comments yet. Be the first to leave reviewer notes for this submission.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium text-foreground">{formatAddress(comment.address)}</div>
                  <div className="text-xs text-muted-foreground">{formatTimestamp(comment.created_at)}</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{comment.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Textarea
            value={commentValue}
            onChange={(event) => setCommentValue(event.target.value)}
            placeholder="Share your review, feedback, or follow-up notes…"
            className="min-h-[120px] border-foreground"
          />
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <span className="text-xs text-muted-foreground">
              Review will be signed with {walletType ?? 'your connected wallet'}.
            </span>
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="cursor-pointer"
            >
              {status === 'signing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'posting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'signing' ? 'Awaiting signature…' : status === 'posting' ? 'Saving…' : 'Sign & Review'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
