import { serviceClient } from "../_shared/supabase.ts";
import { corsPreflightResponse, jsonResponse, verifySecret } from "../_shared/http.ts";
import { isUserBlocked } from "../_shared/ai_pipeline.ts";

/** Read-only moderation state for the app (may auto-clear `blocked` when 72h cooldown expired — same logic as `process-global-alert`). */
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

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return jsonResponse({ error: "userId is required" }, 400);
  }

  try {
    const supabase = serviceClient();
    const info = await isUserBlocked(supabase, userId);
    return jsonResponse(
      {
        blocked: info.blocked,
        unblockedAtMs: info.unblockedAt,
      },
      200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("get-user-moderation", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
