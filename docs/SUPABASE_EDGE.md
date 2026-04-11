# Supabase Edge Functions (migration path)

Server logic is moving from **Firebase Cloud Functions** to **Supabase Edge Functions** (Deno, `Deno.serve`). The Android app **VEYe** and **VEyeDashBoard** will eventually call Supabase (Postgres + Auth + Edge) instead of Firebase.

## Principles (current branch)

- **No production cutover** — replace endpoints incrementally; no dual-write phase required.
- **VEYeApp** is out of scope (deprecated); do not modify it.
- **Telegram monitor**: target **Edge Functions** + a **15-minute** cadence (see schedule notes below). Long `getUpdates` polling inside a single HTTP handler is awkward on Edge; prefer **short poll** or **enqueue** work (future: queue + worker if needed).

## Install Supabase CLI

https://supabase.com/docs/guides/cli/getting-started

## CLI login (required before `supabase link`)

If you see:

`Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.`

do this **once** on your machine:

```bash
supabase login
```

That opens the browser, creates a personal access token, and stores it for the CLI.

Then from the **repo root** (where `supabase/config.toml` lives):

```bash
cd /path/to/VEYE_SYSTEM
supabase link --project-ref <YOUR_PROJECT_REF>
```

`project-ref` is the **Project ID** in the Supabase dashboard (URL looks like `https://supabase.com/dashboard/project/<project-ref>`).

**CI / headless:** create a token in [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens), then `export SUPABASE_ACCESS_TOKEN=...` before `supabase link` / `supabase functions deploy`.

## Local development

From repo root (after `supabase link` to your project, when you have one):

```bash
# Serve all Edge Functions locally (requires Docker for full stack, or use deploy-only flow)
supabase functions serve

# Serve one function
supabase functions serve telegram-monitor
```

Invoke locally (default port may vary):

```bash
curl -i http://127.0.0.1:54321/functions/v1/telegram-monitor
```

## Deploy

```bash
supabase functions deploy telegram-monitor
```

Use project-linked CLI and CI secrets for production.

## Telegram cadence (15 minutes)

- **Firebase scheduled job** (`telegramMonitor`): interval updated to **every 15 minutes** (America/Port-au-Prince) as an interim step.
- **Edge migration**: use **Supabase Scheduled Functions** or an external cron (e.g. GitHub Actions, Cloud Scheduler hitting the Edge URL) every **15 minutes** instead of tight long-poll loops.

## Secrets

Store API keys in Supabase **Function secrets** or **Vault**, not in client apps. Mirror the existing `PROCESS_ALERT_SECRET` / bot token patterns from Firebase config.

## Database schema

Initial tables and RLS: [DATABASE.md](./DATABASE.md). Apply with `supabase db push` (linked project) or `supabase start` (local).

## Edge Functions (deployed behavior)

Slugs, secrets, and curl examples: [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

## Related doc

- [MONOREPO.md](./MONOREPO.md) — how to run dashboard, Functions, and Android together.
