# VEYE_SYSTEM monorepo (pnpm + Turborepo)

This repository is a **pnpm workspace** orchestrated by **Turborepo**. It groups the web dashboard, Firebase Functions (transitioning to Supabase Edge Functions), and native Android sources in one tree.

## One-time Git unify + three commits (`SuperbaseMigration`)

If you still have **nested `.git` folders** inside `VEyeDashBoard/`, `veyeFirebaseApi/`, `VEYe/`, `VEYeApp/`, or `veyeWebApp/`, back them up, then from the repo root:

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
| `veyeFirebaseApi/functions/` | Legacy Cloud Functions (Node) | pnpm (workspace package `@veye/firebase-functions`) |
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
- **Firebase CLI** (until functions are fully migrated): optional, for `firebase deploy` from `veyeFirebaseApi/`

## Install (root)

From the repository root:

```bash
pnpm install
```

This installs dependencies for all **workspace** packages (`VEyeDashBoard`, `veyeFirebaseApi/functions`).

## How Turborepo is used

- Root **`package.json`** defines scripts that call `turbo run <task>`.
- **`turbo.json`** declares tasks (`build`, `dev`, `lint`). Each workspace package exposes only the scripts it needs.
- **`turbo run build`** runs `build` in every package that defines a `build` script, respecting dependency order (`^build` = build dependencies first).
- **`turbo run dev`** runs `dev` in parallel where defined; tasks are marked non-cacheable and long-running.

Filtering a single app:

```bash
pnpm --filter veye-dashboard dev
pnpm --filter @veye/firebase-functions serve
```

## Run each part

### Dashboard (VEyeDashBoard)

```bash
# from repo root
pnpm dev:dashboard
# equivalent
pnpm --filter veye-dashboard dev
```

Opens the Vite dev server (see `VEyeDashBoard/package.json`).

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

Production build:

```bash
pnpm --filter veye-dashboard build
```

### Firebase Functions (legacy Node)

```bash
pnpm dev:functions
# equivalent
pnpm --filter @veye/firebase-functions serve
```

Uses the Firebase emulator for functions (`veyeFirebaseApi/functions`). Deploy still uses Firebase CLI from that directory if configured.

### Supabase Edge Functions

See [SUPABASE_EDGE.md](./SUPABASE_EDGE.md). Short version:

```bash
cd /path/to/VEYE_SYSTEM
supabase functions serve
```

### Android (VEYe)

Not part of pnpm. Open `VEYe/` in **Android Studio** and sync Gradle, then Run on a device or emulator.

## Branch: `SuperbaseMigration`

Supabase-related structural work and Edge Function scaffolding land on this branch. Commit after each major step to keep history reviewable.

## VEYeApp

**Deprecated.** No new features or migration work should target `VEYeApp/`. The React Native (or legacy JS) tree may remain in the repo for reference only.
