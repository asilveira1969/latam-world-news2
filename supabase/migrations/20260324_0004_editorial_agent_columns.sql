alter table public.articles
  add column if not exists latamworldnews_summary text,
  add column if not exists curated_news text,
  add column if not exists editorial_status text,
  add column if not exists editorial_generated_at timestamptz,
  add column if not exists editorial_model text;

update public.articles
set editorial_status = coalesce(editorial_status, 'pending')
where source_type = 'rss'
  and (latamworldnews_summary is null or curated_news is null);

create index if not exists idx_articles_editorial_status on public.articles(editorial_status);
create index if not exists idx_articles_source_type_editorial_status on public.articles(source_type, editorial_status);
