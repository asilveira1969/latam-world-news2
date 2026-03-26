alter table public.articles
  add column if not exists topic_slug text,
  add column if not exists section_slug text;

create index if not exists idx_articles_topic_slug on public.articles(topic_slug);
create index if not exists idx_articles_section_slug on public.articles(section_slug);
