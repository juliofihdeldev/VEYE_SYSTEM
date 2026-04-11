# Supabase migration plan — VEYE_SYSTEM

Living plan for moving backend and data from **Firebase** (Firestore + Cloud Functions) to **Supabase** (Postgres + Auth + Edge Functions). **No production cutover** is assumed: you can switch clients when ready.

## Out of scope

| Item | Reason |
|------|--------|
| **`VEYeApp/`** | Deprecated — do not migrate or change. |
| Dual-write / long parallel run | Optional; skip if you prefer a single switch per surface. |

## Done (baseline)

- [x] Monorepo: **pnpm** + **Turborepo**, workspace packages (`VEyeDashBoard`, `veyeFirebaseApi/functions`, `veyeWebApp`).
- [x] **Supabase CLI** layout: `supabase/config.toml`, docs ([SUPABASE_EDGE.md](./SUPABASE_EDGE.md)).
- [x] **Postgres schema + RLS** applied (`supabase/migrations/…`) — see [DATABASE.md](./DATABASE.md) (includes follow-up migrations for `users` notify fields + `viktim` Telegram ids).
- [x] Firebase **Telegram schedule** interim: **every 15 minutes** (until Edge + cron own it).
- [x] **Phase A (implementation in repo):** Edge Functions `telegram-monitor`, `process-global-alert`, `process-admin-alert`, `unblock-user`, `send-notification`, `health-check` + shared **AI pipeline** on Postgres — see [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md). Deploy + secrets + cron still **your** checklist below.

## Guiding rules

1. **Edge Functions** for HTTP and scheduled triggers first; add a small **Node worker** only if Deno limits block Telegram/AI.
2. **Secrets** only in Supabase / CI — never **service role** in apps or Vite env shipped to browsers.
3. **RLS** stays strict on writes; widen reads only where the product needs it.
4. **Preserve Firestore document IDs** in `text` PKs when importing so URLs and deep links stay stable.

---

## Phase A — Data and parity (backend)

**Goal:** Supabase holds real or test data; Edge can read/write Postgres with the service role.

| # | Task | Output |
|---|------|--------|
| A1 | **Optional import** — see [FIRESTORE_IMPORT.md](./FIRESTORE_IMPORT.md). | Populated tables in dev/staging. |
| A2 | **Edge: `telegram-monitor` v1** — implemented: Postgres cursor, `getUpdates` timeout **25s**, dedupe across `news` / `zone_danger` / `viktim` / `kidnaping_alert`, `processPost` + `news` fallback. **You:** deploy + attach **15 min** cron (Supabase **Scheduled Functions**, GitHub Actions, or cron hitting the function URL). | Live monitor off Firebase. |
| A3 | **Edge: `process-global-alert`** — implemented (Gemini + geocode + embedding dedupe + writes). **You:** set secrets, deploy, point clients when ready. | Same JSON body as Firebase `processGlobalAlert`. |
| A4 | **Edge: admin paths** — implemented: `process-admin-alert`, `unblock-user`, `send-notification`, `health-check`. | Parity with `veyeFirebaseApi/functions/index.js` (plus `health-check`). |
| A5 | **Deprecate Firebase Functions** — after Edge is verified in prod: stop deploying `veyeFirebaseApi/functions`; optionally keep Firestore/Auth until Phase B/C. | Lower Firebase cost. |

**Dependencies:** Set Edge **secrets** in Supabase (see [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)). Run `supabase db push` for new migrations (`users` columns, `viktim` Telegram columns) if not applied yet.

---

## Phase B — VEyeDashBoard

**Goal:** Admin UI reads/writes Supabase instead of Firestore for the collections it uses.

| # | Task | Output |
|---|------|--------|
| B1 | Add `@supabase/supabase-js`, env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon only). | Build-time config. |
| B2 | Replace **Firestore** calls in `src/api/index.ts` (and related) with **PostgREST** queries / RPCs matching [DATABASE.md](./DATABASE.md). | Lists + CRUD for ZoneDanger, Viktim, News, Kidnapping as today. |
| B3 | Point **alert processing** URLs to **Edge** (`process-global-alert` / admin) instead of Cloud Functions. | `.env` + axios base URLs. |
| B4 | **Auth** — migrate from Firebase Auth UI to **Supabase Auth** (email magic link / password — match your choice) or keep Firebase Auth temporarily and use **only** Edge with service role for DB (not ideal long-term). | Clear login path. |

**Order:** B1 → B2 reads first → B3 → B4 (or B4 earlier if you want Supabase Auth before Firestore reads).

---

## Phase C — VEYe (Android)

**Goal:** Kotlin app uses Supabase for the same flows as Firestore today.

| # | Task | Output |
|---|------|--------|
| C1 | Add Supabase Kotlin client (or Ktor + REST) + secure storage for session. | DI module alongside / replacing `FirebaseModule` for data. |
| C2 | Migrate **repositories** in order: read-only streams (`ZoneDanger`, `Viktim`, …) → writes (`GlobalAlert`, comments, demanti, user doc). | Parity with current UX. |
| C3 | **Push** — keep **OneSignal**; only change how device/user ids link if backend changes. | No regression on notifications. |
| C4 | Remove Firestore dependencies when unused. | Smaller app, no Firestore rules drift. |

---

## Phase D — Cleanup and cost

| # | Task | Output |
|---|------|--------|
| D1 | Archive Firebase project or downgrade to free tier if unused. | Lower Firebase cost. |
| D2 | Add **pgvector** (optional) if embeddings move off jsonb. | Faster dedupe at scale. |
| D3 | Tighten **RLS** (`users`, `demanti_alert`, comment **likes** via RPC) per [DATABASE.md](./DATABASE.md) notes. | Safer public API. |

---

## Suggested order (next 2–4 weeks)

1. **`supabase db push`** — apply latest migrations; **`supabase functions deploy`** — deploy all Edge functions; set **secrets**.  
2. **Cron** — schedule `telegram-monitor` every **15 minutes** (with `x-veye-secret` header if used).  
3. **Smoke test** — `health-check`, then `process-global-alert` / `telegram-monitor` against staging data.  
4. **B2 reads + B3** — dashboard loads from Postgres, submits to Edge URLs.  
5. **C2 reads** — Android map/lists from Supabase.  
6. **A5** — turn off Firebase Functions deploys when happy.  
7. **B4 / C1 Auth** — when you are ready to leave Firebase Auth.  
8. **D*** — cost and RLS hardening.

---

## Reference docs

| Doc | Use |
|-----|-----|
| [DATABASE.md](./DATABASE.md) | Tables, RLS, Firestore ↔ SQL |
| [SUPABASE_EDGE.md](./SUPABASE_EDGE.md) | CLI login, link, deploy, secrets |
| [MONOREPO.md](./MONOREPO.md) | pnpm / Turbo / how to run apps |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Edge slugs, secrets, deploy |

Update this file as phases complete (check boxes or add dates).
