create extension if not exists "pgcrypto";

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text null,
  image_url text not null,
  source_name text not null,
  source_url text not null unique,
  region text not null check (region in ('Mundo', 'LatAm', 'EE.UU.', 'Europa', 'Asia', 'Medio Oriente')),
  category text not null,
  tags text[] not null default '{}',
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  is_featured boolean not null default false,
  is_impact boolean not null default false,
  views int not null default 0
);

create index if not exists idx_articles_slug on public.articles(slug);
create index if not exists idx_articles_published_at on public.articles(published_at desc);
create index if not exists idx_articles_region on public.articles(region);
create index if not exists idx_articles_is_featured on public.articles(is_featured);
create index if not exists idx_articles_is_impact on public.articles(is_impact);
