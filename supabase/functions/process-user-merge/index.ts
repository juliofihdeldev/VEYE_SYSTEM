import { serviceClient } from "../_shared/supabase.ts";
import { corsPreflightResponse, jsonResponse, verifySecret } from "../_shared/http.ts";

type UserRow = {
  radius_km: number | null;
  notification_radius_km: number | null;
  device_token: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** App merges on `users` (radius prefs, OneSignal id) — same trust model as `process-demanti` (`verifySecret` when secret set). */
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
  if (!userId) {
    return jsonResponse({ error: "userId required" }, 400);
  }

  const hasRadius = typeof body.radiusKm === "number" && Number.isFinite(body.radiusKm);
  const hasNotif =
    typeof body.notificationRadiusKm === "number" && Number.isFinite(body.notificationRadiusKm);
  const hasDevice = typeof body.deviceToken === "string";

  if (!hasRadius && !hasNotif && !hasDevice) {
    return jsonResponse({ error: "radiusKm, notificationRadiusKm, or deviceToken required" }, 400);
  }

  let deviceVal: string | null = null;
  if (hasDevice) {
    const t = String(body.deviceToken).trim();
    deviceVal = t.length > 0 ? t : null;
  }

  const supabase = serviceClient();

  const { data: existing, error: selErr } = await supabase
    .from("users")
    .select("radius_km, notification_radius_km, device_token, latitude, longitude")
    .eq("id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  const prev = (existing ?? null) as UserRow | null;

  const next = {
    id: userId,
    user_id: userId,
    updated_at: new Date().toISOString(),
    radius_km: hasRadius ? (body.radiusKm as number) : (prev?.radius_km ?? null),
    notification_radius_km: hasNotif
      ? (body.notificationRadiusKm as number)
      : (prev?.notification_radius_km ?? null),
    device_token: hasDevice ? deviceVal : (prev?.device_token ?? null),
    latitude: prev?.latitude ?? null,
    longitude: prev?.longitude ?? null,
  };

  const { error: upErr } = await supabase.from("users").upsert(next, { onConflict: "id" });
  if (upErr) throw upErr;

  return jsonResponse({ ok: true }, 200);
});
