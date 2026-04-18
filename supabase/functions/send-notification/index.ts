import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { sendFcmNotification } from "../_shared/fcm.ts";

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
    const result = await sendFcmNotification(supabase, information, position);
    if (result.success) {
      return jsonResponse(
        {
          message: "Notification sent",
          sent: result.sent ?? 0,
          failed: result.failed ?? 0,
          skipped: result.skipped,
          invalidTokensRemoved: result.invalidTokens?.length ?? 0,
        },
        200,
      );
    }
    return jsonResponse({ error: result.error || "Notification failed" }, 500);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
