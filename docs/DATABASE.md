# Postgres schema (Supabase) — VEYE

Migrations (apply in order):

1. `20260411163000_initial_veye_schema.sql` — core tables + RLS  
2. `20260411200000_users_notification_fields.sql` — `users.latitude/longitude/device_token` for OneSignal geo targeting  
3. `20260411201000_viktim_telegram_ids.sql` — `viktim.telegram_*` for dedupe parity with Firebase monitor  
4. `20260412140000_realtime_veye_comments_zone_danger.sql` — adds **`veye_comments`** and **`zone_danger`** to **`supabase_realtime`** publication (Android **Realtime** postgres changes)

This mirrors **Firestore** collections used by **veyeLegacyApi/functions**, **VEYe**, and **VEyeDashBoard** (not **VEYeApp**). Field names are **snake_case** in SQL; map from camelCase in app code or in an ETL script.

## Table ↔ Firestore

| Postgres table | Firestore collection | Notes |
|----------------|----------------------|--------|
| `zone_danger` | `ZoneDanger` | Map list/detail, `rezon`, `manti_count`, Telegram ids |
| `kidnaping_alert` | `KidnapingAlert` | AI pipeline kidnapping writes |
| `viktim` | `Viktim` | Map module; `extra` jsonb for unknown fields |
| `news` | `News` | Telegram fallback + news; `extra` jsonb |
| `telegram_monitor_state` | `TelegramMonitorState` | Single row `id = 'cursor'` |
| `ai_pipeline_embeddings` | `AIPipelineEmbeddings` | `source_doc_id` = related zone/kidnap doc id |
| `user_moderations` | `UserModerations` | `strikes` jsonb array of epoch ms |
| `users` | `Users` | Prefs: `radius_km`, `notification_radius_km` |
| `demanti_alert` | `DemantiAlert` | Composite id was `uid + zoneId` in app |
| `veye_comments` | `VeyeComments` | SQL column `body` ← Firestore field **`text`** |

## Row IDs

- Primary keys are **`text`** so you can **reuse Firestore document IDs** when importing (`INSERT ... ON CONFLICT` or copy job).
- New rows can use the default `gen_random_uuid()::text` or supply an id in the app.

## Indexes

- Time ordering: `zone_danger`, `kidnaping_alert`, `viktim`, `news` indexed on `date` (desc).
- Telegram dedupe: partial indexes on `(telegram_channel_id, telegram_message_id)` where both are set.

## RLS (row level security)

- **`zone_danger`, `kidnaping_alert`, `viktim`, `news`**: `SELECT` allowed for **`anon`** and **`authenticated`** (public read). **No** `INSERT`/`UPDATE`/`DELETE` for those roles — use the **service role** key from Edge Functions / trusted backend.
- **`veye_comments`**: public `SELECT`; **`INSERT`** for **`authenticated`** only when `user_id = auth.uid()::text` (Supabase Auth). The Android app uses Edge **`process-veye-comment`** (service role) for **append / like** until clients use Supabase sessions. **No `UPDATE` policy** for anon direct API — likes go through that Edge path.
- **`telegram_monitor_state`, `ai_pipeline_embeddings`**: no policies → clients cannot read/write; **service role only**.
- **`user_moderations`**: no PostgREST policies for **`anon`/`authenticated`** — the Android app reads via Edge **`get-user-moderation`** (service role); writes remain admin / **`process-global-alert`** / Edge tooling.
- **`users`, `demanti_alert`**: no PostgREST policies for **`anon`/`authenticated`** — clients use **Edge** with the service role. **`process-demanti`** inserts **`demanti_alert`** and bumps **`zone_danger.manti_count`**. **`process-user-merge`** upserts **`users`** (radius prefs, **`device_token`** / OneSignal id from the Android app).

**Service role** bypasses RLS — never ship it in mobile or Vite bundles.

## Realtime (Postgres changes)

After migration **#4**, clients can subscribe to **`veye_comments`** and **`zone_danger`** via Supabase Realtime (used by **`VEYe`**). On **hosted** projects, confirm **Database → Publications** includes these tables if you applied schema outside this repo.

## Apply migrations

Linked project (remote):

```bash
supabase db push
```

Local stack:

```bash
supabase start   # Docker
# migrations apply on start
```

## Next steps

1. **`supabase db push`** (or CI) on your linked project.
2. **Optional**: `pgvector` + `vector` column if you move off jsonb embeddings.
3. **Data import**: NDJSON from `pnpm firestore:export` → `pnpm firestore:import` (see [FIRESTORE_IMPORT.md](./FIRESTORE_IMPORT.md); uses service role upserts, preserves `id`).
4. **Policies**: add `users` / `demanti` / comment **`UPDATE`** when Auth and product rules are fixed.

See also [SUPABASE_EDGE.md](./SUPABASE_EDGE.md).
