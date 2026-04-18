# Supabase Edge Functions (Phase A)

Deployed function folders live under `supabase/functions/<name>/index.ts`.

| Slug | Method | Auth | Purpose |
|------|--------|------|---------|
| `telegram-monitor` | GET, POST | `x-veye-secret` if `PROCESS_ALERT_SECRET` set | Telegram `getUpdates`, AI + `news` fallback |
| `process-global-alert` | POST | Public (app) | Same contract as Firebase `processGlobalAlert` |
| `process-demanti` | POST | `x-veye-secret` or body `secret` if `PROCESS_ALERT_SECRET` set | App “false flag” for a zone: insert `demanti_alert`, bump `zone_danger.manti_count` |
| `process-user-merge` | POST | `x-veye-secret` or body `secret` if `PROCESS_ALERT_SECRET` set | App **partial merge** on Postgres `users` (`radius_km`, `notification_radius_km`, `device_token` / FCM token) |
| `get-user-moderation` | POST | `x-veye-secret` or body `secret` if `PROCESS_ALERT_SECRET` set | App read **`user_moderations`** for `{ userId }` — returns `blocked`, `unblockedAtMs` (uses shared **`isUserBlocked`** / 72h cooldown, may auto-clear block) |
| `process-veye-comment` | POST | `x-veye-secret` or body `secret` if `PROCESS_ALERT_SECRET` set | App **`veye_comments`**: `action: append` \| `toggleLike` (service role) |
| `process-admin-alert` | POST | `x-veye-secret` or body `secret` | Dashboard admin submit |
| `unblock-user` | POST | Secret | Unblock `user_moderations` |
| `send-notification` | POST | Public | FCM HTTP v1 broadcast by geo (radius-targeted, fan-out per token) |
| `health-check` | GET | Public | Liveness |
| `dashboard-mutate` | POST | `x-veye-secret` if `PROCESS_ALERT_SECRET` set + `Authorization: Bearer <anon>` | Dashboard-only **insert** (viktim, news) / **update** (zone_danger, news) / **delete** (all four list tables) — service role on server |

Invoke URL (hosted):

`https://<PROJECT_REF>.supabase.co/functions/v1/<slug>`

## Secrets (set in Supabase Dashboard → Edge Functions → Secrets, or CLI)

| Secret | Used by |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | `telegram-monitor` |
| `TELEGRAM_CHANNEL_IDS` | Optional comma-separated allowlist |
| `PROCESS_ALERT_SECRET` | `telegram-monitor`, `process-demanti`, `process-user-merge`, `get-user-moderation`, `process-veye-comment`, `process-admin-alert`, `unblock-user` |
| `GOOGLE_GEMINI_API_KEY` | AI pipeline |
| `GOOGLE_GEOCODING_API_KEY` | Geocoding |
| `FCM_PROJECT_ID` | `send-notification` (Firebase project id, e.g. `edel-34e48`) |
| `FCM_SERVICE_ACCOUNT_JSON` | `send-notification` — **entire** service-account JSON pasted as a single string (Firebase Console → Project Settings → Service accounts → Generate new private key) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the Edge runtime.

## Schedule (every 15 minutes)

See [SCHEDULE_TELEGRAM.md](./SCHEDULE_TELEGRAM.md) (GitHub Actions workflow in-repo).

## Smoke tests

- **CI:** run workflow **Smoke Edge functions** (`.github/workflows/smoke-edge.yml`) from the Actions tab. Set secrets `SUPABASE_FUNCTIONS_BASE`, `SUPABASE_ANON_KEY`, and **`PROCESS_ALERT_SECRET`** whenever that secret is set on the project (smoke calls **`get-user-moderation`** and other `verifySecret` functions).
- **Local:** `chmod +x scripts/smoke-edge.sh` then set env vars and run `./scripts/smoke-edge.sh` (includes **`get-user-moderation`** after `process-global-alert`).

## Deploy

```bash
supabase functions deploy telegram-monitor
supabase functions deploy process-global-alert
supabase functions deploy process-demanti
supabase functions deploy process-user-merge
supabase functions deploy get-user-moderation
supabase functions deploy process-veye-comment
supabase functions deploy process-admin-alert
supabase functions deploy unblock-user
supabase functions deploy send-notification
supabase functions deploy health-check
supabase functions deploy dashboard-mutate
```

Or deploy all:

```bash
supabase functions deploy
```

## Local

```bash
supabase functions serve
```

`verify_jwt = false` is set in `supabase/config.toml` for these slugs so Firebase-era clients can call them without a Supabase session JWT. **`process-demanti`**, **`process-user-merge`**, **`get-user-moderation`**, and **`process-veye-comment`** use **`verifySecret`**: when `PROCESS_ALERT_SECRET` is set on the project, the app must send **`x-veye-secret`** (see `VEYe/local.properties` → `PROCESS_ALERT_SECRET`).

### Local `telegram-monitor` returns **503** / **500**

- **`TELEGRAM_BOT_TOKEN not configured`** (or **`503` + `code: TELEGRAM_BOT_TOKEN_MISSING`** after redeploy) — the function has no bot token. **Local:** copy **`supabase/functions/.env.example`** → **`supabase/functions/.env`**, set **`TELEGRAM_BOT_TOKEN`** to the value from **@BotFather**, restart **`supabase functions serve`** (or your **`supabase start`** stack). **Hosted:** Dashboard → **Edge Functions → Secrets** (or `supabase secrets set TELEGRAM_BOT_TOKEN=...` for the linked project).
- **`503` + `code: SUPABASE_SERVICE_ENV_MISSING`** — the function’s **`serviceClient()`** could not read **`SUPABASE_URL`** / **`SUPABASE_SERVICE_ROLE_KEY`** (unusual on `supabase start` + `functions serve` when the stack is healthy; check logs).
- **`500` + `code: TELEGRAM_MONITOR_FAILED`** — usually **Telegram API** error (invalid/revoked token, network). Read the **`error`** string in the JSON body.

Call with the **anon** JWT and optional secret, e.g.:

```bash
curl -sS -X POST "http://127.0.0.1:54321/functions/v1/telegram-monitor" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Inspect the **response JSON** (not only the status code).
