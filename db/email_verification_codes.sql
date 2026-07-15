create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null default 'create_account',
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint email_verification_codes_purpose_check check (
    purpose in ('create_account', 'profile_email')
  ),
  constraint email_verification_codes_attempts_check check (attempts >= 0)
);

create index if not exists email_verification_codes_lookup_idx
  on public.email_verification_codes (email, purpose, created_at desc);

create index if not exists email_verification_codes_expires_at_idx
  on public.email_verification_codes (expires_at);

alter table public.email_verification_codes enable row level security;
