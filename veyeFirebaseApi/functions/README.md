# Firebase Cloud Functions — **deprecated for deploy (Phase A5)**

Business logic for alerts, Telegram, and OneSignal now lives in **Supabase Edge Functions** under `../../supabase/functions/`. See:

- [docs/EDGE_FUNCTIONS.md](../../docs/EDGE_FUNCTIONS.md)
- [docs/SUPABASE_MIGRATION_PLAN.md](../../docs/SUPABASE_MIGRATION_PLAN.md)

## Do not use `pnpm deploy` / `npm run deploy` here for production

The default **`deploy`** script exits with an error so production deploys do not accidentally hit Firebase. Use:

```bash
pnpm run deploy:firebase
```

only if you still need an **emergency** Firebase deploy (legacy). Prefer:

```bash
cd ../.. && pnpm supabase:deploy
```

## Local development

```bash
pnpm serve
```

Runs the Firebase emulator for comparing behavior while migrating.
