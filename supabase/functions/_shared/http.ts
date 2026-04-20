/** CORS for browser + `functions.invoke` (apikey, Authorization, X-Client-Info, optional x-region). */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, accept-profile, prefer, cache-control, pragma, x-region",
  "Access-Control-Max-Age": "86400",
};

/** Preflight — use 200 + body like Supabase CORS guide (some stacks treat 204 oddly). */
export function corsPreflightResponse(): Response {
  return new Response("ok", { status: 200, headers: corsHeaders });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}
