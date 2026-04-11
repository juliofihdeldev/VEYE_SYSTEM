import { serviceClient } from "../_shared/supabase.ts";
import { corsPreflightResponse, jsonResponse, verifySecret } from "../_shared/http.ts";

/** Mobile demanti (RN `konfimeManti`): insert `demanti_alert`, increment `zone_danger.manti_count`. */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secretOk = await verifySecret(req);
  if (!secretOk) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const zoneId = typeof body.zoneId === "string" ? body.zoneId.trim() : "";
  const information = typeof body.information === "string" ? body.information.trim() : "";
  if (!userId || !zoneId) {
    return jsonResponse({ error: "userId and zoneId required" }, 400);
  }

  const id = userId + zoneId;
  const supabase = serviceClient();

  const { data: zone, error: zoneErr } = await supabase
    .from("zone_danger")
    .select("id, manti_count")
    .eq("id", zoneId)
    .maybeSingle();
  if (zoneErr) throw zoneErr;
  if (!zone) {
    return jsonResponse({ error: "zone_not_found" }, 404);
  }

  const { data: existing, error: exErr } = await supabase
    .from("demanti_alert")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing) {
    return jsonResponse({ ok: true, skipped: "already_denied" }, 200);
  }

  const { error: insErr } = await supabase.from("demanti_alert").insert({
    id,
    user_id: userId,
    information: information || null,
  });
  if (insErr) {
    if (insErr.code === "23505") {
      return jsonResponse({ ok: true, skipped: "already_denied" }, 200);
    }
    throw insErr;
  }

  const next = (zone.manti_count ?? 0) + 1;
  const { error: upErr } = await supabase
    .from("zone_danger")
    .update({ manti_count: next })
    .eq("id", zoneId);
  if (upErr) throw upErr;

  return jsonResponse({ ok: true }, 200);
});
