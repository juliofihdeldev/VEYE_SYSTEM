# Supabase (Edge Functions + Postgres)

Managed with the [Supabase CLI](https://supabase.com/docs/guides/cli).

## Commands (repo root)

| Command | Purpose |
|---------|---------|
| `supabase link --project-ref <ref>` | Link to hosted project |
| `supabase db push` | Apply `supabase/migrations/*.sql` |
| `supabase start` | Local stack (Docker) |
| `supabase functions serve` | Run Edge Functions locally |
| `supabase functions deploy` | Deploy every function folder |

## Functions (Phase A)

| Folder | Role |
|--------|------|
| `telegram-monitor` | Telegram `getUpdates` + AI + `news` fallback |
| `process-global-alert` | Mobile / public alert JSON → AI pipeline |
| `process-admin-alert` | Dashboard admin + secret |
| `unblock-user` | Moderation reset + secret |
| `send-notification` | OneSignal helper |
| `health-check` | Liveness |

Shared code: `supabase/functions/_shared/` (`ai_pipeline.ts`, `telegram_monitor.ts`, `onesignal.ts`, …).

Full secret list and URLs: [docs/EDGE_FUNCTIONS.md](../docs/EDGE_FUNCTIONS.md).
