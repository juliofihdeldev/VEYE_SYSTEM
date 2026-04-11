/**
 * Supabase Edge Function — Telegram monitor (placeholder).
 * Schedule: invoke every **15 minutes** (Supabase cron, GitHub Actions, or hosted scheduler).
 * Do not rely on multi-minute long-poll inside a single Edge request; use short getUpdates or a queue.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-veye-secret",
      },
    });
  }

  const body = {
    ok: true,
    function: "telegram-monitor",
    message:
      "Placeholder — connect TELEGRAM_BOT_TOKEN + DB here. Prefer 15-minute scheduled invocations over long in-request polling.",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
