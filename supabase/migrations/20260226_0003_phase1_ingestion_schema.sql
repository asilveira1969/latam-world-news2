alter table public.articles
  alter column source_url set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'articles_source_url_key'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_source_url_key unique (source_url);
  end if;
end $$;

create index if not exists idx_articles_source_url on public.articles(source_url);
create index if not exists idx_articles_region_language on public.articles(region, language);
create index if not exists idx_articles_published_region on public.articles(published_at desc, region);

alter table public.articles
  drop constraint if exists articles_region_check;

alter table public.articles
  add constraint articles_region_check
  check (
    region in (
      'Mundo',
      'LatAm',
      'EE.UU.',
      'Europa',
      'Asia',
      'Medio Oriente',
      'UY',
      'AR',
      'BR',
      'MX',
      'CL'
    )
  );
