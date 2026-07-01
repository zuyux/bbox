alter table public.bbox_apps
  add column if not exists metadata_cid text,
  add column if not exists contract_txid text,
  add column if not exists contract_network text,
  add column if not exists bar_txid text,
  add column if not exists bar_inscription_id text,
  add column if not exists bar_owner_address text;
