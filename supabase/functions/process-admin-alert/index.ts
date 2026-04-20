import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { requireDashboardRole } from "../_shared/auth.ts";
import { processPost } from "../_shared/ai_pipeline.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const caller = await requireDashboardRole(req, ["admin", "moderator"]);
  if (!caller) {
    return jsonResponse(
      {
        error: "Unauthorized",
        code: "PROCESS_ADMIN_ALERT_FORBIDDEN",
        hint: "Requires an admin or moderator dashboard session.",
      },
      401,
    );
  }
  console.log("process-admin-alert invoked by", caller.email, caller.role);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    const supabase = serviceClient();
    const result = await processPost(supabase, body, true);
    if (result.processed) {
      return jsonResponse(result, 200);
    }
    return jsonResponse(result, 500);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-admin-alert", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
