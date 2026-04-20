# Supabase Edge Functions (Phase A)

Deployed function folders live under `supabase/functions/<name>/index.ts`.

Auth models used below:

- **Anon caller** — any client with a valid Supabase session (including anonymous mobile sign-ins). Enforced by the platform's `verify_jwt`; the function then scopes writes by `userId` in the body.
- **Dashboard role** — `requireDashboardRole(roles)` (see `supabase/functions/_shared/auth.ts`). Requires the caller's JWT to resolve to a row in `public.user_roles` with one of the listed roles. A bearer token equal to `SUPABASE_SERVICE_ROLE_KEY` is accepted as `admin` (used by CI crons).

| Slug | Method | Auth | Purpose |
|------|--------|------|---------|
| `telegram-monitor` | GET, POST | Dashboard role: `admin`, `moderator` | Telegram `getUpdates`, AI + `news` fallback |
| `process-global-alert` | POST | Anon caller | Same contract as Firebase `processGlobalAlert` |
| `process-demanti` | POST | Anon caller | App "false flag" for a zone: insert `demanti_alert`, bump `zone_danger.manti_count` |
| `process-user-merge` | POST | Anon caller | App **partial merge** on Postgres `users` (`radius_km`, `notification_radius_km`, `device_token` / FCM token) |
| `get-user-moderation` | POST | Anon caller | App read **`user_moderations`** for `{ userId }` — returns `blocked`, `unblockedAtMs` (uses shared **`isUserBlocked`** / 72h cooldown, may auto-clear block) |
| `process-veye-comment` | POST | Anon caller | App **`veye_comments`**: `action: append` \| `toggleLike` (service role) |
| `process-admin-alert` | POST | Dashboard role: `admin`, `moderator` | Dashboard admin submit |
| `unblock-user` | POST | Dashboard role: `admin` | Unblock `user_moderations` |
| `send-notification` | POST | Anon caller | FCM HTTP v1 broadcast by geo (radius-targeted, fan-out per token) |
| `health-check` | GET | Public | Liveness |
| `dashboard-mutate` | POST | Dashboard role: `admin`, `moderator` | Dashboard-only **insert** (viktim, news) / **update** (zone_danger, news) / **delete** (all four list tables) — service role on server |

Invoke URL (hosted):

`https://<PROJECT_REF>.supabase.co/functions/v1/<slug>`

## Secrets (set in Supabase Dashboard → Edge Functions → Secrets, or CLI)

| Secret | Used by |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | `telegram-monitor` |
| `TELEGRAM_CHANNEL_IDS` | Optional comma-separated allowlist |
| `GOOGLE_GEMINI_API_KEY` | AI pipeline |
| `GOOGLE_GEOCODING_API_KEY` | Geocoding |
| `FCM_PROJECT_ID` | `send-notification` (Firebase project id, e.g. `edel-34e48`) |
| `FCM_SERVICE_ACCOUNT_JSON` | `send-notification` — **entire** service-account JSON pasted as a single string (Firebase Console → Project Settings → Service accounts → Generate new private key) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the Edge runtime.

## Schedule (every 15 minutes)

See [SCHEDULE_TELEGRAM.md](./SCHEDULE_TELEGRAM.md) (GitHub Actions workflow in-repo).

## Smoke tests

- **CI:** run workflow **Smoke Edge functions** (`.github/workflows/smoke-edge.yml`) from the Actions tab. Set secrets `SUPABASE_FUNCTIONS_BASE`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (the last is used for `telegram-monitor` / other admin endpoints via the service-role bypass in `requireDashboardRole`).
- **Local:** `chmod +x scripts/smoke-edge.sh` then set env vars and run `./scripts/smoke-edge.sh` (set `SUPABASE_SERVICE_ROLE_KEY` to include `telegram-monitor`).

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

The app- and dashboard-facing functions rely on Supabase's `verify_jwt` (on by default) to require a valid session JWT. Dashboard-only functions add `requireDashboardRole` on top of that for role enforcement. The mobile app signs in anonymously, so anon-caller functions see a valid JWT without a `public.user_roles` row — that's expected.

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
