import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Local CLI (`supabase start`) serves the API over HTTP on port 54321.
 * Using https://127.0.0.1:54321 causes TLS errors → browser shows "Failed to fetch".
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const local = u.hostname === "127.0.0.1" || u.hostname === "localhost";
    // Only rewrite the default Supabase CLI API port (TLS is not served locally).
    if (local && u.protocol === "https:" && u.port === "54321") {
      return `http://${u.hostname}:54321`;
    }
  } catch {
    /* invalid URL — return trimmed string; createClient may throw */
  }
  return trimmed;
}

function readSupabaseUrl(): string {
  return normalizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
}

/** True when Vite env has both URL and anon key (trimmed non-empty). */
export function isSupabaseConfigured(): boolean {
  const url = readSupabaseUrl();
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  return url.length > 0 && anon.length > 0;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = readSupabaseUrl();
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anon) {
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in VEyeDashBoard/.env");
  }
  const trimmedEnv = String(import.meta.env.VITE_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (import.meta.env.DEV && trimmedEnv && url !== trimmedEnv) {
    console.warn("[VEyeDashBoard] VITE_SUPABASE_URL adjusted for browser:", trimmedEnv, "→", url);
  }
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function functionsBaseUrl(): string {
  const url = readSupabaseUrl();
  if (!url) {
    throw new Error("VITE_SUPABASE_URL is required (copy VEyeDashBoard/.env.example to .env)");
  }
  return `${url}/functions/v1`;
}
