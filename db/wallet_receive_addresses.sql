alter table public.connected_accounts
  add column if not exists bitcoin_address text null,
  add column if not exists rootstock_address text null,
  add column if not exists liquid_address text null;

alter table public.profiles
  add column if not exists bitcoin_address text null,
  add column if not exists rootstock_address text null,
  add column if not exists liquid_address text null;
