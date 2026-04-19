-- Global search: full-text search across the major content tables + a single
-- RPC that fans out and returns a normalized, ranked result set.
--
-- Design notes
-- ============
-- * `simple` config so it works for Haitian Creole / French names without
--   aggressive stemming. Switch to a custom dictionary later if desired.
-- * SECURITY INVOKER: each underlying table's RLS still applies. In particular,
--   `moderation_queue` rows are visible only to moderators+admins.
-- * Per-source LIMIT inside CTEs prevents a high-volume table from drowning
--   out the others; outer ORDER BY interleaves by global rank.

begin;

-- ---------------------------------------------------------------------------
-- 1. news.search_tsv
-- ---------------------------------------------------------------------------
alter table public.news
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(channel_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(source, '')), 'C')
  ) stored;

create index if not exists idx_news_search_tsv
  on public.news using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- 2. kidnaping_alert.search_tsv
-- ---------------------------------------------------------------------------
alter table public.kidnaping_alert
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(address, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(rezon, '')), 'C')
  ) stored;

create index if not exists idx_kidnaping_alert_search_tsv
  on public.kidnaping_alert using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- 3. moderation_queue.search_tsv
-- ---------------------------------------------------------------------------
alter table public.moderation_queue
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(preview, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(author_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(author_handle, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(location, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(reason, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(content_type, '')), 'D')
  ) stored;

create index if not exists idx_moderation_queue_search_tsv
  on public.moderation_queue using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- 4. RPC: search_global(p_query, p_limit)
-- ---------------------------------------------------------------------------
create or replace function public.search_global(
  p_query text,
  p_limit int default 8
)
returns table (
  kind     text,
  id       text,
  title    text,
  subtitle text,
  meta     text,
  rank     real
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select case
             when length(coalesce(p_query, '')) > 0
               then websearch_to_tsquery('simple', p_query)
             else null::tsquery
           end as ts
  ),
  v as (
    select
      'viktim'::text                                              as kind,
      v.id::text                                                  as id,
      coalesce(v.full_name, '(san non)')                          as title,
      nullif(
        trim(both ' ' from
          coalesce(v.city, '') ||
          case when v.type is not null and v.type <> ''
               then ' · ' || v.type else '' end
        ), ''
      )                                                           as subtitle,
      coalesce(v.status, to_char(v.date, 'YYYY-MM-DD'))           as meta,
      ts_rank_cd(v.search_tsv, (select ts from q))::real          as rank
    from public.viktim v
    where (select ts from q) is not null
      and v.search_tsv @@ (select ts from q)
    order by rank desc
    limit p_limit
  ),
  z as (
    select
      'zone_danger'::text                                         as kind,
      z.id::text                                                  as id,
      coalesce(z.name, z.address, '(zòn)')                        as title,
      nullif(
        trim(both ' ' from
          coalesce(z.city, '') ||
          case when z.incident_type is not null and z.incident_type <> ''
               then ' · ' || z.incident_type else '' end
        ), ''
      )                                                           as subtitle,
      coalesce(z.level, to_char(z.date, 'YYYY-MM-DD'))            as meta,
      ts_rank_cd(z.search_tsv, (select ts from q))::real          as rank
    from public.zone_danger z
    where (select ts from q) is not null
      and z.search_tsv @@ (select ts from q)
    order by rank desc
    limit p_limit
  ),
  n as (
    select
      'news'::text                                                as kind,
      n.id::text                                                  as id,
      coalesce(nullif(n.title, ''), '(san tit)')                  as title,
      nullif(
        trim(both ' ' from
          coalesce(n.channel_name, '') ||
          case when n.source is not null and n.source <> ''
               then ' · ' || n.source else '' end
        ), ''
      )                                                           as subtitle,
      to_char(n.date, 'YYYY-MM-DD')                               as meta,
      ts_rank_cd(n.search_tsv, (select ts from q))::real          as rank
    from public.news n
    where (select ts from q) is not null
      and n.search_tsv @@ (select ts from q)
    order by rank desc
    limit p_limit
  ),
  k as (
    select
      'kidnaping_alert'::text                                     as kind,
      k.id::text                                                  as id,
      coalesce(k.name, k.address, '(kidnap)')                     as title,
      nullif(
        trim(both ' ' from
          coalesce(k.city, '') ||
          case when k.rezon is not null and k.rezon <> ''
               then ' · ' || k.rezon else '' end
        ), ''
      )                                                           as subtitle,
      to_char(k.date, 'YYYY-MM-DD')                               as meta,
      ts_rank_cd(k.search_tsv, (select ts from q))::real          as rank
    from public.kidnaping_alert k
    where (select ts from q) is not null
      and k.search_tsv @@ (select ts from q)
    order by rank desc
    limit p_limit
  ),
  m as (
    select
      'moderation_queue'::text                                    as kind,
      m.id::text                                                  as id,
      coalesce(nullif(m.preview, ''), '(san preview)')            as title,
      nullif(
        trim(both ' ' from
          coalesce(m.author_name, '') ||
          case when m.reason is not null and m.reason <> ''
               then ' · ' || m.reason else '' end
        ), ''
      )                                                           as subtitle,
      m.status                                                    as meta,
      ts_rank_cd(m.search_tsv, (select ts from q))::real          as rank
    from public.moderation_queue m
    where (select ts from q) is not null
      and m.search_tsv @@ (select ts from q)
    order by rank desc
    limit p_limit
  )
  select * from v
  union all select * from z
  union all select * from n
  union all select * from k
  union all select * from m
  order by rank desc;
$$;

grant execute on function public.search_global(text, int) to anon, authenticated;

commit;
