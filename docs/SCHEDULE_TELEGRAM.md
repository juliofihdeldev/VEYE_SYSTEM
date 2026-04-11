# Schedule `telegram-monitor` every 15 minutes (step 4)

## Option A — GitHub Actions (in this repo)

Workflow: [`.github/workflows/telegram-monitor-cron.yml`](../.github/workflows/telegram-monitor-cron.yml)

**Repository secrets** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Example / notes |
|--------|------------------|
| `SUPABASE_FUNCTION_TELEGRAM_URL` | `https://<project-ref>.supabase.co/functions/v1/telegram-monitor` |
| `SUPABASE_ANON_KEY` | Project **anon** key (Dashboard → Project Settings → API) |
| `PROCESS_ALERT_SECRET` | Optional; must match the Edge secret if you set `PROCESS_ALERT_SECRET` on Supabase |

Cron runs **every 15 minutes UTC** (`*/15 * * * *`). Edit the workflow file if you want a different timezone pattern (GitHub Actions cron is UTC-only; use a single hourly offset or an external scheduler for exact Haiti time).

Enable Actions on the repository if disabled.

## Option B — Supabase Dashboard (Database → Extensions)

If your plan includes **`pg_cron`** + **`pg_net`**, you can schedule an HTTP POST from Postgres instead of GitHub. Do **not** commit secrets into SQL; use Supabase **Vault** or dashboard-stored values. See [Supabase: Schedule Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

## Option C — External cron

Any cron (cron-job.org, Cloud Scheduler, etc.) that `POST`s the function URL with:

- `Authorization: Bearer <SUPABASE_ANON_KEY>`
- `Content-Type: application/json`
- `x-veye-secret: …` if your function expects it

Body can be `{}`.
