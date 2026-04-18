import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse, verifySecret } from "../_shared/http.ts";

type Table = "zone_danger" | "viktim" | "news" | "kidnaping_alert";

const TABLES: Set<string> = new Set(["zone_danger", "viktim", "news", "kidnaping_alert"]);

const ZONE_PATCH_KEYS = new Set([
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
  "verified",
  "source",
  "source_url",
]);

const VIKTIM_PATCH_KEYS = new Set([
  "full_name",
  "details",
  "image_source",
  "amount",
  "type",
  "status",
  "city",
  "latitude",
  "longitude",
  "date",
]);

const NEWS_PATCH_KEYS = new Set([
  "title",
  "summary",
  "source",
  "source_url",
  "image_source",
  "date",
  "channel_name",
  "channel_id",
]);

/** Translate dashboard camelCase fields to viktim snake_case columns. */
function viktimPatchFromDashboard(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("fullName" in patch) out.full_name = patch.fullName != null ? String(patch.fullName) : null;
  if ("full_name" in patch) out.full_name = patch.full_name != null ? String(patch.full_name) : null;
  if ("zone" in patch) out.city = patch.zone != null ? String(patch.zone) : null;
  if ("city" in patch) out.city = patch.city != null ? String(patch.city) : null;
  if ("imageSource" in patch) out.image_source = patch.imageSource != null ? String(patch.imageSource) : null;
  if ("image_source" in patch) out.image_source = patch.image_source != null ? String(patch.image_source) : null;
  if ("details" in patch) out.details = patch.details != null ? String(patch.details) : null;
  if ("amount" in patch) out.amount = patch.amount != null ? String(patch.amount) : null;
  if ("type" in patch) out.type = patch.type != null ? String(patch.type) : null;
  if ("status" in patch) out.status = patch.status != null ? String(patch.status) : null;
  if ("latitude" in patch) out.latitude = patch.latitude;
  if ("longitude" in patch) out.longitude = patch.longitude;
  if ("date" in patch) {
    const d = patch.date;
    if (d instanceof Date) out.date = d.toISOString();
    else if (typeof d === "string" && d) out.date = new Date(d).toISOString();
    else if (d && typeof d === "object" && "seconds" in (d as object)) {
      out.date = new Date((d as { seconds: number }).seconds * 1000).toISOString();
    }
  }
  return out;
}

function pickPatch(patch: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    if (allowed.has(k)) out[k] = patch[k];
  }
  return out;
}

function viktimInsertFromDashboard(row: Record<string, unknown>): Record<string, unknown> {
  const zone = row.zone != null ? String(row.zone) : "";
  const d = row.date;
  let dateIso: string | null = null;
  if (d instanceof Date) dateIso = d.toISOString();
  else if (typeof d === "string" && d) dateIso = new Date(d).toISOString();
  else if (d && typeof d === "object" && "seconds" in (d as object)) {
    const s = (d as { seconds: number }).seconds;
    dateIso = new Date(s * 1000).toISOString();
  } else dateIso = new Date().toISOString();

  return {
    full_name: row.fullName != null ? String(row.fullName) : "",
    details: row.details != null ? String(row.details) : "",
    image_source: row.imageSource != null ? String(row.imageSource) : null,
    amount: row.amount != null ? String(row.amount) : null,
    type: row.type != null ? String(row.type) : null,
    status: row.status != null ? String(row.status) : null,
    city: zone || null,
    date: dateIso,
  };
}

function newsInsertFromDashboard(row: Record<string, unknown>): Record<string, unknown> {
  const d = row.date;
  let dateIso: string;
  if (d instanceof Date) dateIso = d.toISOString();
  else if (typeof d === "string" && d) dateIso = new Date(d).toISOString();
  else if (d && typeof d === "object" && "seconds" in (d as object)) {
    dateIso = new Date((d as { seconds: number }).seconds * 1000).toISOString();
  } else dateIso = new Date().toISOString();

  return {
    title: row.title != null ? String(row.title) : null,
    summary: row.summary != null ? String(row.summary) : "",
    source: row.source != null ? String(row.source) : null,
    source_url: row.url != null ? String(row.url) : null,
    image_source: row.imageSource != null ? String(row.imageSource) : null,
    date: dateIso,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const ok = await verifySecret(req);
  if (!ok) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const action = body.action as string | undefined;
  const table = body.table as Table | undefined;
  const id = body.id as string | undefined;

  if (!action || !table || !TABLES.has(table)) {
    return jsonResponse({ error: "Invalid action or table" }, 400);
  }

  const supabase = serviceClient();
  const now = new Date().toISOString();

  try {
    if (action === "delete") {
      if (!id) return jsonResponse({ error: "id required" }, 400);
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "update") {
      if (!id) return jsonResponse({ error: "id required" }, 400);
      const patchRaw = (body.patch ?? body.data) as Record<string, unknown> | undefined;
      if (!patchRaw || typeof patchRaw !== "object") {
        return jsonResponse({ error: "patch required" }, 400);
      }
      if (table !== "zone_danger" && table !== "news" && table !== "viktim") {
        return jsonResponse({ error: "update not supported for this table" }, 400);
      }
      let patch: Record<string, unknown>;
      if (table === "viktim") {
        patch = pickPatch(viktimPatchFromDashboard(patchRaw), VIKTIM_PATCH_KEYS);
      } else if (table === "news") {
        patch = pickPatch(patchRaw, NEWS_PATCH_KEYS);
      } else {
        patch = pickPatch(patchRaw, ZONE_PATCH_KEYS);
      }
      patch.updated_at = now;
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "insert") {
      const row = body.row as Record<string, unknown> | undefined;
      if (!row || typeof row !== "object") {
        return jsonResponse({ error: "row required" }, 400);
      }
      if (table === "viktim") {
        const insertRow = viktimInsertFromDashboard(row);
        const { data, error } = await supabase.from("viktim").insert(insertRow).select("id").single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, id: data?.id }, 200);
      }
      if (table === "news") {
        const insertRow = newsInsertFromDashboard(row);
        const { data, error } = await supabase.from("news").insert(insertRow).select("id").single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, id: data?.id }, 200);
      }
      return jsonResponse({ error: "insert not supported for this table" }, 400);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("dashboard-mutate", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
