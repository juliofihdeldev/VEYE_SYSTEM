# VEYE_SYSTEM

Monorepo for VEYe (Android), VEyeDashBoard, Firebase Functions (transitioning to Supabase), and Supabase Edge Functions.

## Quick start

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
```

- **Dashboard:** `pnpm dev:dashboard`
- **Public web (`veyeWebApp`):** `pnpm dev:webapp`
- **Firebase Functions (local):** `pnpm dev:functions`
- **Supabase Edge Functions:** see `supabase/README.md` and `docs/SUPABASE_EDGE.md`
- **Android:** open `VEYe/` in Android Studio

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/MONOREPO.md](./docs/MONOREPO.md) | Turborepo + pnpm workspace, how tasks run |
| [docs/SUPABASE_EDGE.md](./docs/SUPABASE_EDGE.md) | Edge Functions migration notes |

## Branch

Active Supabase migration work: **`SuperbaseMigration`**. To create it and record three baseline commits (after removing nested `.git` folders), run:

`./scripts/git-monorepo-commits.sh` (see [docs/MONOREPO.md](./docs/MONOREPO.md)).

## Deprecated

**`VEYeApp/`** — do not extend or migrate; not part of the active plan.
