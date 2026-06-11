create table public.app_reviews (
  id bigserial not null,
  app_id bigint null,
  reviewer_address character varying(255) not null,
  rating integer not null,
  review_text text null,
  helpful_count integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint app_reviews_pkey primary key (id),
  constraint app_reviews_app_id_reviewer_address_key unique (app_id, reviewer_address),
  constraint app_reviews_app_id_fkey foreign KEY (app_id) references apps (id) on delete CASCADE,
  constraint app_reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_app_reviews_app_id on public.app_reviews using btree (app_id) TABLESPACE pg_default;

create index IF not exists idx_app_reviews_rating on public.app_reviews using btree (rating) TABLESPACE pg_default;

create index IF not exists idx_app_reviews_created_at on public.app_reviews using btree (created_at desc) TABLESPACE pg_default;

create trigger update_app_reviews_updated_at BEFORE
update on app_reviews for EACH row
execute FUNCTION update_updated_at_column ();