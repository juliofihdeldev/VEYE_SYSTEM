-- Dashboard "Users" page: SECURITY DEFINER RPC that lets moderators+admins
-- list rows from public.users (mobile app users) joined with auth.users to
-- expose the email address. Service role still bypasses RLS as before.
--
-- Required role: moderator or admin (rows from public.user_roles).

begin;

create or replace function public.list_app_users(
  p_query text default '',
  p_limit integer default 50,
  p_offset integer default 0,
  p_has_device boolean default null
)
returns table (
  id text,
  user_id text,
  email text,
  radius_km double precision,
  notification_radius_km double precision,
  latitude double precision,
  longitude double precision,
  device_token text,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid;
  v_role text;
  v_q    text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select role into v_role from public.user_roles where user_id = v_uid;
  if v_role is null or v_role = 'viewer' then
    raise exception 'Insufficient role' using errcode = '42501';
  end if;

  v_q := nullif(trim(coalesce(p_query, '')), '');

  return query
  with base as (
    select
      u.id,
      u.user_id,
      au.email::text as email,
      u.radius_km,
      u.notification_radius_km,
      u.latitude,
      u.longitude,
      u.device_token,
      u.updated_at
    from public.users u
    left join auth.users au on au.id::text = u.user_id
    where
      (
        v_q is null
        or u.id ilike '%' || v_q || '%'
        or coalesce(u.user_id, '') ilike '%' || v_q || '%'
        or coalesce(au.email::text, '') ilike '%' || v_q || '%'
      )
      and (
        p_has_device is null
        or (p_has_device = true  and u.device_token is not null and u.device_token <> '')
        or (p_has_device = false and (u.device_token is null or u.device_token = ''))
      )
  ),
  counted as (select count(*)::bigint as c from base)
  select
    b.id, b.user_id, b.email, b.radius_km, b.notification_radius_km,
    b.latitude, b.longitude, b.device_token, b.updated_at,
    c.c
  from base b cross join counted c
  order by b.updated_at desc nulls last
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.list_app_users(text, integer, integer, boolean) to authenticated;

comment on function public.list_app_users(text, integer, integer, boolean) is
  'List public.users rows with optional email join. Requires moderator/admin role.';

commit;
