import { corsHeaders, jsonResponse } from "../_shared/http.ts";

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return jsonResponse({ status: "ok" });
});
