function replaceUndefined(str: string): string {
  return str
    .replace(/undefined/g, "Port-au-Prince")
    .replace(/underfined/g, "Port-au-Prince");
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function calculateDistance(
  position1: { latitude: number; longitude: number },
  position2: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = toRad(position2.latitude - position1.latitude);
  const dLon = toRad(position2.longitude - position1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(position1.latitude)) *
      Math.cos(toRad(position2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type UserRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  device_token: string | null;
  notification_radius_km: number | null;
  radius_km: number | null;
};

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export async function sendOneSignalNotification(
  supabase: SupabaseClient,
  information: string,
  position: { latitude: number | null; longitude: number | null } | null,
): Promise<{ success: boolean; error?: string; skipped?: string }> {
  const cleaned = replaceUndefined(information ?? "");
  const appId = Deno.env.get("ONESIGNAL_API_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_ID_KEY");

  if (!appId || !apiKey) {
    console.warn("sendOneSignalNotification: missing ONESIGNAL_* env");
    return { success: false, error: "Missing OneSignal config" };
  }

  if (!position?.latitude || !position?.longitude) {
    return { success: true, skipped: "no_position" };
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("id, latitude, longitude, device_token, notification_radius_km, radius_km")
    .not("device_token", "is", null);

  if (error) {
    console.error("sendOneSignalNotification: users query", error);
    return { success: false, error: error.message };
  }

  const eligible: UserRow[] = [];
  for (const u of (users ?? []) as UserRow[]) {
    if (u.latitude == null || u.longitude == null || !u.device_token) continue;
    const radiusKm = u.notification_radius_km ?? u.radius_km ?? 25;
    const distance = calculateDistance(position, {
      latitude: u.latitude,
      longitude: u.longitude,
    });
    if (distance <= radiusKm) eligible.push(u);
  }

  const playerIds = eligible.map((u) => u.device_token!).filter(Boolean);
  if (playerIds.length === 0) {
    return { success: true, skipped: "no_users_in_range" };
  }

  const message = {
    app_id: appId,
    contents: { en: cleaned },
    headings: { en: "VEYe" },
    include_player_ids: playerIds,
    data: { title: "VEYe", contents: cleaned },
  };

  try {
    const resp = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("OneSignal HTTP", resp.status, t);
      return { success: false, error: t };
    }
    console.info("sendOneSignalNotification: ok");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sendOneSignalNotification", msg);
    return { success: false, error: msg };
  }
}
