import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Default anon JWT for `supabase start` (matches `supabase status` demo key). */
const DEFAULT_LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

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

/**
 * Use local API (`supabase start` / `supabase functions serve` on :54321) instead of
 * `VITE_SUPABASE_*` when Vite dev runs on localhost, unless opted out.
 *
 * - `VITE_USE_REMOTE_SUPABASE=true` — always use hosted URL/keys from `.env` (even on localhost).
 * - `VITE_USE_LOCAL_SUPABASE=true` — force local (e.g. LAN IP hitting Vite but calling local Docker).
 * - `VITE_USE_LOCAL_SUPABASE=false` — force hosted while still on localhost.
 */
export function useLocalSupabaseStack(): boolean {
  if (import.meta.env.PROD) return false;
  if (import.meta.env.VITE_USE_REMOTE_SUPABASE === "true") return false;
  if (import.meta.env.VITE_USE_LOCAL_SUPABASE === "true") return true;
  if (import.meta.env.VITE_USE_LOCAL_SUPABASE === "false") return false;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function readRemoteCredentials(): { url: string; anon: string } {
  const url = normalizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL ?? ""));
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  return { url, anon };
}

function readLocalCredentials(): { url: string; anon: string } {
  const raw =
    String(import.meta.env.VITE_LOCAL_SUPABASE_URL ?? "").trim() || "http://127.0.0.1:54321";
  const url = normalizeSupabaseUrl(raw);
  const anon =
    String(import.meta.env.VITE_LOCAL_SUPABASE_ANON_KEY ?? "").trim() ||
    DEFAULT_LOCAL_SUPABASE_ANON_KEY;
  return { url, anon };
}

function readSupabaseCredentials(): { url: string; anon: string; local: boolean } {
  if (useLocalSupabaseStack()) {
    return { ...readLocalCredentials(), local: true };
  }
  return { ...readRemoteCredentials(), local: false };
}

/** True when the active target (local or remote) has URL + anon key. */
export function isSupabaseConfigured(): boolean {
  const { url, anon } = readSupabaseCredentials();
  return url.length > 0 && anon.length > 0;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, anon, local } = readSupabaseCredentials();
  if (!url || !anon) {
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in VEyeDashBoard/.env");
  }
  if (import.meta.env.DEV && local) {
    console.info("[VEyeDashBoard] Supabase → local stack (supabase start / functions serve):", url);
  } else if (import.meta.env.DEV) {
    const raw = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
    const normalized = normalizeSupabaseUrl(raw);
    if (raw && normalized !== raw) {
      console.warn("[VEyeDashBoard] VITE_SUPABASE_URL adjusted for browser:", raw, "→", normalized);
    }
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

