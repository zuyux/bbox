create table if not exists public.vercel_blob_receipts (
  pathname text primary key,
  url text not null,
  download_url text not null unique,
  original_name text not null,
  file_kind text not null check (file_kind in ('audio', 'image')),
  declared_size bigint not null check (declared_size > 0),
  content_type text not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

alter table public.vercel_blob_receipts enable row level security;
revoke all on public.vercel_blob_receipts from anon, authenticated;
create index if not exists vercel_blob_receipts_created_at_idx on public.vercel_blob_receipts (created_at);
