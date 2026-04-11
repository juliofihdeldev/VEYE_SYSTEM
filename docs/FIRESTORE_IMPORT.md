# Optional: Firestore → Postgres import (Phase A1)

Not automated in-repo yet. When you need historical rows in Supabase:

1. Export from Firebase (GCS export, or the in-repo scripted option below).
2. Map **collection names** and **field names** using [DATABASE.md](./DATABASE.md) (camelCase → snake_case; `VeyeComments.text` → `veye_comments.body`).
3. Preserve **document IDs** as `id` text columns where possible (`INSERT ... ON CONFLICT (id) DO UPDATE`).
4. Convert **Firestore Timestamps** to ISO strings for `timestamptz` columns.

Run imports against **staging** first, then verify counts and a few sample rows in Supabase Studio.

## Option B: Scripted export (all mapped collections)

Package: `scripts/firestore-export` (pnpm workspace member `@veye/firestore-export`). It streams each collection with paginated reads and writes **one NDJSON file per collection** under the output directory. Each line is `{ "id": "<Firestore doc id>", "data": { ... } }`. Timestamps in `data` are ISO strings; GeoPoints and document references are tagged objects (`__type`) for visibility during mapping.

**Do not commit** the service account JSON. Point credentials at a local path only:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your-adminsdk.json"
# optional: override output dir (default: ./firestore-export-out at repo root when this package is under VEYE_SYSTEM)
export OUT_DIR="./firestore-export-out"
# optional: comma-separated collection list (default = list in export.mjs / DATABASE.md)
# export FIRESTORE_COLLECTIONS="ZoneDanger,Users"

pnpm install   # repo root — installs firebase-admin for the export package
pnpm firestore:export
```

From the package directory only:

```bash
cd scripts/firestore-export && pnpm export
```

CLI flags (same as env for paths/collections):

```bash
node export.mjs --out ./my-export --collections "ZoneDanger,Users"
```

Output files: `<OUT_DIR>/<CollectionName>.ndjson` (e.g. `ZoneDanger.ndjson`).

## Import into Supabase (Postgres)

Use the **service role** key so PostgREST bypasses RLS (same as Edge Functions). Do **not** put this key in the dashboard app or mobile clients.

1. Apply migrations on the target project (`supabase db push` or Studio SQL).
2. From **Supabase Dashboard → Project Settings → API**, copy **Project URL** and **service_role** `secret`.
3. From repo root (after `pnpm install`). Either **export** the variables in your shell, or put them in **`scripts/firestore-supabase-import/.env`** or **`.env.firestore-import`** at the repo root (`KEY=value` per line; gitignored). The importer loads those files when the variables are not already set.

```bash
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..."
# default NDJSON dir: ./firestore-export-out at repo root
# export FIRESTORE_EXPORT_DIR="./firestore-export-out"
# optional: only some files (basenames without .ndjson)
# export FIRESTORE_IMPORT_ONLY="Users,UserModerations"

pnpm firestore:import
```

The root script runs `pnpm install --filter @veye/firestore-supabase-import` first so `scripts/firestore-supabase-import/node_modules` always exists (avoids `ERR_MODULE_NOT_FOUND` for `@supabase/supabase-js`). If you only use `pnpm install` at the repo root, that is enough too once it completes successfully.

**Note:** `ERR_PNPM_ADDING_TO_ROOT` appears when you run `pnpm add <pkg>` at the monorepo root without `-w`. Use `pnpm add -w <pkg>` for root devDependencies, or add the dependency inside a workspace package’s `package.json` instead.

The script `@veye/firestore-supabase-import` reads each `*.ndjson`, maps camelCase → snake_case (and special cases like `VeyeComments.text` → `body`), then **upserts** into `public` tables (`onConflict` = primary key: `id`, or `user_id` for `user_moderations`, or `source_doc_id` for `ai_pipeline_embeddings`).

Run against **staging** first; re-run is safe (upserts overwrite same keys). If PostgREST returns errors on a table, fix that NDJSON subset or extend `scripts/firestore-supabase-import/import.mjs` for your legacy field names.

**Local `http://127.0.0.1:54321`:** `PGRST301` (“No suitable key or wrong key type”) is a **JWT verification** error. Copy **`service_role` `secret`** from `supabase status` after `supabase start`. Hosted Dashboard keys are signed for your cloud project `ref`, not for the local stack.
