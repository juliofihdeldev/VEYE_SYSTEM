import { serviceClient } from "../_shared/supabase.ts";
import { corsPreflightResponse, jsonResponse } from "../_shared/http.ts";
import { processPost } from "../_shared/ai_pipeline.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  try {
    const supabase = serviceClient();
    const result = await processPost(supabase, body, true);
    if (result.skipped === "user_blocked") {
      return jsonResponse(result, 403);
    }
    return jsonResponse(result, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-global-alert", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
