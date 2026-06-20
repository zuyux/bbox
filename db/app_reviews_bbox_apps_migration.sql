alter table public.app_reviews
  drop constraint if exists app_reviews_app_id_fkey;

alter table public.app_reviews
  alter column app_id type text using app_id::text,
  alter column app_id set not null;

alter table public.app_reviews
  add constraint app_reviews_app_id_fkey
  foreign key (app_id) references public.bbox_apps (id) on delete cascade;
