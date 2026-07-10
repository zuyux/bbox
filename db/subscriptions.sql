create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'footer',
  status text not null default 'subscribed',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_email_unique unique (email),
  constraint subscriptions_status_check check (
    status in ('subscribed', 'unsubscribed')
  )
);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_subscribed_at_idx
  on public.subscriptions (subscribed_at desc);

alter table public.subscriptions enable row level security;