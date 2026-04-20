# Schedule `telegram-monitor` every 15 minutes (step 4)

`telegram-monitor` is gated by `requireDashboardRole(["admin", "moderator"])`.
Scheduled callers have no interactive Supabase session, so they authenticate
with the project's **service-role** key, which `requireDashboardRole` recognises
as an admin caller.

## Option A — GitHub Actions (in this repo)

Workflow: [`.github/workflows/telegram-monitor-cron.yml`](../.github/workflows/telegram-monitor-cron.yml)

**Repository secrets** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Example / notes |
|--------|------------------|
| `SUPABASE_FUNCTION_TELEGRAM_URL` | `https://<project-ref>.supabase.co/functions/v1/telegram-monitor` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project **service-role** key (Dashboard → Project Settings → API — keep private) |

Cron runs **every 15 minutes UTC** (`*/15 * * * *`). Edit the workflow file if you want a different timezone pattern (GitHub Actions cron is UTC-only; use a single hourly offset or an external scheduler for exact Haiti time).

Enable Actions on the repository if disabled.

## Option B — Supabase Dashboard (Database → Extensions)

If your plan includes **`pg_cron`** + **`pg_net`**, you can schedule an HTTP POST from Postgres instead of GitHub. Do **not** commit secrets into SQL; use Supabase **Vault** or dashboard-stored values. See [Supabase: Schedule Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

## Option C — External cron

Any cron (cron-job.org, Cloud Scheduler, etc.) that `POST`s the function URL with:

- `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
- `apikey: <SUPABASE_SERVICE_ROLE_KEY>`
- `Content-Type: application/json`

Body can be `{}`.
