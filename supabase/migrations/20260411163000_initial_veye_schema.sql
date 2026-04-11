-- VEYE initial schema: Firestore collections → Postgres
-- Service role (Edge Functions, backend) bypasses RLS.
-- See docs/DATABASE.md for mapping and next steps.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- zone_danger (Firestore: ZoneDanger)
-- ---------------------------------------------------------------------------
create table public.zone_danger (
  id text primary key default gen_random_uuid()::text,
  name text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  rezon text,
  date timestamptz not null default now(),
  incident_type text,
  level text,
  tag text,
  source text default 'telegram',
  source_url text,
  verified boolean not null default false,
  ai_confidence double precision,
  telegram_channel_id bigint,
  telegram_message_id bigint,
  manti_count integer not null default 0,
  user_id text,
  split_index integer,
  split_total integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_zone_danger_date on public.zone_danger (date desc nulls last);
create index idx_zone_danger_telegram
  on public.zone_danger (telegram_channel_id, telegram_message_id)
  where telegram_channel_id is not null and telegram_message_id is not null;

-- ---------------------------------------------------------------------------
-- kidnaping_alert (Firestore: KidnapingAlert) — AI pipeline kidnapping path
-- ---------------------------------------------------------------------------
create table public.kidnaping_alert (
  id text primary key default gen_random_uuid()::text,
  name text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  rezon text,
  date timestamptz not null default now(),
  source text,
  source_url text,
  verified boolean not null default false,
  ai_confidence double precision,
  telegram_channel_id bigint,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kidnaping_alert_date on public.kidnaping_alert (date desc nulls last);
create index idx_kidnaping_alert_telegram
  on public.kidnaping_alert (telegram_channel_id, telegram_message_id)
  where telegram_channel_id is not null and telegram_message_id is not null;

-- ---------------------------------------------------------------------------
-- viktim (Firestore: Viktim) — map / list module
-- ---------------------------------------------------------------------------
create table public.viktim (
  id text primary key default gen_random_uuid()::text,
  full_name text,
  status text,
  city text,
  details text,
  amount text,
  image_source text,
  type text,
  date timestamptz,
  latitude double precision,
  longitude double precision,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_viktim_date on public.viktim (date desc nulls last);
create index idx_viktim_type on public.viktim (type);

-- ---------------------------------------------------------------------------
-- news (Firestore: News) — Telegram fallback + general news
-- ---------------------------------------------------------------------------
create table public.news (
  id text primary key default gen_random_uuid()::text,
  title text,
  summary text,
  source text,
  source_url text,
  channel_name text,
  channel_id text,
  image_source text,
  date timestamptz not null default now(),
  telegram_channel_id bigint,
  telegram_message_id bigint,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_news_date on public.news (date desc nulls last);
create index idx_news_telegram
  on public.news (telegram_channel_id, telegram_message_id)
  where telegram_channel_id is not null and telegram_message_id is not null;

-- ---------------------------------------------------------------------------
-- telegram_monitor_state (Firestore: TelegramMonitorState/cursor)
-- ---------------------------------------------------------------------------
create table public.telegram_monitor_state (
  id text primary key,
  last_update_id bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.telegram_monitor_state (id, last_update_id)
values ('cursor', 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ai_pipeline_embeddings (Firestore: AIPipelineEmbeddings) — doc id = zone/kidnap row id
-- ---------------------------------------------------------------------------
create table public.ai_pipeline_embeddings (
  source_doc_id text primary key,
  embedding jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_moderations (Firestore: UserModerations)
-- ---------------------------------------------------------------------------
create table public.user_moderations (
  user_id text primary key,
  strikes jsonb not null default '[]'::jsonb,
  strike_count integer not null default 0,
  blocked boolean not null default false,
  last_strike_reason text,
  last_strike_at timestamptz,
  blocked_at timestamptz,
  unblocked_at timestamptz,
  unblock_reason text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users (Firestore: Users) — prefs merged by mobile app
-- ---------------------------------------------------------------------------
create table public.users (
  id text primary key,
  user_id text,
  radius_km double precision,
  notification_radius_km double precision,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- demanti_alert (Firestore: DemantiAlert) — doc id = firebaseUid + zoneId
-- ---------------------------------------------------------------------------
create table public.demanti_alert (
  id text primary key,
  information text,
  user_id text not null,
  created_at timestamptz not null default now()
);

create index idx_demanti_user on public.demanti_alert (user_id);

-- ---------------------------------------------------------------------------
-- veye_comments (Firestore: VeyeComments)
-- ---------------------------------------------------------------------------
create table public.veye_comments (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null,
  body text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  sort_time bigint not null,
  parent_id text,
  liked_user_ids text[] not null default '{}'::text[]
);

create index idx_veye_comments_thread on public.veye_comments (thread_id, sort_time);

-- ---------------------------------------------------------------------------
-- RLS: public read on alert-like data; writes via service_role only for now
-- (tighten per-table INSERT for authenticated when clients migrate)
-- ---------------------------------------------------------------------------
alter table public.zone_danger enable row level security;
alter table public.kidnaping_alert enable row level security;
alter table public.viktim enable row level security;
alter table public.news enable row level security;
alter table public.telegram_monitor_state enable row level security;
alter table public.ai_pipeline_embeddings enable row level security;
alter table public.user_moderations enable row level security;
alter table public.users enable row level security;
alter table public.demanti_alert enable row level security;
alter table public.veye_comments enable row level security;

-- anon + authenticated: read published-ish data (adjust WHEN for production)
create policy zone_danger_select_public
  on public.zone_danger for select
  to anon, authenticated
  using (true);

create policy kidnaping_alert_select_public
  on public.kidnaping_alert for select
  to anon, authenticated
  using (true);

create policy viktim_select_public
  on public.viktim for select
  to anon, authenticated
  using (true);

create policy news_select_public
  on public.news for select
  to anon, authenticated
  using (true);

-- comments: read all; insert own row (Supabase Auth uid as text)
create policy veye_comments_select_public
  on public.veye_comments for select
  to anon, authenticated
  using (true);

create policy veye_comments_insert_own
  on public.veye_comments for insert
  to authenticated
  with check (user_id = (select auth.uid()::text));

-- UPDATE (e.g. likes) deferred: use service_role or an RPC after client migration

-- users + demanti_alert: no anon/authenticated policies yet (Firebase UID ≠ auth.uid() until Auth migration). Service role only.
-- sensitive: no client policies (service_role only)
-- telegram_monitor_state, ai_pipeline_embeddings, user_moderations

commit;
