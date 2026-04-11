-- Postgres changes (Supabase Realtime) for Android clients
begin;

alter publication supabase_realtime add table public.veye_comments;
alter publication supabase_realtime add table public.zone_danger;

commit;
