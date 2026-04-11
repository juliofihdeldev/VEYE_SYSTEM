# Supabase Edge Functions (Phase A)

Deployed function folders live under `supabase/functions/<name>/index.ts`.

| Slug | Method | Auth | Purpose |
|------|--------|------|---------|
| `telegram-monitor` | GET, POST | `x-veye-secret` if `PROCESS_ALERT_SECRET` set | Telegram `getUpdates`, AI + `news` fallback |
| `process-global-alert` | POST | Public (app) | Same contract as Firebase `processGlobalAlert` |
| `process-admin-alert` | POST | `x-veye-secret` or body `secret` | Dashboard admin submit |
| `unblock-user` | POST | Secret | Unblock `user_moderations` |
| `send-notification` | POST | Public | OneSignal broadcast by geo |
| `health-check` | GET | Public | Liveness |

Invoke URL (hosted):

`https://<PROJECT_REF>.supabase.co/functions/v1/<slug>`

## Secrets (set in Supabase Dashboard → Edge Functions → Secrets, or CLI)

| Secret | Used by |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | `telegram-monitor` |
| `TELEGRAM_CHANNEL_IDS` | Optional comma-separated allowlist |
| `PROCESS_ALERT_SECRET` | `telegram-monitor`, `process-admin-alert`, `unblock-user` |
| `GOOGLE_GEMINI_API_KEY` | AI pipeline |
| `GOOGLE_GEOCODING_API_KEY` | Geocoding |
| `ONESIGNAL_API_ID` | Notifications |
| `ONESIGNAL_REST_API_ID_KEY` | Notifications (Basic auth) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the Edge runtime.

## Deploy

```bash
supabase functions deploy telegram-monitor
supabase functions deploy process-global-alert
supabase functions deploy process-admin-alert
supabase functions deploy unblock-user
supabase functions deploy send-notification
supabase functions deploy health-check
```

Or deploy all:

```bash
supabase functions deploy
```

## Local

```bash
supabase functions serve
```

`verify_jwt = false` is set in `supabase/config.toml` for these slugs so Firebase-era clients can call them without a Supabase session JWT.
