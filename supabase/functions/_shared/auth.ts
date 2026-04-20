import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { serviceClient } from "./supabase.ts";

export type DashboardRole = "admin" | "moderator" | "viewer";

export type CallerContext = {
  userId: string;
  email: string | null;
  role: DashboardRole | null;
};

/**
 * Resolve the caller's Supabase user + dashboard role from the incoming
 * Authorization header (JWT set automatically by `sb.functions.invoke`).
 *
 * A request signed with `SUPABASE_SERVICE_ROLE_KEY` is always treated as an
 * admin caller — used by scheduled CI jobs that have no interactive session
 * (e.g. `.github/workflows/telegram-monitor-cron.yml`).
 *
 * Returns `null` when the request is unauthenticated or the JWT is invalid.
 */
export async function getCaller(req: Request): Promise<CallerContext | null> {
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;

  const token = auth.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { userId: "service-role", email: "service-role", role: "admin" };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  // Use an anon client bound to the caller's JWT to resolve identity.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) return null;

  // Look up role with service client (bypass RLS — read is safe, just the role).
  const admin = serviceClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (error) {
    console.error("getCaller: user_roles lookup failed", error.message);
  }

  return {
    userId: userRes.user.id,
    email: userRes.user.email ?? null,
    role: (data?.role as DashboardRole | null) ?? null,
  };
}

/**
 * Returns the caller if they have one of the required roles, otherwise null.
 * Use together with `jsonResponse({error: "Forbidden"}, 403)` in the caller.
 */
export async function requireDashboardRole(
  req: Request,
  allowed: DashboardRole[],
): Promise<CallerContext | null> {
  const caller = await getCaller(req);
  if (!caller) return null;
  if (!caller.role) return null;
  return allowed.includes(caller.role) ? caller : null;
}
