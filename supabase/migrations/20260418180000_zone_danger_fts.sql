-- Postgres Full-Text Search for zone_danger
-- Adds a generated tsvector column and a GIN index so the dashboard can use
--   supabase.from('zone_danger').textSearch('search_tsv', q, { type: 'websearch' })

begin;

-- Add a stored, generated tsvector that aggregates the searchable fields.
-- We use the 'simple' config so it works for Haitian Creole / French names without
-- aggressive stemming. Switch to 'french' or a custom dictionary later if desired.
alter table public.zone_danger
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(address, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(rezon, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(incident_type, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(tag, '')), 'D')
  ) stored;

create index if not exists idx_zone_danger_search_tsv
  on public.zone_danger using gin (search_tsv);

commit;
