import { serviceClient } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse, verifySecret } from "../_shared/http.ts";
import { runTelegramMonitor } from "../_shared/telegram_monitor.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const ok = await verifySecret(req);
  if (!ok) return jsonResponse({ error: "Unauthorized" }, 401);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return jsonResponse(
      {
        error: "TELEGRAM_BOT_TOKEN not configured",
        code: "TELEGRAM_BOT_TOKEN_MISSING",
        hint: "Local: supabase secrets set --env-file supabase/.env (see docs/EDGE_FUNCTIONS.md). Hosted: Dashboard → Edge Functions → Secrets.",
      },
      503,
    );
  }

  const raw = Deno.env.get("TELEGRAM_CHANNEL_IDS") ?? "";
  const channelFilter = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  try {
    const supabase = serviceClient();
    const result = await runTelegramMonitor(supabase, botToken, channelFilter);
    return jsonResponse({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("telegram-monitor", msg);
    if (msg.includes("Missing SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonResponse(
        {
          error: msg,
          code: "SUPABASE_SERVICE_ENV_MISSING",
          hint: "Edge needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. With `supabase start`, they are injected for deployed bundles; for `functions serve` use linked project or set secrets.",
        },
        503,
      );
    }
    return jsonResponse({ error: msg, code: "TELEGRAM_MONITOR_FAILED" }, 500);
  }
});
