'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type InterestBarProps = {
  categories: string[];
  visible: boolean;
  onInterestsChange?: (interests: string[]) => void;
};

export function InterestBar({ categories, visible, onInterestsChange }: InterestBarProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [footerHeight, setFooterHeight] = useState(48);
  const selectedRef = useRef<string[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>('[data-site-footer]');
    if (!footer) return;

    const updateFooterHeight = () => setFooterHeight(footer.getBoundingClientRect().height);
    updateFooterHeight();
    const observer = new ResizeObserver(updateFooterHeight);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetch('/api/interests', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load interests');
        if (!cancelled) {
          const savedTags = Array.isArray(payload.tags) ? payload.tags : [];
          selectedRef.current = savedTags;
          setSelected(savedTags);
          onInterestsChange?.(savedTags);
          setStatus('idle');
        }
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => { cancelled = true; };
  }, [visible, onInterestsChange]);

  if (!visible || categories.length === 0) return null;

  const toggle = (category: string) => {
    if (status === 'loading') return;
    const next = selectedRef.current.includes(category)
      ? selectedRef.current.filter((item) => item !== category)
      : [...selectedRef.current, category];
    const saveVersion = ++saveVersionRef.current;

    selectedRef.current = next;
    setSelected(next);
    onInterestsChange?.(next);
    setStatus('saving');
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/interests', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: next }),
        });
        if (!response.ok) throw new Error('Unable to save interests');
        if (saveVersion === saveVersionRef.current) setStatus('saved');
      })
      .catch(() => {
        if (saveVersion === saveVersionRef.current) setStatus('error');
      });
  };

  return (
    <aside
      className="fixed left-1/2 z-[190] w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border border-border bg-background/95 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      style={{ bottom: footerHeight + 5 }}
      aria-label="Choose your interests"
    >
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
        <div className="shrink-0">
          <p className="mb-0 font-semibold">What are your interests?</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:pl-4">
          {categories.map((category) => {
            const active = selected.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                disabled={status === 'loading'}
                onClick={() => toggle(category)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-border bg-card hover:border-orange-500/60'}`}
              >
                {category}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <Link
            href="/recommendations"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-green-500 px-3 py-2 text-xs font-semibold text-black/90 transition hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            See recommendations
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </aside>
  );
}
