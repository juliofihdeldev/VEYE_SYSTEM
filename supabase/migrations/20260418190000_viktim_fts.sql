-- Postgres Full-Text Search for viktim
-- Adds a generated tsvector column and a GIN index so the dashboard can use
--   supabase.from('viktim').textSearch('search_tsv', q, { type: 'websearch' })

begin;

alter table public.viktim
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(type, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(status, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(details, '')), 'D')
  ) stored;

create index if not exists idx_viktim_search_tsv
  on public.viktim using gin (search_tsv);

commit;
