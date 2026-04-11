-- Optional fields for OneSignal-style targeting (mirrors Firestore Users docs used in notificationHelper)
begin;

alter table public.users
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists device_token text;

comment on column public.users.latitude is 'User / device location for radius notifications';
comment on column public.users.longitude is 'User / device location for radius notifications';
comment on column public.users.device_token is 'OneSignal player id or push token';

commit;
