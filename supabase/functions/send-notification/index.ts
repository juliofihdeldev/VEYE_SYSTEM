import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { sendOneSignalNotification } from "../_shared/onesignal.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { information?: string; latitude?: number | null; longitude?: number | null };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const information = body?.information ?? "";
  const lat = body?.latitude ?? null;
  const lng = body?.longitude ?? null;
  const position = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

  try {
    const supabase = serviceClient();
    const result = await sendOneSignalNotification(supabase, information, position);
    if (result.success) {
      return new Response("Notification sent!", { status: 200, headers: corsHeaders });
    }
    return new Response(result.error || "Notification failed", {
      status: 500,
      headers: corsHeaders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(msg, { status: 500, headers: corsHeaders });
  }
});
