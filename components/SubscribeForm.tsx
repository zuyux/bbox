'use client';

import { FormEvent, useState } from 'react';
import { useI18n } from './I18nProvider';

type SubscribeState = 'idle' | 'submitting' | 'success' | 'error';

export default function SubscribeForm() {
  const { messages } = useI18n();
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<SubscribeState>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (state === 'submitting') {
      return;
    }

    setState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, website: trap }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setEmail('');
      setState('success');
      setMessage(data.message || 'Subscribed');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Subscription failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 items-center gap-1.5" aria-label="Subscribe">
      <label className="sr-only" htmlFor="footer-subscribe-email">
        Email
      </label>
      <input
        id="footer-subscribe-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="email@domain.com"
        disabled={state === 'submitting'}
        className="h-7 w-36 min-w-0 rounded border border-white/15 bg-white/10 px-2 text-xs text-white placeholder:text-white/35 outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-44"
      />
      <label className="sr-only" htmlFor="footer-subscribe-website">
        Website
      </label>
      <input
        id="footer-subscribe-website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={trap}
        onChange={(event) => setTrap(event.target.value)}
        className="hidden"
      />
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="h-7 shrink-0 rounded bg-[#ff5e00] px-3 text-xs font-semibold text-white transition hover:bg-[#ff7a1a] focus:outline-none focus:ring-2 focus:ring-[#ff9a45] focus:ring-offset-1 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? messages.common.sending : messages.common.subscribe}
      </button>
      <span
        className={`hidden max-w-28 truncate text-xs md:inline ${state === 'error' ? 'text-red-300' : 'text-[#ffb37a]'}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </span>
    </form>
  );
}
