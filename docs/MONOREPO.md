# VEYE_SYSTEM monorepo (pnpm + Turborepo)

This repository is a **pnpm workspace** orchestrated by **Turborepo**. It groups the web dashboard, legacy Node handlers (emulator-only; production is Supabase Edge), and native Android sources in one tree.

## One-time Git unify + three commits (`SuperbaseMigration`)

If you still have **nested `.git` folders** inside `VEyeDashBoard/`, `veyeLegacyApi/`, `VEYe/`, `VEYeApp/`, or `veyeWebApp/`, back them up, then from the repo root:

```bash
chmod +x scripts/git-monorepo-commits.sh
./scripts/git-monorepo-commits.sh
```

That script removes nested repos, runs `pnpm install`, checks out branch **`SuperbaseMigration`**, and creates the three migration commits. To do it manually, see the script source.

### Troubleshooting: `embedded git repository` / `fatal: could not resolve HEAD`

- **Embedded repo:** Git only stores a pointer for folders that contain their own `.git`. Remove the nested repo, then re-add:

  ```bash
  git rm -rf --cached veyeWebApp
  rm -rf veyeWebApp/.git
  git add veyeWebApp
  ```

- **`fatal: could not resolve HEAD`:** On a brand-new repo with **no commits yet**, `git restore --staged` cannot run. The `scripts/git-monorepo-commits.sh` script uses `git rm --cached` instead so the first commit succeeds.

## Layout

| Path | Role | Package manager |
|------|------|-----------------|
| `VEyeDashBoard/` | Admin dashboard (Vite + React) | pnpm (workspace package `veye-dashboard`) |
| `veyeWebApp/` | Public static site (Firebase Hosting, `index.html/`) | pnpm (workspace package `veye-web-app`) |
| `veyeLegacyApi/functions/` | Legacy Node handlers (emulator) | pnpm (workspace package `@veye/legacy-functions`) |
| `supabase/` | Supabase CLI config + **Edge Functions** (Deno) | Supabase CLI (not a pnpm package) |
| `VEYe/` | Android app (Kotlin / Gradle) | **Android Studio / Gradle** — not wired into pnpm |
| `VEYeApp/` | **Deprecated** — do not extend | excluded from active migration work |

## Prerequisites

- **Node.js** 20+ (aligns with Cloud Functions `engines`)
- **pnpm** 9.x — enable with Corepack:

  ```bash
  corepack enable
  corepack prepare pnpm@9.15.4 --activate
  ```

- **Supabase CLI** (for Edge Functions): [Install](https://supabase.com/docs/guides/cli)
- **Legacy CLI** (optional): the `firebase` tool is only needed if you still run `pnpm run deploy:legacy` or the functions emulator from `veyeLegacyApi/functions/`

## Install (root)

From the repository root:

```bash
pnpm install
```

This installs dependencies for all **workspace** packages (`VEyeDashBoard`, `veyeLegacyApi/functions`).

## How Turborepo is used

- Root **`package.json`** defines scripts that call `turbo run <task>`.
- **`turbo.json`** declares tasks (`build`, `dev`, `lint`). Each workspace package exposes only the scripts it needs.
- **`turbo run build`** runs `build` in every package that defines a `build` script, respecting dependency order (`^build` = build dependencies first).
- **`turbo run dev`** runs `dev` in parallel where defined; tasks are marked non-cacheable and long-running.

Filtering a single app:

```bash
pnpm --filter veye-dashboard dev
pnpm --filter @veye/legacy-functions serve
```

## Run each part

### Dashboard (VEyeDashBoard)

```bash
# from repo root
pnpm dev:dashboard
# equivalent
pnpm --filter veye-dashboard dev
```

Opens the Vite dev server (see `VEyeDashBoard/package.json`). **Supabase (Phase B):** copy `VEyeDashBoard/.env.example` to **`VEyeDashBoard/.env`** (same folder as `vite.config.ts` — not only the repo root). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Deploy Edge `dashboard-mutate` for admin inserts/deletes/zone updates. Admin/moderator Edge Functions authenticate via the caller's Supabase session + a row in `public.user_roles` (no shared secret baked into the bundle). **Auth:** dashboard sign-in is **Supabase Auth** (email + password); create users in the Supabase dashboard (or invite) and add `/auth/reset` to allowed redirect URLs for password reset emails.

### Public web app (`veyeWebApp`)

Static site served from `index.html/` (Firebase Hosting `public`).

```bash
pnpm dev:webapp
# equivalent
pnpm --filter veye-web-app dev
```

Deploy (Firebase CLI, from app folder context is handled by script cwd):

```bash
pnpm --filter veye-web-app deploy
```

### Supabase Edge (smoke + cron)

- **Smoke (local):** `chmod +x scripts/smoke-edge.sh` then set `SUPABASE_FUNCTIONS_BASE`, `SUPABASE_ANON_KEY` (optional `SUPABASE_SERVICE_ROLE_KEY` to also hit admin endpoints like `telegram-monitor`) and run `./scripts/smoke-edge.sh`.
- **Smoke / cron (GitHub):** see [SCHEDULE_TELEGRAM.md](./SCHEDULE_TELEGRAM.md) and `.github/workflows/*.yml`.

Production build:

```bash
pnpm --filter veye-dashboard build
```

### Legacy Node handlers (emulator)

```bash
pnpm dev:functions
# equivalent
pnpm --filter @veye/legacy-functions serve
```

Uses the functions emulator from `veyeLegacyApi/functions/`. Emergency deploy uses the `firebase` CLI from that directory (`pnpm run deploy:legacy`).

### Supabase Edge Functions

See [SUPABASE_EDGE.md](./SUPABASE_EDGE.md). Short version:

```bash
cd /path/to/VEYE_SYSTEM
supabase functions serve
```

### Android (VEYe)

Not part of pnpm. Open `VEYe/` in **Android Studio** and sync Gradle, then Run on a device or emulator.

**Supabase (Phase C):** optional keys in **`VEYe/local.properties` only** (Gradle does **not** read `SUPABASE_*` from the environment — avoids hosted URLs on device/CI). Defaults target **local** `supabase start` (`http://127.0.0.1:54321` + demo anon).

- **Android Emulator** hitting Docker on the host: set `SUPABASE_URL=http://10.0.2.2:54321` (AVD loopback).
- **Physical device** on the same LAN: use your machine’s LAN IP, e.g. `http://192.168.x.x:54321`.

```properties
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=
```

App-facing Edge Functions (`process-global-alert`, `process-demanti`, `process-user-merge`, `get-user-moderation`, `process-veye-comment`) authenticate via the caller's Supabase session alone — no shared secret baked into the APK.

Leave `SUPABASE_ANON_KEY` empty to use the bundled **local demo** anon, or paste `ANON_KEY` from `supabase status -o env` if your CLI uses a different key format.

- **Realtime + Auth:** run **`supabase db push`** so migration **`20260412140000_realtime_veye_comments_zone_danger.sql`** adds tables to **`supabase_realtime`**. Local **`supabase/config.toml`** sets **`enable_anonymous_sign_ins = true`** for **Supabase Auth** anonymous sessions on the app (JWT for Realtime). On **hosted** Supabase, turn on **Anonymous sign-ins** under **Authentication → Providers** if the Android log warns about anonymous sign-in.

## Branch: `SuperbaseMigration`

Supabase-related structural work and Edge Function scaffolding land on this branch. Commit after each major step to keep history reviewable.

## VEYeApp

**Deprecated.** No new features or migration work should target `VEYeApp/`. The React Native (or legacy JS) tree may remain in the repo for reference only.
