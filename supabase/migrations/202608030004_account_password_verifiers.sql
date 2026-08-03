alter table public.connected_accounts
  add column if not exists password_hash text,
  add column if not exists password_salt text,
  add column if not exists password_kdf text;
