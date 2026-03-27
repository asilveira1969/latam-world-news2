alter table public.articles
  add column if not exists countries text[] not null default '{}'::text[],
  add column if not exists impact_format text,
  add column if not exists editorial_sections jsonb,
  add column if not exists latam_angle text,
  add column if not exists faq_items jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists idx_articles_impact_format
  on public.articles(impact_format);
