#!/usr/bin/env bash
# Collapse nested Git repos into one root repo on branch SuperbaseMigration, then three commits:
#   1) monorepo + apps (everything except Supabase scaffold + telegram schedule doc/code)
#   2) Supabase Edge stub + SUPABASE_EDGE.md
#   3) Telegram 15-minute schedule
#
# BACK UP first: push or `git bundle create` for each nested project if you still need its history.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Removing nested .git (VEyeDashBoard, veyeFirebaseApi, VEYe, VEYeApp, veyeWebApp)…"
for d in VEyeDashBoard veyeFirebaseApi VEYe VEYeApp veyeWebApp; do
  if [[ -d "$d/.git" ]]; then
    rm -rf "$d/.git"
    echo "    removed $d/.git"
  fi
done

if [[ ! -d .git ]]; then
  git init
fi

# Drop accidental submodule / embedded-repo pointer from index (needs a repo)
git rm -rf --cached veyeWebApp 2>/dev/null || true

git checkout -B SuperbaseMigration 2>/dev/null || git branch -M SuperbaseMigration

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@9.15.4 --activate
fi
pnpm install

echo "==> Commit 1: monorepo (pnpm + turbo + full tree minus exclusions)…"
git add .
# Unstage paths for later commits — use `git rm --cached` so it works before the first commit
# (`git restore --staged` fails with: fatal: could not resolve HEAD when HEAD is unborn).
git rm -r --cached supabase 2>/dev/null || true
git rm --cached -f docs/SUPABASE_EDGE.md 2>/dev/null || true
git rm --cached -f veyeFirebaseApi/functions/telegramMonitor.js 2>/dev/null || true
git rm --cached -f veyeFirebaseApi/TELEGRAM_PLAN.md 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "chore(monorepo): pnpm workspace, Turborepo, and project layout"
else
  echo "    nothing to commit (skip)"
fi

echo "==> Commit 2: Supabase Edge scaffold…"
git add supabase docs/SUPABASE_EDGE.md
if ! git diff --cached --quiet; then
  git commit -m "feat(supabase): Edge Function stub and local CLI config"
else
  echo "    nothing to commit (skip)"
fi

echo "==> Commit 3: Telegram schedule 15 minutes…"
git add veyeFirebaseApi/functions/telegramMonitor.js veyeFirebaseApi/TELEGRAM_PLAN.md
if ! git diff --cached --quiet; then
  git commit -m "chore(telegram): run scheduled monitor every 15 minutes"
else
  echo "    nothing to commit (skip)"
fi

echo "==> Done. Status:"
git status -s
