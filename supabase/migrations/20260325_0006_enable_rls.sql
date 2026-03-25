alter table public.articles enable row level security;

drop policy if exists "Enable read access for all users" on public.articles;
drop policy if exists "Public read access for articles" on public.articles;
create policy "Public read access for articles"
  on public.articles
  for select
  to anon, authenticated
  using (true);

alter table public.impacto_editorial_drafts enable row level security;
