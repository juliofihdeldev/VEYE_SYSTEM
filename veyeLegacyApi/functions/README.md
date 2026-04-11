# Legacy Node handlers — **deprecated for deploy (Phase A5)**

Alerts, Telegram, and OneSignal in production live in **Supabase Edge Functions** under `../../supabase/functions/`. See:

- [docs/EDGE_FUNCTIONS.md](../../docs/EDGE_FUNCTIONS.md)
- [docs/SUPABASE_MIGRATION_PLAN.md](../../docs/SUPABASE_MIGRATION_PLAN.md)

## Do not use `pnpm deploy` / `npm run deploy` here for production

The default **`deploy`** script exits with an error so production deploys do not hit the legacy stack. Use:

```bash
pnpm run deploy:legacy
```

only for an **emergency** deploy of this package. Prefer:

```bash
cd ../.. && pnpm supabase:deploy
```

## Local development

```bash
pnpm serve
```

Runs the legacy functions emulator for parity checks while migrating.
