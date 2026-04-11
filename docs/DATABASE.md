# Postgres schema (Supabase) — VEYE

Migrations (apply in order):

1. `20260411163000_initial_veye_schema.sql` — core tables + RLS  
2. `20260411200000_users_notification_fields.sql` — `users.latitude/longitude/device_token` for OneSignal geo targeting  
3. `20260411201000_viktim_telegram_ids.sql` — `viktim.telegram_*` for dedupe parity with Firebase monitor

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
- **`veye_comments`**: public `SELECT`; **`INSERT`** only when `user_id = auth.uid()::text` (requires **Supabase Auth**). **No `UPDATE` policy** yet (Firestore allows any user to toggle likes on others’ comments); add an **RPC or Edge** endpoint for likes, or a narrow `UPDATE` policy later.
- **`telegram_monitor_state`, `ai_pipeline_embeddings`, `user_moderations`**: no policies → clients cannot read/write; **service role only**.
- **`users`, `demanti_alert`**: no policies until **Auth** maps Firebase UID to `auth.uid()` (or you add JWT claims). Until then, writes go through **service role** or post-migration policies.

**Service role** bypasses RLS — never ship it in mobile or Vite bundles.

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
3. **Data import**: one-off script reading Firestore export → `INSERT` into these tables (preserve `id`).
4. **Policies**: add `users` / `demanti` / comment **`UPDATE`** when Auth and product rules are fixed.

See also [SUPABASE_EDGE.md](./SUPABASE_EDGE.md).
