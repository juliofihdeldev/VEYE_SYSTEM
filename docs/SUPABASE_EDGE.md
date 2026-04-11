# Supabase Edge Functions (migration path)

Server logic is moving from **Firebase Cloud Functions** to **Supabase Edge Functions** (Deno, `Deno.serve`). The Android app **VEYe** and **VEyeDashBoard** will eventually call Supabase (Postgres + Auth + Edge) instead of Firebase.

## Principles (current branch)

- **No production cutover** — replace endpoints incrementally; no dual-write phase required.
- **VEYeApp** is out of scope (deprecated); do not modify it.
- **Telegram monitor**: target **Edge Functions** + a **15-minute** cadence (see schedule notes below). Long `getUpdates` polling inside a single HTTP handler is awkward on Edge; prefer **short poll** or **enqueue** work (future: queue + worker if needed).

## Install Supabase CLI

https://supabase.com/docs/guides/cli/getting-started

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

## Related doc

- [MONOREPO.md](./MONOREPO.md) — how to run dashboard, Functions, and Android together.
