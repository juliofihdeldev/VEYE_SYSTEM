-- Align Viktim with Telegram dedupe queries (optional on legacy rows)
begin;

alter table public.viktim
  add column if not exists telegram_channel_id bigint,
  add column if not exists telegram_message_id bigint;

create index if not exists idx_viktim_telegram
  on public.viktim (telegram_channel_id, telegram_message_id)
  where telegram_channel_id is not null and telegram_message_id is not null;

commit;
