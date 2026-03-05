create extension if not exists "pgcrypto";

alter table public.articles
  add column if not exists url text,
  add column if not exists summary text,
  add column if not exists source text,
  add column if not exists source_type text,
  add column if not exists country text,
  add column if not exists language text,
  add column if not exists raw jsonb;

update public.articles
set
  url = coalesce(url, source_url),
  summary = coalesce(summary, excerpt),
  source = coalesce(source, source_name),
  source_type = coalesce(source_type, 'api')
where url is null or summary is null or source is null or source_type is null;

do $$
begin
  if exists (select 1 from public.articles where url is null) then
    raise exception 'Cannot enforce NOT NULL on public.articles.url because some rows still have null url';
  end if;
end $$;

alter table public.articles
  alter column url set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'articles_url_key'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_url_key unique (url);
  end if;
end $$;

create index if not exists idx_articles_country on public.articles(country);
create index if not exists idx_articles_source on public.articles(source);

