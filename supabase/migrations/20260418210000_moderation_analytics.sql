-- Moderation analytics: snapshot moderator email + derived views + sparkline fn.
--
-- All views are SECURITY INVOKER so the caller's RLS still applies (PG 15+).
-- Functions explicitly granted to authenticated; RLS on base tables (moderation_*)
-- already restricts SELECT to is_moderator().

begin;

-- ---------------------------------------------------------------------------
-- 1. Snapshot moderator email on each audit row (avoids cross-schema joins
--    against auth.users, which is restricted from PostgREST).
-- ---------------------------------------------------------------------------
alter table public.moderation_audit
  add column if not exists moderator_email text;

-- Backfill any pre-existing rows.
update public.moderation_audit a
   set moderator_email = u.email
  from auth.users u
 where u.id = a.moderator_id
   and a.moderator_email is null;

-- ---------------------------------------------------------------------------
-- 2. Update moderation_decide() to capture email + status as before.
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
  v_uid    uuid := auth.uid();
  v_role   text;
  v_email  text;
  v_next   text;
  v_prev   text;
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

  select u.email into v_email from auth.users u where u.id = v_uid;

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

  insert into public.moderation_audit
    (item_id, moderator_id, moderator_email, action, prev_status, next_status, note)
  values (p_item_id, v_uid, v_email, p_action, v_prev, v_next, p_note);

  return query
    select mq.id, mq.status from public.moderation_queue mq where mq.id = p_item_id;
end;
$$;

grant execute on function public.moderation_decide(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3a. Reason counts (last 24 hours of submitted items)
-- ---------------------------------------------------------------------------
create or replace view public.moderation_reason_counts_24h
with (security_invoker = true) as
select reason, count(*)::int as item_count
  from public.moderation_queue
 where submitted_at >= now() - interval '24 hours'
 group by reason;

grant select on public.moderation_reason_counts_24h to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. Recent moderator activity feed (audit + queue context)
-- ---------------------------------------------------------------------------
create or replace view public.moderation_audit_feed
with (security_invoker = true) as
select a.id,
       a.item_id,
       a.moderator_id,
       a.moderator_email,
       a.action,
       a.prev_status,
       a.next_status,
       a.note,
       a.created_at,
       q.content_type,
       q.preview,
       q.reason,
       q.author_name,
       q.reports_count
  from public.moderation_audit a
  join public.moderation_queue q on q.id = a.item_id;

grant select on public.moderation_audit_feed to authenticated;

-- ---------------------------------------------------------------------------
-- 3c. Top moderator leaderboard (last 7 days)
-- ---------------------------------------------------------------------------
create or replace view public.moderator_leaderboard_7d
with (security_invoker = true) as
select moderator_id,
       moderator_email,
       count(*)::int                                                          as actions,
       sum(case when action = 'approve'  then 1 else 0 end)::int              as approves,
       sum(case when action = 'reject'   then 1 else 0 end)::int              as rejects,
       sum(case when action = 'escalate' then 1 else 0 end)::int              as escalates,
       case when count(*) > 0
            then round(100.0 * sum(case when action = 'approve' then 1 else 0 end) / count(*))::int
            else 0
       end                                                                     as approval_pct
  from public.moderation_audit
 where created_at >= now() - interval '7 days'
 group by moderator_id, moderator_email;

grant select on public.moderator_leaderboard_7d to authenticated;

-- ---------------------------------------------------------------------------
-- 3d. Hourly time-series for sparklines (last N hours).
--     Returns a row per hour bucket, even when there is no underlying data,
--     so the client can map directly to a fixed-length sparkline array.
-- ---------------------------------------------------------------------------
create or replace function public.moderation_hourly_metrics(p_hours int default 17)
returns table (
  bucket          timestamptz,
  pending_added   int,
  flagged_added   int,
  approved        int,
  rejected        int
)
language sql
stable
security invoker
set search_path = public
as $$
  with hours as (
    select generate_series(
      date_trunc('hour', now()) - ((p_hours - 1) * interval '1 hour'),
      date_trunc('hour', now()),
      interval '1 hour'
    ) as h
  ),
  q as (
    select date_trunc('hour', submitted_at) as h,
           count(*)::int                                                        as pending_added,
           sum(case when reports_count >= 5 then 1 else 0 end)::int             as flagged_added
      from public.moderation_queue
     where submitted_at >= date_trunc('hour', now()) - ((p_hours - 1) * interval '1 hour')
     group by 1
  ),
  a as (
    select date_trunc('hour', created_at) as h,
           sum(case when action = 'approve' then 1 else 0 end)::int             as approved,
           sum(case when action = 'reject'  then 1 else 0 end)::int             as rejected
      from public.moderation_audit
     where created_at >= date_trunc('hour', now()) - ((p_hours - 1) * interval '1 hour')
     group by 1
  )
  select hours.h                                                                as bucket,
         coalesce(q.pending_added, 0)                                           as pending_added,
         coalesce(q.flagged_added, 0)                                           as flagged_added,
         coalesce(a.approved, 0)                                                as approved,
         coalesce(a.rejected, 0)                                                as rejected
    from hours
    left join q on q.h = hours.h
    left join a on a.h = hours.h
   order by hours.h;
$$;

grant execute on function public.moderation_hourly_metrics(int) to authenticated;

commit;
