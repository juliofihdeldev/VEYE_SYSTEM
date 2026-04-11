/**
 * NDJSON (firestore-export-out) → Supabase Postgres upserts via PostgREST (service role).
 *
 * Env (required):
 *   SUPABASE_URL                 — https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    — Project Settings → API (secret; never ship to clients)
 *
 * Env (optional):
 *   FIRESTORE_EXPORT_DIR         — default: <repo>/firestore-export-out
 *   FIRESTORE_IMPORT_ONLY        — comma-separated NDJSON basenames, e.g. "Users,UserModerations"
 *   FIRESTORE_IMPORT_CHUNK       — rows per upsert (default 120)
 *
 * If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset, loads KEY=value from (first existing):
 *   scripts/firestore-supabase-import/.env  or  <repo>/.env.firestore-import
 */

import { createReadStream, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import readline from "node:readline";

import { createClient } from "@supabase/supabase-js";

/** Load SUPABASE_* from optional local files (not committed). */
function loadLocalEnv() {
  const root = findRepoRoot();
  const candidates = [
    join(root, "scripts/firestore-supabase-import/.env"),
    join(root, ".env.firestore-import"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function findRepoRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 14; i++) {
    const pkgPath = join(dir, "package.json");
    try {
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.name === "veye-system") return dir;
      }
    } catch {
      /* ignore */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function toSnake(key) {
  return key
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

/** Bigint columns in our schema */
function isBigIntCol(name) {
  return name === "telegram_channel_id" || name === "telegram_message_id";
}

function isTimestampCol(col) {
  return (
    col === "date" ||
    col === "created_at" ||
    col === "updated_at" ||
    col.endsWith("_at")
  );
}

/**
 * ISO string for timestamptz, or undefined if invalid / impossible calendar day (e.g. 2023-02-29).
 */
function coerceTimestamptz(val) {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return undefined;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return undefined;
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[Tt ]|$)/);
    if (ymd) {
      const y = Number(ymd[1]);
      const mo = Number(ymd[2]);
      const day = Number(ymd[3]);
      if (mo < 1 || mo > 12 || day < 1 || day > 31) return undefined;
      const utc = new Date(Date.UTC(y, mo - 1, day));
      if (
        utc.getUTCFullYear() !== y ||
        utc.getUTCMonth() !== mo - 1 ||
        utc.getUTCDate() !== day
      ) {
        return undefined;
      }
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function coerceScalar(col, val) {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val === "object" && val !== null && val.__type === "GeoPoint") {
    return null;
  }
  if (typeof val === "object" && val !== null && val.__type === "DocumentReference") {
    return val.path ?? null;
  }
  if (typeof val === "number" && isBigIntCol(col)) {
    return Number.isFinite(val) ? Math.trunc(val) : null;
  }
  if (isTimestampCol(col)) {
    return coerceTimestamptz(val);
  }
  return val;
}

/**
 * Map known Firestore keys to row; unknown keys → `extra` (merge) when `extraColumn` is set.
 */
function mapWithAllowlist(id, data, allowlist, extraColumn) {
  const row = { id };
  const extra = {};
  const existingExtra =
    data.extra && typeof data.extra === "object" && !Array.isArray(data.extra)
      ? { ...data.extra }
      : {};

  for (const [k, raw] of Object.entries(data)) {
    if (k === "extra" || k === "id") continue;
    const snake = toSnake(k);
    if (allowlist.has(snake)) {
      const v = coerceScalar(snake, raw);
      if (v !== undefined && v !== null) row[snake] = v;
    } else {
      extra[k] = raw;
    }
  }
  if (extraColumn && Object.keys(extra).length > 0) {
    row[extraColumn] = { ...existingExtra, ...extra };
  } else if (extraColumn && Object.keys(existingExtra).length > 0) {
    row[extraColumn] = existingExtra;
  }
  return row;
}

const ZONE_ALLOW = new Set([
  "name",
  "address",
  "city",
  "latitude",
  "longitude",
  "rezon",
  "date",
  "incident_type",
  "level",
  "tag",
  "source",
  "source_url",
  "verified",
  "ai_confidence",
  "telegram_channel_id",
  "telegram_message_id",
  "manti_count",
  "user_id",
  "split_index",
  "split_total",
  "created_at",
  "updated_at",
]);

const KIDNAP_ALLOW = new Set([
  "name",
  "address",
  "city",
  "latitude",
  "longitude",
  "rezon",
  "date",
  "source",
  "source_url",
  "verified",
  "ai_confidence",
  "telegram_channel_id",
  "telegram_message_id",
  "created_at",
  "updated_at",
]);

const VIKTIM_ALLOW = new Set([
  "full_name",
  "status",
  "city",
  "details",
  "amount",
  "image_source",
  "type",
  "date",
  "latitude",
  "longitude",
  "telegram_channel_id",
  "telegram_message_id",
  "created_at",
  "updated_at",
]);

const NEWS_ALLOW = new Set([
  "title",
  "summary",
  "source",
  "source_url",
  "channel_name",
  "channel_id",
  "image_source",
  "date",
  "telegram_channel_id",
  "telegram_message_id",
  "created_at",
  "updated_at",
]);

const DEMANTI_ALLOW = new Set(["information", "user_id", "created_at"]);

function transformDemanti(id, data) {
  const row = mapWithAllowlist(id, data, DEMANTI_ALLOW, null);
  const uid = row.user_id ?? data.userId;
  if (uid == null || String(uid).trim() === "") return null;
  row.user_id = String(uid);
  return row;
}

function transformUsers(id, data) {
  const lat =
    data.latitude != null
      ? Number(data.latitude)
      : data.coords?.latitude != null
        ? Number(data.coords.latitude)
        : null;
  const lng =
    data.longitude != null
      ? Number(data.longitude)
      : data.coords?.longitude != null
        ? Number(data.coords.longitude)
        : null;
  const row = {
    id,
    user_id: data.userId != null ? String(data.userId) : id,
    radius_km: data.radiusKm != null ? Number(data.radiusKm) : null,
    notification_radius_km:
      data.notificationRadiusKm != null ? Number(data.notificationRadiusKm) : null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    device_token:
      data.deviceToken != null ? String(data.deviceToken) : null,
  };
  return row;
}

function transformUserModerations(id, data) {
  const userId = data.userId != null ? String(data.userId) : id;
  const strikes = Array.isArray(data.strikes) ? data.strikes : [];
  return {
    user_id: userId,
    strikes,
    strike_count: data.strikeCount != null ? Number(data.strikeCount) : strikes.length,
    blocked: Boolean(data.blocked),
    last_strike_reason:
      data.lastStrikeReason != null ? String(data.lastStrikeReason) : null,
    last_strike_at: coerceTimestamptz(data.lastStrikeAt),
    blocked_at: coerceTimestamptz(data.blockedAt),
    unblocked_at: coerceTimestamptz(data.unblockedAt),
    unblock_reason:
      data.unblockReason != null ? String(data.unblockReason) : null,
  };
}

function transformTelegramState(id, data) {
  return {
    id,
    last_update_id:
      data.lastUpdateId != null ? Math.trunc(Number(data.lastUpdateId)) : 0,
    updated_at: coerceTimestamptz(data.updatedAt),
  };
}

function transformEmbedding(id, data) {
  if (!Array.isArray(data.embedding)) {
    return null;
  }
  return {
    source_doc_id: id,
    embedding: data.embedding,
    updated_at: coerceTimestamptz(data.updatedAt),
  };
}

function transformVeyeComment(id, data) {
  const body = data.text != null ? String(data.text) : data.body != null ? String(data.body) : "";
  if (!body.trim()) return null;
  const threadId =
    data.threadId != null ? String(data.threadId) : data.thread_id != null ? String(data.thread_id) : null;
  const userId =
    data.userId != null ? String(data.userId) : data.user_id != null ? String(data.user_id) : null;
  if (!threadId || !userId) return null;
  const createdMs = coerceTimestamptz(data.createdAt ?? data.created_at);
  const sortTime =
    data.sortTime != null
      ? Math.trunc(Number(data.sortTime))
      : data.sort_time != null
        ? Math.trunc(Number(data.sort_time))
        : createdMs != null
          ? Math.trunc(new Date(createdMs).getTime())
          : Date.now();
  const liked =
    Array.isArray(data.likedUserIds)
      ? data.likedUserIds.map(String)
      : Array.isArray(data.liked_user_ids)
        ? data.liked_user_ids.map(String)
        : [];
  return {
    id,
    thread_id: threadId,
    body,
    user_id: userId,
    created_at:
      coerceTimestamptz(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
    sort_time: sortTime,
    parent_id:
      data.parentId != null ? String(data.parentId) : data.parent_id != null ? String(data.parent_id) : null,
    liked_user_ids: liked,
  };
}

const COLLECTIONS = [
  {
    file: "ZoneDanger",
    table: "zone_danger",
    onConflict: "id",
    transform: (id, data) => mapWithAllowlist(id, data, ZONE_ALLOW, null),
    /** Fill gaps when another row in the same batch includes these NOT NULL columns. */
    chunkDefaults: {
      manti_count: 0,
      verified: false,
      date: () => new Date().toISOString(),
      created_at: () => new Date().toISOString(),
      updated_at: () => new Date().toISOString(),
    },
  },
  {
    file: "KidnapingAlert",
    table: "kidnaping_alert",
    onConflict: "id",
    transform: (id, data) => mapWithAllowlist(id, data, KIDNAP_ALLOW, null),
    chunkDefaults: {
      verified: false,
      date: () => new Date().toISOString(),
      created_at: () => new Date().toISOString(),
      updated_at: () => new Date().toISOString(),
    },
  },
  {
    file: "Viktim",
    table: "viktim",
    onConflict: "id",
    transform: (id, data) => {
      const d = { ...data };
      if (d.city == null && d.zone != null) d.city = d.zone;
      if (d.fullName == null && d.name != null) d.fullName = d.name;
      return mapWithAllowlist(id, d, VIKTIM_ALLOW, "extra");
    },
    chunkDefaults: {
      extra: () => ({}),
      created_at: () => new Date().toISOString(),
      updated_at: () => new Date().toISOString(),
    },
  },
  {
    file: "News",
    table: "news",
    onConflict: "id",
    transform: (id, data) => mapWithAllowlist(id, data, NEWS_ALLOW, "extra"),
    chunkDefaults: {
      extra: () => ({}),
      date: () => new Date().toISOString(),
      created_at: () => new Date().toISOString(),
      updated_at: () => new Date().toISOString(),
    },
  },
  {
    file: "TelegramMonitorState",
    table: "telegram_monitor_state",
    onConflict: "id",
    transform: transformTelegramState,
    chunkDefaults: { updated_at: () => new Date().toISOString() },
  },
  {
    file: "AIPipelineEmbeddings",
    table: "ai_pipeline_embeddings",
    onConflict: "source_doc_id",
    transform: transformEmbedding,
    chunkDefaults: { updated_at: () => new Date().toISOString() },
  },
  {
    file: "UserModerations",
    table: "user_moderations",
    onConflict: "user_id",
    transform: transformUserModerations,
    chunkDefaults: {
      strikes: () => [],
      strike_count: 0,
      blocked: false,
      updated_at: () => new Date().toISOString(),
    },
  },
  {
    file: "Users",
    table: "users",
    onConflict: "id",
    transform: transformUsers,
    chunkDefaults: { updated_at: () => new Date().toISOString() },
  },
  {
    file: "DemantiAlert",
    table: "demanti_alert",
    onConflict: "id",
    transform: transformDemanti,
    chunkDefaults: { created_at: () => new Date().toISOString() },
  },
  {
    file: "VeyeComments",
    table: "veye_comments",
    onConflict: "id",
    transform: transformVeyeComment,
    chunkDefaults: {
      liked_user_ids: () => [],
      created_at: () => new Date().toISOString(),
      sort_time: () => Date.now(),
    },
  },
];

async function* readNdjson(path) {
  if (!existsSync(path)) return;
  const rl = readline.createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      yield JSON.parse(t);
    } catch (e) {
      console.warn("Skip bad JSON line:", e.message);
    }
  }
}

/** Drop undefined and null so PostgREST does not send JSON null (which overrides NOT NULL column defaults). */
function stripNullish(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/**
 * PostgREST multi-row upsert uses one column list for the whole batch. If row A has `manti_count`
 * and row B omits it, B gets NULL for that column. We take the union of keys from all rows **plus**
 * every key in `defaults`, then fill missing values from defaults so NOT NULL columns are never
 * left implicit-null across the batch.
 */
function unifyChunkRows(chunk, defaults) {
  if (!defaults || chunk.length === 0) return chunk;
  const keys = new Set();
  for (const r of chunk) {
    for (const k of Object.keys(r)) keys.add(k);
  }
  for (const k of Object.keys(defaults)) keys.add(k);
  return chunk.map((r) => {
    const out = { ...r };
    for (const k of keys) {
      if (!(k in out)) {
        if (Object.prototype.hasOwnProperty.call(defaults, k)) {
          const d = defaults[k];
          out[k] = typeof d === "function" ? d(out) : d;
        }
      }
    }
    return stripNullish(out);
  });
}

async function upsertChunks(sb, table, onConflict, rows, chunkSize, chunkDefaults) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    let chunk = rows.slice(i, i + chunkSize).map(stripNullish);
    chunk = unifyChunkRows(chunk, chunkDefaults);
    const { error } = await sb.from(table).upsert(chunk, { onConflict });
    if (error) {
      let msg = `${table} upsert: ${error.message} (${error.code ?? ""})`;
      if (error.code === "PGRST301") {
        const u = process.env.SUPABASE_URL?.trim() ?? "";
        if (u.includes("127.0.0.1") || u.includes("localhost")) {
          msg +=
            " For local PostgREST, use the service_role JWT from `supabase status`, not the hosted project key.";
        }
      }
      throw new Error(msg);
    }
  }
}

function resolveExportDir() {
  const env = process.env.FIRESTORE_EXPORT_DIR?.trim();
  if (!env) return join(findRepoRoot(), "firestore-export-out");
  if (isAbsolute(env)) return env;
  return join(findRepoRoot(), env);
}

function parseOnlyFilter() {
  const raw = process.env.FIRESTORE_IMPORT_ONLY?.trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function main() {
  loadLocalEnv();
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role from Supabase Dashboard → API)."
    );
    process.exit(1);
  }

  const dir = resolveExportDir();
  const only = parseOnlyFilter();
  const chunkSize = Math.max(
    10,
    Math.min(500, Number(process.env.FIRESTORE_IMPORT_CHUNK) || 120)
  );

  if (!existsSync(dir)) {
    console.error(`Export directory not found: ${dir}`);
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Import from: ${dir}`);
  console.log(`Chunk size:  ${chunkSize}`);

  for (const spec of COLLECTIONS) {
    if (only && !only.has(spec.file)) continue;
    const path = join(dir, `${spec.file}.ndjson`);
    if (!existsSync(path)) {
      console.log(`  [skip] ${spec.file}.ndjson (missing)`);
      continue;
    }

    const rows = [];
    let skipped = 0;
    for await (const line of readNdjson(path)) {
      const id = line.id;
      const data = line.data && typeof line.data === "object" ? line.data : {};
      if (id == null) {
        skipped++;
        continue;
      }
      const row = spec.transform(id, data);
      if (row == null) {
        skipped++;
        continue;
      }
      rows.push(row);
    }

    if (rows.length === 0) {
      console.log(`  ${spec.file}: 0 rows${skipped ? ` (${skipped} skipped)` : ""}`);
      continue;
    }

    process.stdout.write(`  ${spec.file} → ${spec.table} (${rows.length} rows) … `);
    await upsertChunks(sb, spec.table, spec.onConflict, rows, chunkSize, spec.chunkDefaults);
    console.log(`ok${skipped ? ` (${skipped} skipped)` : ""}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
