-- Anonymous interest selections, keyed only by a server-generated HMAC of the IP.
create table if not exists public.visitor_interests (
  hashed_ip text primary key check (hashed_ip ~ '^[0-9a-f]{64}$'),
  tags text[] not null default '{}',
  user_address text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_accounts add column if not exists hashed_ip text;
alter table public.profiles add column if not exists hashed_ip text;

create index if not exists connected_accounts_hashed_ip_idx on public.connected_accounts (hashed_ip);
create index if not exists profiles_hashed_ip_idx on public.profiles (hashed_ip);
create index if not exists visitor_interests_user_address_idx on public.visitor_interests (user_address);

alter table public.visitor_interests enable row level security;
-- No public policy is intentional: interest access goes through server routes using the service role.

comment on column public.visitor_interests.hashed_ip is
  'HMAC-SHA256 visitor identifier; never store the source IP.';
