-- Moderation: user_roles + moderation_queue + moderation_audit + RPC + realtime
--
-- Quickstart for granting yourself admin (replace the email):
--
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do update set role = excluded.role;
--
-- Service-role / Edge functions bypass RLS as before.

begin;

-- ---------------------------------------------------------------------------
-- user_roles — dashboard RBAC. Keyed by Supabase auth.users.id.
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin', 'moderator', 'viewer')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_user_roles_role on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so RLS policies can call them safely)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'moderator')
  )
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin()           to authenticated;
grant execute on function public.is_moderator()       to authenticated;

-- ---------------------------------------------------------------------------
-- moderation_queue — items pending or already-decided moderation review
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_queue (
  id              text primary key default gen_random_uuid()::text,
  -- author of the *content* being moderated (legacy text id to match other tables)
  author_id        text,
  author_name      text not null,
  author_handle    text,
  author_anonymous boolean not null default false,
  -- content
  content_type    text not null check (content_type in ('POST', 'REPORT', 'NEWS', 'COMMENT')),
  content_ref     text,                    -- foreign id into news/zone_danger/viktim/etc.
  preview         text not null,
  thumbnail_url   text,
  location        text,
  -- moderation metadata
  reason          text not null check (reason in (
    'MISINFORMATION', 'HATE_SPEECH', 'SPAM', 'GRAPHIC', 'DUPLICATE', 'OTHER'
  )),
  reports_count   integer not null default 0,
  status          text not null default 'PENDING' check (status in (
    'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'
  )),
  decided_by      uuid references auth.users(id) on delete set null,
  decided_at      timestamptz,
  decision_note   text,
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_mq_status        on public.moderation_queue (status);
create index if not exists idx_mq_submitted_at  on public.moderation_queue (submitted_at desc);
create index if not exists idx_mq_reason        on public.moderation_queue (reason, submitted_at desc);
create index if not exists idx_mq_content_ref   on public.moderation_queue (content_type, content_ref);

-- ---------------------------------------------------------------------------
-- moderation_audit — append-only log of every moderator action
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_audit (
  id            bigserial primary key,
  item_id       text not null references public.moderation_queue(id) on delete cascade,
  moderator_id  uuid not null references auth.users(id) on delete set null,
  action        text not null check (action in ('approve', 'reject', 'escalate')),
  prev_status   text,
  next_status   text not null,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_item       on public.moderation_audit (item_id, created_at desc);
create index if not exists idx_audit_moderator  on public.moderation_audit (moderator_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RPC: moderation_decide(item_id, action, note)
--
-- Single atomic call that:
--   1. Verifies caller is a moderator (or admin for 'escalate').
--   2. Updates moderation_queue (status, decided_by, decided_at, decision_note).
--   3. Inserts a moderation_audit row capturing prev → next state.
--
-- Returns the updated row id + new status.
-- ---------------------------------------------------------------------------
create or replace function public.moderation_decide(
  p_item_id text,
  p_action  text,
  p_note    text default null
)
returns table (id text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text;
  v_next      text;
  v_prev      text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select user_roles.role into v_role
    from public.user_roles where user_id = v_uid;

  if v_role is null or v_role = 'viewer' then
    raise exception 'Insufficient role' using errcode = '42501';
  end if;

  if p_action not in ('approve', 'reject', 'escalate') then
    raise exception 'Invalid action %', p_action using errcode = '22023';
  end if;

  if p_action = 'escalate' and v_role <> 'admin' then
    raise exception 'Escalate requires admin role' using errcode = '42501';
  end if;

  v_next := case p_action
              when 'approve' then 'APPROVED'
              when 'reject'  then 'REJECTED'
              when 'escalate' then 'ESCALATED'
            end;

  select moderation_queue.status into v_prev
    from public.moderation_queue where moderation_queue.id = p_item_id
    for update;

  if v_prev is null then
    raise exception 'Item % not found', p_item_id using errcode = 'P0002';
  end if;

  update public.moderation_queue mq
     set status        = v_next,
         decided_by    = v_uid,
         decided_at    = now(),
         decision_note = coalesce(p_note, mq.decision_note),
         updated_at    = now()
   where mq.id = p_item_id;

  insert into public.moderation_audit (item_id, moderator_id, action, prev_status, next_status, note)
  values (p_item_id, v_uid, p_action, v_prev, v_next, p_note);

  return query
    select mq.id, mq.status from public.moderation_queue mq where mq.id = p_item_id;
end;
$$;

grant execute on function public.moderation_decide(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_roles       enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.moderation_audit enable row level security;

-- user_roles: a user can read their own row; admins can manage everything.
drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- moderation_queue: only moderators+admins can see it; writes happen through RPC
-- (which uses SECURITY DEFINER so RLS on update is bypassed for the owner role).
drop policy if exists mq_select_moderator on public.moderation_queue;
create policy mq_select_moderator
  on public.moderation_queue for select
  to authenticated
  using (public.is_moderator());

-- Allow inserts from authenticated moderators (so the dashboard / future
-- "submit for review" flows can create queue items without an Edge call).
drop policy if exists mq_insert_moderator on public.moderation_queue;
create policy mq_insert_moderator
  on public.moderation_queue for insert
  to authenticated
  with check (public.is_moderator());

-- moderation_audit: moderators+admins can read; inserts only via RPC (definer).
drop policy if exists audit_select_moderator on public.moderation_audit;
create policy audit_select_moderator
  on public.moderation_audit for select
  to authenticated
  using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Realtime: stream queue changes to dashboards
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- queue
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_queue'
    ) then
      execute 'alter publication supabase_realtime add table public.moderation_queue';
    end if;
    -- audit
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moderation_audit'
    ) then
      execute 'alter publication supabase_realtime add table public.moderation_audit';
    end if;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Seed: a few demo rows so the dashboard renders out of the box.
-- Safe to re-run thanks to the deterministic ids + on conflict do nothing.
-- ---------------------------------------------------------------------------
insert into public.moderation_queue
  (id, author_name, author_handle, author_anonymous, content_type, preview,
   thumbnail_url, location, reason, reports_count, status, submitted_at)
values
  ('seed-m1', 'Marie Lavalle', '@m.lavalle', false, 'REPORT',
   'Gen yon kidnapping ki sot fèt sou Route de Kenscoff. Yon machin nwa ak 4 nèg ame…',
   null, 'Pétion-Ville', 'MISINFORMATION', 6, 'PENDING', now() - interval '14 minutes'),
  ('seed-m2', 'Anonim', 'anonymous', true, 'POST',
   'Tout moun nan zòn nan se kriminèl, fò yo kraze yo tout. #PaPouNou #Vyolans',
   null, 'Delmas 33', 'HATE_SPEECH', 14, 'PENDING', now() - interval '42 minutes'),
  ('seed-m3', 'Jean-Pierre Louis', '@jp.louis', false, 'NEWS',
   'Klike pou ou jwenn $500 imedyatman — ofrè spesyal Veye pou tout itilizatè aktif.',
   null, null, 'SPAM', 22, 'PENDING', now() - interval '1 hour'),
  ('seed-m4', 'Kenley Rémy', '@k.remy', false, 'REPORT',
   'Foto san sansi sou yon eskèn vyolans nan Bel-Air — gen kò ki vizib san avètisman.',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&h=120&fit=crop',
   'Bel-Air', 'GRAPHIC', 9, 'ESCALATED', now() - interval '2 hours'),
  ('seed-m5', 'Naïka Joseph', '@n.joseph', false, 'COMMENT',
   'Mèsi pou enfòmasyon an, mwen te pataje li ak fanmi mwen.',
   null, null, 'DUPLICATE', 2, 'APPROVED', now() - interval '3 hours'),
  ('seed-m6', 'Chrismane H.', 'anonymous', true, 'POST',
   'Atansyon nan zòn Tabarre, gen barikad ki monte depi maten. Pa pase pa la a.',
   null, 'Tabarre', 'MISINFORMATION', 4, 'PENDING', now() - interval '4 hours'),
  ('seed-m7', 'Watson A.', '@w.alexandre', false, 'REPORT',
   'Pèp la ap soufri, fò leta a aji. Mwen rapòte yon evènman ki…',
   null, null, 'OTHER', 1, 'REJECTED', now() - interval '6 hours')
on conflict (id) do nothing;

commit;
