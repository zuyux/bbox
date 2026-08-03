create table if not exists public.api_usage_buckets (
  bucket_key text primary key,
  request_count integer not null default 0,
  byte_count bigint not null default 0,
  expires_at timestamptz not null
);
alter table public.api_usage_buckets enable row level security;
revoke all on public.api_usage_buckets from anon, authenticated;

create or replace function public.consume_api_quota(
  p_bucket_key text, p_expires_at timestamptz, p_max_requests integer,
  p_add_bytes bigint, p_max_bytes bigint
) returns boolean language plpgsql security definer set search_path = public as $$
declare accepted boolean;
begin
  if p_max_requests < 1 or p_add_bytes < 0 or p_add_bytes > p_max_bytes then
    return false;
  end if;
  insert into api_usage_buckets(bucket_key, request_count, byte_count, expires_at)
  values (p_bucket_key, 1, p_add_bytes, p_expires_at)
  on conflict (bucket_key) do update set
    request_count = api_usage_buckets.request_count + 1,
    byte_count = api_usage_buckets.byte_count + excluded.byte_count,
    expires_at = excluded.expires_at
  where api_usage_buckets.request_count < p_max_requests
    and api_usage_buckets.byte_count + excluded.byte_count <= p_max_bytes
  returning true into accepted;
  return coalesce(accepted, false);
end $$;
revoke all on function public.consume_api_quota(text,timestamptz,integer,bigint,bigint) from public, anon, authenticated;

create table if not exists public.managed_pinata_assets (
  cid text primary key,
  owner_address text not null,
  asset_kind text not null,
  byte_size bigint not null,
  created_at timestamptz not null default now()
);
alter table public.managed_pinata_assets enable row level security;
revoke all on public.managed_pinata_assets from anon, authenticated;

alter table public.vercel_blob_receipts add column if not exists owner_address text;
