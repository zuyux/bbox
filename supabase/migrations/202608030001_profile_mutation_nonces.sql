create table if not exists public.profile_mutation_nonces (
  nonce text primary key check (nonce ~ '^[0-9a-f]{48}$'),
  address text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.profile_mutation_nonces enable row level security;
revoke all on public.profile_mutation_nonces from anon, authenticated;
create index if not exists profile_mutation_nonces_expires_at_idx
  on public.profile_mutation_nonces (expires_at);
