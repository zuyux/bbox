alter table public.profiles
add column if not exists hide_welcome_modal boolean not null default false;
