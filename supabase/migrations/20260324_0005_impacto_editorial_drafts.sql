create table if not exists public.impacto_editorial_drafts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  seo_title text,
  seo_description text,
  editorial_context text,
  editorial_sections jsonb not null,
  tags text[] not null default '{}'::text[],
  countries text[] not null default '{}'::text[],
  source_articles jsonb not null default '[]'::jsonb,
  source_count integer not null default 0,
  status text not null default 'pending_review',
  review_email text,
  email_sent_at timestamptz,
  email_provider text,
  email_message_id text,
  model text,
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  published_article_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_impacto_editorial_drafts_status
  on public.impacto_editorial_drafts(status);

create index if not exists idx_impacto_editorial_drafts_generated_at
  on public.impacto_editorial_drafts(generated_at desc);
