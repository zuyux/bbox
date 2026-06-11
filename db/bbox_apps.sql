create table public.bbox_apps (
  id text not null,
  name text not null,
  description text null,
  category text null,
  tags text[] not null default array[]::text[],
  downloads text null,
  rating numeric(3, 2) null,
  verified boolean not null default false,
  link text null,
  imgcid text null,
  created_at timestamp with time zone not null default now(),
  constraint bbox_apps_pkey primary key (id)
) TABLESPACE pg_default;