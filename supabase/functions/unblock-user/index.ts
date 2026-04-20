import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { requireDashboardRole } from "../_shared/auth.ts";
import { unblockUser as applyUnblockUser } from "../_shared/ai_pipeline.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const caller = await requireDashboardRole(req, ["admin"]);
  if (!caller) {
    return jsonResponse(
      {
        error: "Unauthorized",
        code: "UNBLOCK_USER_FORBIDDEN",
        hint: "Requires an admin dashboard session.",
      },
      401,
    );
  }
  console.log("unblock-user invoked by", caller.email);

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const userId = body?.userId;
  if (!userId) return jsonResponse({ error: "userId is required" }, 400);

  try {
    const supabase = serviceClient();
    await applyUnblockUser(supabase, userId);
    return jsonResponse({ success: true, userId, unblockReason: "manual_admin" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("unblock-user", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
